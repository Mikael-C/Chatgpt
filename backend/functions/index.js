const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const parse = require('csv-parser');
const pdfParse = require('pdf-parse');
const vision = require('@google-cloud/vision');
const { Configuration, OpenAIApi } = require("openai");
const { Translate } = require('@google-cloud/translate').v2;
const { RunwayML } = require('@runwayml/sdk');
const { LumaAI } = require('lumaai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Anthropic } = require('@anthropic-ai/sdk');
const { Mistral } = require('@mistralai/mistralai');

// Load environment variables
require('dotenv').config();
// Constants
const version = '1.5.3';
const BUCKET_NAME = process.env.BUCKET_NAME;

// Initialize OpenAI
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);
const runwayClient = new RunwayML.RunwayML({ apiKey: process.env.RUNWAY_ML_KEY });
const lumaClient = new LumaAI.LumaAI({ authToken: process.env.LUMAAI_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const xai = new OpenAIApi({
    apiKey: process.env.XAI_KEY,
    baseURL: "https://api.x.ai/v1",
});
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});

const mistral = new Mistral({
    apiKey: process.env.MISTRAL_KEY,
});
// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_KEY);


// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore collections
const collections = {
    chats: admin.firestore().collection('chats'),
    rates: admin.firestore().collection('rates'),
    cva: admin.firestore().collection('cva'),
    arts: admin.firestore().collection('arts'),
    stt: admin.firestore().collection('stt'),
    ocr: admin.firestore().collection('ocr'),
    landmarks: admin.firestore().collection('landmarks'),
    feeds: admin.firestore().collection('feeds'),
    trivia: admin.firestore().collection('trivia'),
    videos: admin.firestore().collection('videos'),
    chat_logs: admin.firestore().collection('chat_logs')
    // ... other collections
};

// Initialize Cloud clients
const bucket = admin.storage().bucket(BUCKET_NAME);
const speechClient = new SpeechClient();
const visionClient = new vision.ImageAnnotatorClient();
const translate = new Translate();

// System messages
const SYSTEM_MESSAGES = {
    trivia: 'You are a trivia generating machine...' // Your existing trivia message
};

/**
 * Function to add a user to a specific SendGrid contact list
 * @param {string} email - The user's email address
 * @param {string} listId - The SendGrid list ID
 */
async function addContactToSendGrid(email, listId) {
    const msg = {
        method: 'PUT',
        url: '/v3/marketing/contacts',
        body: {
            list_ids: [listId], // Specify the list ID here
            contacts: [
                {
                    email: email
                }
            ]
        }
    };

    try {
        await sgMail.request(msg);
        console.log(`Successfully added ${email} to SendGrid list ${listId}.`);
    } catch (error) {
        console.error(`Error adding ${email} to SendGrid list ${listId}:`, error.response.body);
    }
}

// Cloud Function to trigger on user creation
exports.syncUserToSendGrid = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    const listId = process.env.SENDGRID_LIST_ID; // Ensure this is set in your environment variables
    if (email) {
        await addContactToSendGrid(email, listId);
    }
});

exports.processNewSTT = functions.firestore
    .document('stt/{sttId}')
    .onCreate(async (snapshot, context) => {
        try {
            const stt = snapshot.data();

            // Validate input
            if (!stt.mediaUrl || !stt.type) {
                throw new Error('Missing required fields: mediaUrl or type');
            }

            const transcription = await transcribe(stt.mediaUrl, stt.type);

            await collections.stt.doc(context.params.sttId).update({
                result: transcription,
                status: 'completed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            await collections.stt.doc(context.params.sttId).update({
                status: 'error',
                error: handleError(error, 'processNewSTT')
            });
        }
    });

exports.processTranslation = functions.firestore
    .document('stt/{sttId}')
    .onUpdate(async (change, context) => {
        const messageBefore = change.before.data();
        const messageAfter = change.after.data();

        if (messageAfter.gpt) {
            //send to GPT
            const messages = [];
            messages.push({
                role: 'user',
                content: `${messageAfter.result}`
            });
            try {
                const response = await sendToGPT(messages);
                //console.log(response);
                // Create a new document referencing the original message
                await collections.stt.doc(context.params.sttId).update({ gpt: { response: response.data.choices[0], message: messages } });
            } catch (e) {
                await collections.stt.doc(context.params.sttId).update({ gpt: { error: e.message } });
            }
        }
        if (messageAfter.lang != messageBefore.lang) {
            console.log("translating...")
            //send to translation
            const translation = await translateText(messageAfter.result, messageAfter.lang);
            await collections.stt.doc(context.params.sttId).update({ translation: translation });
        }
    });

