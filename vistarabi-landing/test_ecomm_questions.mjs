import fs from 'fs';

const BASE_URL = 'http://localhost:3005';
const PROJECT_ID = '339dfb0a-1f53-4ad3-b2c5-eb252bdd509e';
let cookieHeader = '';

async function fetchAPI(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    if (cookieHeader) {
        headers.set('cookie', cookieHeader);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        cookieHeader = setCookie;
    }

    return res;
}

const questions = [
    "Analyze our Average Order Value trend and list key recommendations.",
    "What is our cart abandonment rate and main drop-off point?",
    "Analyze the repeat customer rate and contribution.",
    "What is the Average Order Value?",
    "Show trend of Average Order Value",
    "Compare performance of marketing channels.",
    "Identify top-performing product segments.",
    "How does mobile traffic compare to desktop traffic?",
    "What is the seasonal peak for sales?",
    "Analyze the refund rate and common reasons.",
    "Recommend a strategy to increase AOV."
];

async function testQuestions() {
    console.log("👤 [Auth] Logging in...");
    await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "demo@vistarabi.com", password: "VistaraDemo@2026" })
    });

    const results = [];

    for (const q of questions) {
        console.log(`💬 Asking: "${q}"`);
        const start = Date.now();
        const res = await fetchAPI(`/api/projects/${PROJECT_ID}/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: q, history: [] })
        });
        const duration = Date.now() - start;

        if (res.ok) {
            const data = await res.json();
            const answer = data.conversationalPreamble || data.summarySentence || data.text || "No response text found.";
            console.log(`✅ Received in ${duration}ms`);
            results.push({ question: q, answer, duration });
        } else {
            console.log(`❌ Failed with status ${res.status}`);
            results.push({ question: q, answer: "ERROR", duration });
        }
    }

    fs.writeFileSync('ecommerce_qa_results.json', JSON.stringify(results, null, 2));
    console.log("📂 Results saved to ecommerce_qa_results.json");
}

testQuestions().catch(console.error);
