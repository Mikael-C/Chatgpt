const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const PDFDocument = require("pdfkit");
const jimp = require('jimp');
const { Configuration, OpenAIApi } = require("openai");
const { SpeechClient } = require('@google-cloud/speech');
const configuration = new Configuration({
    apiKey: "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"
});
const serviceAccount = require('./credentials.json');
const { google } = require('@google-cloud/speech/build/protos/protos');
const openai = new OpenAIApi(configuration);
const BUCKET_NAME = 'chatgptpp-7d9f2.appspot.com';
const speechClient = new SpeechClient({
    credentials: serviceAccount
});
const vision = require('@google-cloud/vision');
const { Translate } = require('@google-cloud/translate').v2;
const trivia_system_msg = 'You are a trivia generating machine ask questions and give options; output it as JSON and once I answer tell me if I am correct or wrong with new set of questions and options, output it as JSON in this format { response: <correct | incorrect>, question: <string>, options: <array> } strictly use this as an example { response : incorrect, question : What is the capital of Ukraine, options: [Berlin, Washington D.C, Kyiv, Paris]}';

admin.initializeApp(
    {
        credential: admin.credential.cert(serviceAccount)
    }
);

const translate = new Translate({
    credentials: serviceAccount
});

const visionClient = new vision.ImageAnnotatorClient({
    credentials: serviceAccount
});

const firestore = admin.firestore();
const ratesCollection = firestore.collection('rates');
const triviaCollection = firestore.collection('trivia');
const bucket = admin.storage().bucket(BUCKET_NAME);
async function generateChatResponse(messages) {

    const completion = await openai.createChatCompletion({
        model: "gpt-4-0125-preview",
        messages: messages,
    });
    return completion;
}

const prompt = "write a simple code in python";

const main = async () => {
    /* const result = await generateChatResponse([
         { role: "user", content: 'write a simple code in python' },
         { role: "assistant", content: 'Here is a simple code in Python that prints \"Hello, World!\" to the console:\n\n```\nprint(\"Hello, World!\")\n```\n\nThis code simply uses the built-in `print()` function to output the string \"Hello, World!\" to the console when the code is run.' },
         { role: "user", content: 'modify it to take any input and append it to it' }
     ]);
     console.log(JSON.stringify(result.data));*/
    const result = await generateChatResponse([{ role: 'user', content: ' \n' + " Personal Account statement01/04/2023 - 01/04/2023Ikechukwu Chinedu Anasiudu112 Bright StreetWolverhamptonWV1 4ASUnited Kingdom£551.57Personal Account balance(Excluding all Pots)£0.00Balance in Pots(This includes both Regular Pots with Monzo and Savings Potswith external providers)-£539.65Total outgoings+£516.68Total depositsDateDescription(GBP) Amount(GBP) Balance01/04/2023HEALTH AND CARE PROFES LONDON GBR(pending)-539.65551.5701/04/2023B TRANSFER SERVICES LIMITED (FasterPayments)516.681,091.22Monzo Bank Limited (https://monzo.com) is a company registered in England No. 9446231. Registered Office: BroadwalkHouse, 5 Appold Street, London EC2A 2AG. Monzo Bank Ltd is authorised by the Prudential Regulation Authority and regulatedby the Financial Conduct Authority and the Prudential Regulation Authority. Our Financial Services Register number is 730427.Sort code: 04-00-04Account number: 95814894Important information about compensationarrangementsThe account(s) listed in this statement are eligible for cover under the Financial Services CompensationScheme (FSCS).We're covered by the FSCS. The FSCS compensate depositors if a bank can't meet itsfinancial obligations. Most depositors – including most individuals and businesses – arecovered by the scheme. We'll give you the FSCS information sheet and exclusions list oncea year. This tells you what is and isn't covered by the FSCS in lots of detail.The FSCS protects eligible deposits up to £85,000 per person. The FSCS apply this limit to each person,and to the total combined amount of any money you have with the provider. For joint accounts, eachaccount holder has a claim to their share separately. That means that in a joint account held by twoeligible depositors, the maximum amount each person could claim is £85,000 each (for a total of£170,000).For more information about FSCS compensation, head to the FSCS website at www.FSCS.org.ukMonzo Bank Limited (https://monzo.com) is a company registered in England No. 9446231. Registered Office: Broadwalk House, 5Appold Street, London EC2A 2AG. Monzo Bank Ltd is authorised by the Prudential Regulation Authority and regulated by theFinancial Conduct Authority and the Prudential Regulation Authority. Our Financial Services Register number is 730427. \n" + "Start your reply with 'From the file you sent..." }]);
    console.log(JSON.stringify(result.data));
}