exports.processNewCVA = functions.firestore
    .document('cva/{cvaId}')
    .onCreate(async (snapshot, context) => {
        const cva = snapshot.data();
        const labelAnnotations = await extractLabelsFromImage(cva.mediaUrl)
        await collections.cva.doc(context.params.cvaId).update({ result: labelAnnotations, status: 'completed' });
    });



exports.processNewOCR = functions.firestore
    .document('ocr/{ocrId}')
    .onCreate(async (snapshot, context) => {
        const ocr = snapshot.data();
        const textAnnotations = await extractTextFromImage(ocr.mediaUrl)
        await collections.ocr.doc(context.params.ocrId).update({ result: textAnnotations, status: 'completed' });
    });

exports.processNewArt = functions.firestore
    .document('arts/{artId}')
    .onCreate(async (snapshot, context) => {
        const art = snapshot.data();
        let result, publicUrl, r, initial_url;
        try {
            switch (art.type) {
                case 'Text-To-Image':
                    switch (providerName) {
                        case 'black forest labs':
                            result = await fetch('https://api.bfl.ml/v1/flux-pro-1.1', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-Key': process.env.BFL_KEY
                                },
                                body: JSON.stringify({
                                    prompt: art.message
                                })
                            });

                            const bflResponse = await result.json();

                            // Store the generation ID and mark as pending
                            await collections.arts.doc(context.params.artId).update({
                                result: bflResponse,
                                status: 'pending_bfl',  // Special status for BFL pending generations
                                lastChecked: admin.firestore.FieldValue.serverTimestamp()
                            });
                            break;
                        case 'luma labs':
                            let generation = await lumaClient.generations.image.create({
                                prompt: art.message,
                                model: art.model.id,
                            });

                            let completed = false;

                            while (!completed) {
                                generation = await lumaClient.generations.get(generation.id);

                                if (generation.state === "completed") {
                                    completed = true;
                                } else if (generation.state === "failed") {
                                    throw new Error(`Generation failed: ${generation.failure_reason}`);
                                } else {
                                    console.log("Dreaming...");
                                    await new Promise(r => setTimeout(r, 3000));
                                }
                            }

                            // Get the image URL from Luma
                            const imageUrl = generation.assets.image;

                            // Download and store image in Firebase, similar to OpenAI flow
                            publicUrl = await downloadAndStoreImage(imageUrl, `image/${new Date().toISOString()}.png`);

                            // Create result object similar to OpenAI format for consistency
                            const lumaResult = {
                                data: [{
                                    url: publicUrl,
                                    generation_id: generation.id
                                }]
                            };

                            // Store both the original URL and the Firebase public URL
                            await collections.arts.doc(context.params.artId).update({
                                result: {
                                    ...lumaResult,
                                    url: imageUrl // original URL
                                },
                                publicUrl: publicUrl,
                                status: 'completed'
                            });
                            break;
                        case 'gemini':
                            const PROJECT_ID = process.env.PROJECT_ID; // Replace with your Google Cloud project ID
                            const TEXT_PROMPT = art.message;
                            const IMAGE_COUNT = 1; // Number of images to generate
                            const MODEL_ID = art.model.id ? art.model.id : 'imagen-3.0-generate-001';
                            const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL_ID}:predict`;

                            const requestBody = {
                                instances: [
                                    {
                                        prompt: TEXT_PROMPT
                                    }
                                ],
                                parameters: {
                                    sampleCount: IMAGE_COUNT
                                }
                            };
                            try {
                                const client = await auth.getClient();
                                const token = await client.getAccessToken();

                                if (!token.token) throw new Error('Failed to retrieve access token');

                                const response = await fetch(url, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token.token}`,
                                        'Content-Type': 'application/json; charset=utf-8'
                                    },
                                    body: JSON.stringify(requestBody)
                                });

                                if (!response.ok) {
                                    const errorBody = await response.text();
                                    throw new Error(`Error: ${response.statusText} - ${errorBody}`);
                                }

                                const data = await response.json();
                                const imageData = data.predictions[0].bytesBase64Encoded;

                                // Save the buffer directly to Firebase Storage
                                const imagePath = `image/gemini-${new Date().toISOString()}.png`;
                                await bucket.file(imagePath).save(Buffer.from(imageData, 'base64'));

                                // Make the file public and get URL
                                const file = bucket.file(imagePath);
                                await file.makePublic();
                                publicUrl = file.publicUrl();

                                // Update the art document
                                await collections.arts.doc(context.params.artId).update({
                                    result: {
                                        data: [{
                                            url: publicUrl
                                        }],
                                        prompt: art.message
                                    },
                                    publicUrl: publicUrl,
                                    status: 'completed'
                                });
                            } catch (e) {
                                await collections.arts.doc(context.params.artId).update({ error: { message: JSON.stringify(e.message) }, status: 'error' });
                            }
                            break;
                        case 'stability':
                            result = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${process.env.STABILITY_KEY}`,
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    text_prompts: [
                                        {
                                            text: art.message,
                                            weight: 1
                                        }
                                    ],
                                    cfg_scale: 7,
                                    height: 1024,
                                    width: 1024,
                                    samples: 1,
                                    steps: 50
                                })
                            });

                            const stabilityResponse = await result.json();

                            if (stabilityResponse.artifacts && stabilityResponse.artifacts.length > 0) {
                                // The image is base64 encoded in the response
                                const base64Image = stabilityResponse.artifacts[0].base64;
                                const imageBuffer = Buffer.from(base64Image, 'base64');

                                // Save the buffer directly to Firebase Storage
                                const imagePath = `image/stability-${new Date().toISOString()}.png`;
                                await bucket.file(imagePath).save(imageBuffer);

                                // Make the file public and get URL
                                const file = bucket.file(imagePath);
                                await file.makePublic();
                                publicUrl = file.publicUrl();

                                // Update the art document
                                await collections.arts.doc(context.params.artId).update({
                                    result: {
                                        ...stabilityResponse,
                                        url: publicUrl // Store generated URL
                                    },
                                    publicUrl: publicUrl,
                                    status: 'completed'
                                });
                            } else {
                                throw new Error('No image generated by Stability AI');
                            }
                            break;
                        case 'xAi':
                            // Currently xAI/Grok doesn't support image generation
                            throw new Error('Image generation not supported by xAI/Grok');
                            break;
                        default:
                            result = await openai.createImage({ model: art.model ? art.model : art.model.id, prompt: art.message, n: 1, size: '1024x1024' });
                            //console.log(result);
                            publicUrl = await downloadAndStoreImage(result.data.data[0].url, `image/${new Date().toISOString()}.png`);
                            r = result.data;
                            initial_url = r.data[0].url;
                            r.data[0].url = publicUrl;
                            //console.log(publicUrl, result.data);
                            await collections.arts.doc(context.params.artId).update({ result: { ...r, url: initial_url }, publicUrl: publicUrl, status: 'completed' });
                            break;
                    }
                    break;
                case 'Transform':
                    switch (providerName) {
                        case 'stability':
                            const transformType = art.transformType;
                            const mediaUrl = art.mediaUrl;
                            const maskUrl = art.maskUrl;

                            // Download images from mediaUrl and maskUrl
                            const mediaImagePath = `images/${context.params.artId}-media.png`;
                            const maskImagePath = `images/${context.params.artId}-mask.png`;
                            await downloadAndStoreImage(mediaUrl, mediaImagePath);
                            await downloadAndStoreImage(maskUrl, maskImagePath);

                            switch (transformType) {
                                case 'Upscale':
                                    // Implement upscale logic here
                                    break;
                                case 'Edit:Outpaint':
                                    // Implement outpaint logic here
                                    break;
                                case 'Edit:Erase':
                                    break;
                                case 'Edit:Search&Repace':
                                    break;
                                case 'Edit:Search&Recolor':
                                    break;
                                case 'Edit:RemoveBackground':
                                    break;
                                case 'Edit:ReplaceBackground&Relight':
                                    break;
                                case 'Control:Sketch':
                                    break;
                                case 'Control:Structure':
                                    break;
                                case 'Control:Style':
                                    break;
                            }
                            break;
                    }
                    break;
                case 'Inpaint':
                    switch (providerName) {
                        case 'stability':
                            const mediaUrl = art.mediaUrl;
                            const maskUrl = art.maskUrl;

                            // Download images from mediaUrl and maskUrl
                            const mediaImagePath = `images/${context.params.artId}-media.png`;
                            const maskImagePath = `images/${context.params.artId}-mask.png`;
                            await downloadAndStoreImage(mediaUrl, mediaImagePath);
                            await downloadAndStoreImage(maskUrl, maskImagePath);

                            // Implement inpainting logic here
                            break;

                        case 'openai':
                            const image = await openai.images.edit({
                                image: fs.createReadStream(mediaImagePath),
                                mask: fs.createReadStream(maskImagePath),
                                prompt: art.message,
                            });

                            // Store the result and update Firestore
                            publicUrl = await downloadAndStoreImage(image.data.url, `image/${new Date().toISOString()}.png`);
                            await collections.arts.doc(context.params.artId).update({
                                result: image.data,
                                publicUrl: publicUrl,
                                status: 'completed'
                            });
                            break;
                    }
                    break;
            }
        } catch (e) {
            console.error(e);
            await collections.arts.doc(context.params.artId).update({ error: { message: JSON.stringify(e.message) }, status: 'error' });
        }
    });



exports.processNewVideo = functions.firestore
    .document('videos/{videoId}')
    .onCreate(async (snapshot, context) => {
        const video = snapshot.data();
        let result;
        try {
            switch (video.actionType) {
                case 'Text-To-Video':
                    switch (providerName) {
                        case 'stability':
                            break;

                        default:
                            result = await generateVideo(video.message);
                            await collections.videos.doc(context.params.videoId).update({ result: result, status: 'completed' });
                            break;
                    }
                    break;
                case 'Image-To-Video':
                    switch (providerName) {
                        case 'stability':
                            break;

                        default:
                            result = await runwayClient.imageToVideo.create({
                                promptImage: video.mediaUrl,
                                model: video.model.id
                            });
                            await collections.videos.doc(context.params.videoId).update({ result: result, status: 'pending_rw' });
                            break;
                    }
                    break;
            }


        } catch (e) {
            console.error(e);
            await collections.videos.doc(context.params.videoId).update({ error: { message: JSON.stringify(e.message) }, status: 'error' });

        }
    });

exports.processNewLandmark = functions.firestore
    .document('landmarks/{landmarkId}')
    .onCreate(async (snapshot, context) => {
        const landmark = snapshot.data();
        try {
            const [result] = await visionClient.landmarkDetection(`gs://${BUCKET_NAME}/${landmark.mediaUrl}`);
            await collections.landmarks.doc(context.params.landmarkId).update({ gpt: [{ ...result, message: result.landmarkAnnotations[0] == null ? '😝 I don\'t know this one' : `💖 I guess this place is ${result.landmarkAnnotations[0].description}` }], status: 'completed' });

        } catch (e) {
            console.log(e);
            await collections.landmarks.doc(context.params.landmarkId).update({ error: { message: JSON.stringify(e.message) }, status: 'error' });

        }
    });


