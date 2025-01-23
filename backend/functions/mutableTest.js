import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const BFL_KEY = 'cf97f4e9-81f0-4340-a214-a1a1676ecd17';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the service account key file
const keyFilePath = path.join(__dirname, 'chatgptpp-gptpp-3.json');
const keyFileContent = readFileSync(keyFilePath, 'utf8');
const keyFile = JSON.parse(keyFileContent);

const auth = new GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const main = async () => {
    try {
        const response = await fetch('https://api.bfl.ml/v1/flux-pro-1.1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Key': BFL_KEY
            },
            body: JSON.stringify({
                prompt: 'A teddy bear in sunglasses playing electric guitar and dancing'
            })
        });

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();
        console.log('Main API Response:', data);
        return data;
    } catch (error) {
        console.error('Error in main():', error);
    }
};

const getResult = async () => {
    try {
        const response = await fetch('https://api.bfl.ml/v1/get_result?id=cf523150-f595-4de4-a04d-ed7c10714080', {
            headers: {
                'X-Key': BFL_KEY
            }
        });

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();
        console.log('Get Result API Response:', data);
        return data;
    } catch (error) {
        console.error('Error in getResult():', error);
    }
};

const imagen = async () => {
    try {
        const url = 'https://us-central1-aiplatform.googleapis.com/v1/projects/chatgptpp-7d9f2/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict';
        
        // Get an authorized client
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        console.log(token);
        if (!token.token) throw new Error('Failed to retrieve access token');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: 'A teddy bear in sunglasses playing electric guitar and dancing'
                    }
                ],
                parameters: {
                    sampleCount: 1
                }
            })
        });

        console.log(response);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();
        console.log('Imagen API Response:', data);
        return data;
    } catch (error) {
        console.error('Error in imagen():', error);
    }
};

// Execute functions to test
imagen().then(console.log).catch(console.error);
