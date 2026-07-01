import fetch from 'node-fetch';

async function testAskAI() {
    console.log("Testing ask-ai endpoint with 'hi'");
    
    // We need to fetch against the Next.js server, but it might not be running.
    // Instead of doing a live fetch, let's just inspect the code execution logic.
    const { classifyRoute } = require('./src/app/api/projects/[id]/ask-ai/route.js');
    console.log("Classify route:", classifyRoute('hi'));
}

testAskAI();