exports.sendOCRToGPT = functions.firestore
    .document('ocr/{ocrId}')
    .onUpdate(async (change, context) => {
        const messageBefore = change.before.data();
        const messageAfter = change.after.data();
        //send to GPT
        if (messageAfter.gpt === null) {
            //send to GPT
            const messages = [];
            messages.push({
                role: 'user',
                content: `${messageAfter.result}`
            });
            try {
                const response = await sendToGPT(messages);
                //console.log(response);
                // Create a new document referencing the original message
                await collections.ocr.doc(context.params.ocrId).update({ gpt: { response: response.data.choices[0], message: messages } });
            } catch (e) {
                await collections.ocr.doc(context.params.ocrId).update({ gpt: { error: e.message } });
            }
        }
    });

exports.processNewMessage = functions.firestore
    .document('chats/{chatId}')
    .onCreate(async (snapshot, context) => {
        const message = snapshot.data();
        const chatId = context.params.chatId;
        try {
            // If the message type is text, do nothing
            if (message.sender === 'gpt') {
                return;
            }

            //if user is using older version report
            if (message.version === '' || message.version !== version || message.version === null || message.version === undefined) {
                const responseDoc = {
                    replyId: chatId,
                    message: "😞 Unfortunately, I am unable to reply as you are using an outdated version of Gpt++. Kindly go to Play store to download the latest version. Thank you!!!",
                    response: [],
                    sender: 'gpt',
                    type: 'text',
                    status: 'completed',
                    sessionId: message.sessionId,
                    chatId: message.chatId != null ? message.chatId : '',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                };
                console.log(await collections.chats.add(responseDoc));
                await collections.chats.doc(chatId).update({ status: 'completed' });
                return;
            }
            if (message.type === 'text') {
                // Otherwise, update the message status to "processing"
                await collections.chats.doc(chatId).update({ status: 'processing' });
                return null;
            }


            // If the message type is audio or video, transcribe it
            if (message.type === 'audio' || message.type === 'video') {
                const transcription = await transcribe(message.mediaUrl, message.type);
                await collections.chats.doc(chatId).update({ transcription });
            }

            // If the message type is file, extract the text
            if (message.type === 'file') {
                const transcription = await extractText(message.mediaUrl);
                //console.log(transcription);
                await collections.chats.doc(chatId).update({ transcription });
            }

            // If the message type is image, extract the text using OCR
            if (message.type === 'image') {
                const transcription = await extractTextFromImage(message.mediaUrl);
                //console.log(transcription);
                await collections.chats.doc(chatId).update({ transcription });
            }

            await collections.chats.doc(chatId).update({ status: 'processing' });
            return null;
        } catch (e) {
            await collections.chats.doc(chatId).update({ status: 'error', errorMessage: e.message });
        }
    });