const main2 = async () => {
    //const file = fs.createReadStream('2023-04-16T12_00_35.718Z.mp3');
    //const result = await openai.createTranscription(file, 'whisper-1');
    //console.log(result.data);
    console.log(await transcribe('audio/2023-04-16T12:00:35.718Z.mp3'));

}


async function transcribe(mediaUrl, type) {
    // Get the media file from the Storage bucket
    const file = bucket.file(mediaUrl)
    // Transcribe the audio using OpenAI API 
    // Download the file to a local temporary file
    const tempFilePath = `./audio.mp3`;
    await file.download({ destination: tempFilePath });

    // Transcribe the audio using OpenAI API
    const audioStream = fs.createReadStream(tempFilePath);
    const result = await openai.createTranscription(audioStream, 'whisper-1');

    // Return the transcription text
    return result.data.text;
}
const main3 = async () => {
    const headers = {
        "Access-Control-Allow-Origin": "https://lonerinc.com"
    };
    await ratesCollection.add({
        user: "test user",
        rate: 4,
        comment: "test comment"
    });
    return headers;
}

const main4 = async () => {
    const [response] = await speechClient.getSupportedLanguages();
    const languages = response.languages.map(language => language.languageCode);
    console.log(languages);
}

const main5 = async () => {


    const getAllLanguages = async () => {
        // Gets a list of all supported languages
        const [languages] = await translate.getLanguages();

        // Logs out the language codes and names
        languages.forEach((language) => {
            console.log(`${language.code}: ${language.name}`);
        });
    };

    getAllLanguages().catch((err) => {
        console.error(err);
    });

}

const main6 = async () => {
    const result = await translateText("Hello my love", "ti");
    return result;
}
async function translateText(text, language = 'en') {
    // Translates the text
    const [translation] = await translate.translate(text, language);
    return translation;
}

const main7 = async () => {
    console.log((await openai.createImage({model: "dall-e-3", prompt: 'a dog with a mustache', n: 1, size: '1024x1024' })).data);
}

