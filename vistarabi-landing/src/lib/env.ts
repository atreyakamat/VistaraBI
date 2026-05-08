// Env validation — runs at module import time on server startup
// Throws a clear error if required variables are missing or using unsafe defaults

const REQUIRED_VARS: { key: string; description: string }[] = [
    { key: 'DATABASE_URL', description: 'PostgreSQL connection string' },
];

const PROD_REQUIRED_VARS: { key: string; description: string; insecureDefault?: string }[] = [
    {
        key: 'JWT_SECRET',
        description: 'JWT signing secret (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
        insecureDefault: 'vistarabi-dev-jwt-secret-2024-change-in-production',
    },
    {
        key: 'NEXTAUTH_SECRET',
        description: 'NextAuth secret',
        insecureDefault: 'vistarabi-dev-nextauth-secret-2024-change-in-production',
    },
];

export function validateEnv(): void {
    const missing: string[] = [];
    const warnings: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // Check always-required vars
    for (const { key, description } of REQUIRED_VARS) {
        if (!process.env[key]) {
            missing.push(`  ❌ ${key} — ${description}`);
        }
    }

    // Check production-critical vars
    for (const { key, description, insecureDefault } of PROD_REQUIRED_VARS) {
        const value = process.env[key];
        if (!value) {
            missing.push(`  ❌ ${key} — ${description}`);
        } else if (isProduction && insecureDefault && value === insecureDefault) {
            missing.push(`  🔴 ${key} — Using insecure default value in production! ${description}`);
        } else if (!isProduction && insecureDefault && value === insecureDefault) {
            warnings.push(`  ⚠️  ${key} — Using dev default. Change before deploying to production.`);
        }
    }

    if (missing.length > 0) {
        console.error('\n╔══════════════════════════════════════════════════════════╗');
        console.error('║         VistaraBI — Environment Configuration Error      ║');
        console.error('╚══════════════════════════════════════════════════════════╝');
        console.error('\nThe following required environment variables are missing or insecure:\n');
        missing.forEach(m => console.error(m));
        console.error('\nCreate a .env.local file with these values. See .env for a template.\n');

        // Don't throw during next build static generation — only at real server startup
        const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
        if (isProduction && !isBuildPhase) {
            throw new Error('Missing or insecure environment variables. See server logs for details.');
        }
    }

    if (warnings.length > 0) {
        console.warn('\n[VistaraBI] Environment warnings:');
        warnings.forEach(w => console.warn(w));
        console.warn('');
    }
}

// AI provider status
export function getAIConfig() {
    return {
        ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
        cloudUrl: process.env.CLOUD_AI_BASE_URL,
        cloudModel: process.env.CLOUD_AI_MODEL,
        openRouterKey: process.env.OPENROUTER_API_KEY,
        groqApiKey: process.env.GROQ_API_KEY,
        groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        groqBaseUrl: process.env.GROQ_BASE_URL,
        hasLocalAI: !!(process.env.OLLAMA_URL || process.env.OLLAMA_MODEL),
        hasCloudAI: !!(process.env.CLOUD_AI_BASE_URL),
        hasOpenRouter: !!(process.env.OPENROUTER_API_KEY),
        hasGroq: !!process.env.GROQ_API_KEY,
    };
}