exports.sendToGPT = functions.firestore
    .document('chats/{chatId}')
    .onUpdate(async (change, context) => {
        const messageBefore = change.before.data();
        const messageAfter = change.after.data();
        const chatId = context.params.chatId;

        // If the message status is not "processing", do nothing
        if (messageBefore.status === 'processing' || messageAfter.status === 'completed' || messageAfter.status === 'error') {
            return null;
        }

        if (messageBefore.status === 'completed') {
            return null;
        }

        // Determine the provider and model to use
        const { messages, model } = await getMessages(messageAfter.chatId);
        const providerName = messageAfter.model?.provider?.providerName || 'openai';

        let response;
        try {
            switch (providerName) {
                case 'anthropic':
                    response = await sendToAnthropic(messages, messageAfter.model.id);
                    response.content.forEach(async (content) => {
                        const responseDoc = {
                            replyId: chatId,
                            message: content.text,
                            response: content,
                            sender: 'gpt',
                            type: 'text',
                            model: messageBefore.model || {},
                            sessionId: messageAfter.sessionId,
                            chatId: messageAfter.chatId || '',
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        };
                        await collections.chats.add(responseDoc);
                    });
                    break;

                case 'mistral':
                    response = await sendToMistral(messages, messageAfter.model.id);
                    response.choices.forEach(async (choice) => {
                        const responseDoc = {
                            replyId: chatId,
                            message: choice.message.content,
                            response: choice,
                            sender: 'gpt',
                            type: 'text',
                            model: messageBefore.model || {},
                            sessionId: messageAfter.sessionId,
                            chatId: messageAfter.chatId || '',
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        };
                        await collections.chats.add(responseDoc);
                    });
                    break;

                case 'gemini':
                    response = await sendToGemini(messages, messageAfter.model.id);
                    const geminiResponseDoc = {
                        replyId: chatId,
                        message: response.text(),
                        response: response,
                        sender: 'gpt',
                        type: 'text',
                        model: messageBefore.model || {},
                        sessionId: messageAfter.sessionId,
                        chatId: messageAfter.chatId || '',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    await collections.chats.add(geminiResponseDoc);
                    break;

                case 'xAi':
                    response = await sendToGrok(messages, messageAfter.model.id);
                    response.data.choices.forEach(async (choice) => {
                        const responseDoc = {
                            replyId: chatId,
                            message: choice.message.content,
                            response: choice,
                            sender: 'gpt',
                            type: 'text',
                            model: messageBefore.model || {},
                            sessionId: messageAfter.sessionId,
                            chatId: messageAfter.chatId || '',
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        };
                        await collections.chats.add(responseDoc);
                    });
                    break;

                default: // OpenAI
                    response = await sendToGPT(messages, model);
                    response.data.choices.forEach(async (choice) => {
                        const responseDoc = {
                            replyId: chatId,
                            message: choice.message.content,
                            response: choice,
                            sender: 'gpt',
                            type: 'text',
                            model: messageBefore.model || {},
                            sessionId: messageAfter.sessionId,
                            chatId: messageAfter.chatId || '',
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        };
                        await collections.chats.add(responseDoc);
                    });
            }

            await collections.chats.doc(chatId).update({ status: 'completed' });
            await collections.chat_logs.add({
                chatId: chatId,
                response: JSON.stringify(response.data ? response.data : response)
            });

            if (messageBefore.postToFeed) {
                await collections.feeds.add({
                    ...messageAfter,
                    status: 'completed',
                    gpt: response.data ? response.data.choices : response,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    isShared: false,
                    feedId: null,
                    meta: {
                        comments: [],
                        likes: [],
                        shares: []
                    },
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.error(e);
            await collections.chats.doc(chatId).update({ status: 'error' });
        }
        return null;
    });

// Function to send messages to Anthropic
async function sendToAnthropic(messages, modelId) {
    const completion = await anthropic.messages.create({
        model: modelId,
        messages: messages,
        max_tokens: 4096
    });
    return completion;
}

// Function to send messages to Mistral
async function sendToMistral(messages, modelId) {
    const completion = await mistral.chat.completions.create({
        model: modelId,
        messages: messages,
        max_tokens: 4096
    });
    return completion;
}

// Function to send messages to Gemini
async function sendToGemini(messages, modelId) {
    const model = genAI.getGenerativeModel({ model: modelId });

    // Convert messages to Gemini format
    const prompt = messages.map(msg => msg.content).join('\n');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response;
}

// Function to send messages to Grok (X.AI)
async function sendToGrok(messages, modelId) {
    const completion = await xai.createChatCompletion({
        model: modelId,
        messages: messages,
        max_tokens: 4096
    });
    return completion;
}

exports.handleTrivia = functions.firestore
    .document('trivia/{triviaId}')
    .onCreate(async (change, context) => {
        const triviaId = context.params.triviaId;
        const data = change.data();
        if (data.isStart) {
            const messages = [];
            messages.push({ role: 'system', content: `${SYSTEM_MESSAGES.trivia}` });
            messages.push({ role: 'user', content: 'start' });
            try {
                const response = await sendToGPT(messages);
                const message = response.data.choices[0].message.content;
                const jsonResponse = JSON.parse(message);
                collections.trivia.add({
                    ...jsonResponse,
                    profileUrl: data.profileUrl,
                    senderName: data.senderName,
                    senderId: data.senderId,
                    message: message,
                    sender: 'gpt',
                    triviaId: data.triviaId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    response: null,
                    score: 0,
                    answer: null,
                    status: 'new'
                });
            } catch (e) {
                console.log(e);
                await collections.trivia.doc(triviaId).update({ status: 'error' });
            }
        }
    });

exports.updateTrivia = functions.firestore
    .document('trivia/{triviaId}')
    .onUpdate(async (change, context) => {
        const messageBefore = change.before.data();
        const messageAfter = change.after.data();
        const triviaId = context.params.triviaId;

        if (messageBefore.status == 'new' && messageAfter.status == 'new') {
            const messages = await getTriviaMessages(messageAfter.triviaId);
            messages.push({ role: 'user', content: `${messageAfter.answer}` });
            try {
                const response = await sendToGPT(messages);
                const message = response.data.choices[0].message.content;
                const jsonResponse = JSON.parse(message);
                //update question
                await collections.trivia.doc(triviaId).update({ response: jsonResponse.response, status: 'completed' });
                //add new trivia question
                await collections.trivia.add({ message: messageAfter.answer, triviaId: messageAfter.triviaId, timestamp: admin.firestore.FieldValue.serverTimestamp() });
                await collections.trivia.add({
                    ...jsonResponse,
                    message: message,
                    triviaId: messageAfter.triviaId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    response: null,
                    answer: null,
                    status: 'new',
                    sender: 'gpt',
                    profileUrl: messageAfter.profileUrl,
                    senderName: messageAfter.senderName,
                    senderId: messageAfter.senderId,
                    score: jsonResponse.response == 'correct' ? messageAfter.score + 1 : messageAfter.score
                });

                //update leaderboard
                await collections.leaderboard.doc(messageAfter.senderId).set({
                    profileUrl: messageAfter.profileUrl,
                    name: messageAfter.senderName,
                    score: jsonResponse.response == 'correct' ? messageAfter.score + 1 : messageAfter.score
                });
            } catch (e) {
                await collections.trivia.doc(triviaId).update({ status: 'error' });
            }
        }
    });

async function translateText(text, language = 'en') {
    // Translates the text
    const [translation] = await translate.translate(text, language);
    return translation;
}

async function getTriviaMessages(triviaId) {
    const querySnapshot = await collections.trivia
        .where('triviaId', '==', triviaId)
        .orderBy('timestamp', 'asc')
        .get();
    const messages = [{ role: 'system', content: `${SYSTEM_MESSAGES.trivia}` }];
    querySnapshot.forEach(async (doc) => {
        if (doc.data().sender !== 'gpt') {
            messages.push({ role: 'user', content: `${doc.data().message != undefined ? doc.data().message : ''}` })
            //get response 
        } else {
            messages.push({ role: 'assistant', content: doc.data().message });
        };
    });
    return messages;
}
async function getMessages(chatId) {
    const querySnapshot = await collections.chats
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    const messages = [];
    let modelToUse = 'gpt-4o';
    querySnapshot.forEach(async (doc) => {
        if (doc.data().sender !== 'gpt') {
            if (doc.data().type == 'image') {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: `${doc.data().transcription != null ? doc.data().transcription : ''} \n ${doc.data().message != undefined ? doc.data().message : ''}` },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `${doc.data().publicUrl}`,
                            },
                        },
                    ],
                });
                modelToUse = 'gpt-4-vision-preview';
            } else {
                messages.push({ role: 'user', content: `${doc.data().transcription != null ? doc.data().transcription : ''} \n ${doc.data().message != undefined ? doc.data().message : ''}` })
            }
            //get response 
        } else {
            messages.push({ role: 'assistant', content: doc.data().message });
        };
    });
    return { messages, model: modelToUse };
}