const convertToPNG = async (inputPath, outputPath) => {
    try {
        // Read the image using Jimp
        const image = await jimp.read(inputPath);

        // Convert the image to PNG format
        await image.writeAsync(outputPath);

        console.log('Image converted to PNG successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
};


const main8 = async () => {
    const mediaUrl = 'image/2023-07-15T11:41:24.342Z_1649701711004.jpg'; // Get the mediaUrl from the art document
    const originalFilePath = 'tmp/dump.bin';
    const localFilePath = 'tmp/dump.png'; // Specify the local file path where you want to save the image

    try {
        // Download the file from Firebase Storage to the local file system
        await bucket.file(mediaUrl).download({ destination: originalFilePath });

        await convertToPNG(originalFilePath, localFilePath);

        const result = await openai.createImageVariation(fs.createReadStream('tmp/dump.png'), 1, '1024x1024');

        console.log(result.data);
    } catch (error) {
        console.error('Failed to download the image:', error);
    }
};



const downloadAndStoreImage = async (imageUrl, destinationPath) => {
    try {
        // Download the image from the URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        // Store the image in Firebase Cloud Storage
        await bucket.file(destinationPath).save(response.data);

        // Make the file publicly accessible
        const file = bucket.file(destinationPath);

        await file.makePublic();

        return file.publicUrl();
    } catch (error) {
        console.error('Failed to download and store the image:', error);
    }
};

const main10 = async () => {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await visionClient.landmarkDetection(`gs://cloud-samples-data/vision/landmark/st_basils.jpeg`);
    console.log(JSON.stringify(result));
};
const main9 = async () => {
    console.log(await downloadAndStoreImage('https://www.pixelstalk.net/wp-content/uploads/2016/08/Amazing-cool-hd-photos-nature-For-Your-Windows-768x432.jpg', `image/${new Date().toISOString()}.png`));
}

async function exportDocumentsToPDF(collectionRef, propertyToFilter, propertyValue) {
    try {
        const querySnapshot = await collectionRef.where(propertyToFilter, "==", propertyValue).get();
        const filteredData = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            filteredData.push(data);
        });

        if (filteredData.length === 0) {
            console.log("No documents found with the specified property and value.");
            return;
        }

        // Generate PDF
        const doc = new PDFDocument();
        const pdfPath = "tmp/output.pdf"; // Temporary local file path for the PDF
        doc.pipe(fs.createWriteStream(pdfPath));

        filteredData.forEach((data, index) => {
            if (data.sender === "gpt") {
                // GPT as sender
                doc.fillColor("blue");
            } else {
                // "you" as sender
                doc.fillColor("black");
            }
            //const avatarUrl = data.sender === "gpt" ? 'tmp/icon.png' : 'tmp/avatar.jpg';
            //doc.image(avatarUrl, 50, doc.y, { width: 40, height: 40 });

            // Move to the right to allow space for the avatar
            doc.moveUp();
            doc.moveUp();
            doc.moveUp();

            doc.text(data.sender, {
                continued: true,
                width: 40, // Limit the width to provide space for the avatar
                align: "right",
            });

            // Move down to prepare for the message text
            doc.moveDown();
            doc.moveDown();
            // Timestamp for each message

            doc.text(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
            doc.text(data.message, { continued: true });
            doc.moveDown();
        });

        doc.end();

        // Upload PDF to Firebase Storage
        const storageFileName = `exports/${new Date().toISOString()}-chat_export.pdf`; // Replace with desired filename
        const result = await bucket.upload(pdfPath, {
            destination: storageFileName,
            metadata: {
                contentType: "application/pdf",
                // Add other metadata properties if needed
                cacheControl: "public, max-age=31536000"
            },
        });

        // Delete the temporary local file
        //fs.unlinkSync(pdfPath);

        console.log("PDF has been generated and uploaded to Firebase Storage successfully.", result[0].publicUrl());
    } catch (error) {
        console.error("Error exporting documents:", error);
    }
}
const main11 = () => {
    exportDocumentsToPDF(admin.firestore().collection('chats'), 'chatId', 'PSy2zgdq3jPwRHANdZvU');
}
//main9();

const main12 = async () => {
    const r = await generateChatResponse([
        { role: 'system', content: `You are a trivia generating machine ask questions and give options; output it as JSON and once I answer tell me if I am correct or wrong with new set of questions and options, output it as JSON in this format { response: <correct | incorrect>, question: <string>, options: <array> } ` },
        { role: 'user', content: 'start' }
    ]);
    console.log(JSON.parse(r.data.choices[0].message.content));
}

//main12();

async function getTriviaMessages(triviaId) {
    const querySnapshot = await triviaCollection
        .where('triviaId', '==', triviaId)
        .orderBy('timestamp', 'desc')
        .limit(25)
        .get();
    const messages = [{ role: 'system', content: `${trivia_system_msg}` }];
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

const main13 = async () => {
   const m = await getTriviaMessages('0.11702833448387806');
   console.log(m);
}

main();