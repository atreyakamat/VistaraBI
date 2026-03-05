import { generateCompletion } from './src/lib/ai/ollama-client';
// @ts-ignore
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' }); // just in case

console.log('Testing Cloud AI connection...');
console.log('URL configured:', process.env.CLOUD_AI_BASE_URL);
console.log('Key exists:', !!process.env.CLOUD_AI_API_KEY);

async function test() {
    try {
        const result = await generateCompletion({
            prompt: "Return the exact phrase: 'Systems Online.'",
            temperature: 0.1
        });
        console.log('\n--- SUCCESS ---');
        console.log(result);
    } catch (e) {
        console.error('\n--- FAILED ---');
        console.error(e);
    }
}

test();