async function sendToGPT(messages, model = 'gpt-4o') {
    const completion = await openai.createChatCompletion({
        model: model,
        messages: messages,
    });
    return completion;
}

async function extractTextFromImage(mediaUrl) {
    // Get the image file from the Storage bucket
    const file = bucket.file(mediaUrl);
    // Extract text from the image using Google Cloud Vision API
    const [result] = await visionClient.textDetection(`gs://${BUCKET_NAME}/${file.name}`);
    console.log(JSON.stringify(result));
    // Check if text was detected
    if (!result.fullTextAnnotation) {
        console.log('No text detected in image');
        return null;
    }
    // Return the extracted text 
    return result.fullTextAnnotation.text;
}

async function extractTextFromImage(mediaUrl) {
    // Get the image file from the Storage bucket
    const file = bucket.file(mediaUrl);

    // Construct the request to the Cloud Vision API
    const [result] = await visionClient.textDetection(`gs://${BUCKET_NAME}/${file.name}`);

    // Check if text was detected
    if (!result.textAnnotations) {
        console.log('No text detected in image');
        return null;
    }

    // Get the first text annotation (assuming there's only one)
    const textAnnotation = result.textAnnotations[0];

    // Return the text detected in the image
    return textAnnotation.description;
}


async function extractLabelsFromImage(mediaUrl) {
    // Get the image file from the Storage bucket
    const file = bucket.file(mediaUrl);
    // Extract text from the image using Google Cloud Vision API
    const [result] = await visionClient.labelDetection(`gs://${BUCKET_NAME}/${file.name}`);
    //console.log(JSON.stringify(result));
    // Check if text was detected
    if (!result.labelAnnotations) {
        console.log('No text detected in image');
        return null;
    }

    return result.labelAnnotations;
}

async function transcribe(mediaUrl, type, lang = 'en-US') {
    try {
        const file = bucket.file(mediaUrl);

        const [transcription] = await speechClient.recognize({
            audio: {
                uri: `gs://${BUCKET_NAME}/${file.name}`
            },
            config: {
                languageCode: lang,
                enableWordTimeOffsets: true,
                useEnhanced: true
            }
        });

        return transcription.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

async function transcribeOpenAI(mediaUrl, type, model = 'whisper-1') {
    // Get the media file from the Storage bucket
    const file = bucket.file(mediaUrl)
    // Transcribe the audio using OpenAI API 
    // Download the file to a local temporary file
    const tempFilePath = `./audio.mp3`;
    await file.download({ destination: tempFilePath });

    // Transcribe the audio using OpenAI API
    const audioStream = fs.createReadStream(tempFilePath);
    const result = await openai.createTranscription(audioStream, model);

    // Return the transcription text
    return result.data.text;
}

async function extractText(mediaUrl) {
    const file = bucket.file(mediaUrl);
    const type = getFileType(mediaUrl);
    if (type === 'pdf') {
        return new Promise(async (resolve, reject) => {
            const buffer = await file.download();
            const pdf = buffer[0];
            const options = {}; // you can pass options to pdfParse if needed
            const data = await pdfParse(pdf, options);
            //await file.delete();
            resolve(data.text);
        });
    } else if (type === 'csv') {
        const results = [];
        return new Promise((resolve, reject) => {
            file.createReadStream()
                .pipe(parse())
                .on('data', data => results.push(data))
                .on('error', reject)
                .on('end', () => {
                    const text = results.map(result => Object.values(result).join(' ')).join(' ');
                    resolve(text);
                });
        });
    } else if (type === 'txt') {
        return new Promise(async (resolve, reject) => {
            const buffer = await file.download();
            const text = buffer.toString();
            //await file.delete();
            resolve(text);
        });
    } else {
        throw new Error('Unsupported file type');
    }
}

function getFileType(mediaUrl) {
    const parts = mediaUrl.split('.');
    return parts[parts.length - 1];
}


exports.rateUs = functions.https.onCall(async (data, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "https://lonerinc.com"
    };
    collections.rates.add({
        user: data.user,
        rate: data.rate,
        comment: data.comment
    });
    return headers;
});

exports.getTLanguages = functions.https.onCall(async (data, context) => {
    const languages = require('./lang.json');
    return languages;
});

exports.getLanguages = functions.https.onCall(async (data, context) => {
    // Gets a list of all supported languages
    const [languages] = await translate.getLanguages();
    return languages;
});

const downloadAndStoreImage = async (imageUrl, destinationPath) => {
    try {
        // Download the image from the URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        // Store the image in Firebase Cloud Storage
        await bucket.file(destinationPath).save(response.data);

        // Get the public URL of the stored image
        const file = bucket.file(destinationPath);

        file.makePublic();

        return file.publicUrl();
    } catch (error) {
        console.error('Failed to download and store the image:', error);
    }
};

async function generateVideo(prompt) {
    try {
        // Create the video generation
        let generation = await lumaClient.generations.create({
            prompt: prompt
        });

        let completed = false;

        // Poll until generation is complete
        while (!completed) {
            generation = await lumaClient.generations.get(generation.id);

            if (generation.state === "completed") {
                completed = true;
            } else if (generation.state === "failed") {
                throw new Error(`Generation failed: ${generation.failure_reason}`);
            } else {
                console.log("Dreaming...");
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        // Download and store the video
        const videoUrl = generation.assets.video;
        const destinationPath = `videos/${generation.id}.mp4`;

        // Download the video from the URL
        const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });

        // Store the video in Firebase Cloud Storage
        await bucket.file(destinationPath).save(response.data);

        // Get the public URL of the stored video
        const file = bucket.file(destinationPath);
        await file.makePublic();

        return file.publicUrl();
    } catch (error) {
        console.error('Failed to generate and store the video:', error);
        throw error;
    }
}

// Add new scheduled function to check pending generations
exports.checkPendingBFLGenerations = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
        try {
            // Get all pending BFL generations
            const pendingArts = await collections.arts
                .where('status', '==', 'pending_bfl')
                .get();

            for (const artDoc of pendingArts.docs) {
                const art = artDoc.data();

                // Check generation status
                const checkResult = await fetch('https://api.bfl.ml/v1/get_result', {
                    headers: {
                        'X-Key': process.env.BFL_KEY
                    }
                });

                const resultData = await checkResult.json();

                if (resultData.status === 'Ready') {
                    // Download and store the image
                    const publicUrl = await downloadAndStoreImage(
                        resultData.result.sample,
                        `image/bfl-${new Date().toISOString()}.png`
                    );

                    // Update with final results
                    await artDoc.ref.update({
                        result: {
                            ...resultData.result,
                            url: resultData.result.sample
                        },
                        publicUrl: publicUrl,
                        status: 'completed',
                        lastChecked: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Update last checked timestamp
                    await artDoc.ref.update({
                        lastChecked: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error('Error checking BFL generations:', error);
        }
    });

// Add new scheduled function to check pending generations
exports.checkPendingRunwayGenerations = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
        try {
            // Get all pending Runway generations
            const pendingVideos = await collections.videos
                .where('status', '==', 'pending_rw')
                .get();

            for (const videoDoc of pendingVideos.docs) {
                const video = videoDoc.data();

                // Check generation status
                const checkResult = await runwayClient.tasks.retrieve(video.result.id);
                const resultData = await checkResult.json();

                switch (resultData.status) {
                    case 'SUCCEEDED':
                        // Download and store the video
                        const videoUrls = resultData.output;
                        if (videoUrls && videoUrls.length > 0) {
                            const videoUrl = videoUrls[0]; // Assuming the first URL is the video
                            const videoPath = `videos/runway-${new Date().toISOString()}.mp4`;

                            // Download the video from the URL
                            const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });

                            // Store the video in Firebase Cloud Storage
                            await bucket.file(videoPath).save(response.data);

                            // Make the file public and get URL
                            const file = bucket.file(videoPath);
                            await file.makePublic();
                            const publicUrl = file.publicUrl();

                            // Update the video document
                            await videoDoc.ref.update({
                                result: {
                                    ...resultData,
                                    url: publicUrl // Store generated URL
                                },
                                publicUrl: publicUrl,
                                status: 'completed'
                            });
                        }
                        break;

                    case 'FAILED':
                        console.error(`Video generation failed: ${resultData.failure}`);
                        await videoDoc.ref.update({
                            status: 'error',
                            error: {
                                message: resultData.failure,
                                code: resultData.failureCode
                            }
                        });
                        break;

                    case 'RUNNING':
                        console.log(`Video generation is running. Progress: ${resultData.progress}`);
                        break;

                    case 'PENDING':
                    case 'THROTTLED':
                        console.log(`Video generation is pending or throttled.`);
                        break;

                    case 'CANCELLED':
                        console.log(`Video generation was cancelled.`);
                        await videoDoc.ref.update({
                            status: 'cancelled'
                        });
                        break;

                    default:
                        console.log(`Unknown status: ${resultData.status}`);
                        break;
                }
            }
        } catch (error) {
            console.error('Error checking Runway generations:', error);
        }
    });

// Add new scheduled function to check pending transformations
exports.checkPendingTransformations = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
        try {
            // Get all pending transformations
            const pendingArts = await collections.arts
                .where('status', '==', 'pending_transform')
                .get();

            for (const artDoc of pendingArts.docs) {
                const art = artDoc.data();

                // Check transformation status
                // Implement polling logic here for specific providers

                // Update with final results if completed
                // await artDoc.ref.update({
                //     result: finalResult,
                //     publicUrl: publicUrl,
                //     status: 'completed',
                //     lastChecked: admin.firestore.FieldValue.serverTimestamp()
                // });
            }
        } catch (error) {
            console.error('Error checking transformations:', error);
        }
    });