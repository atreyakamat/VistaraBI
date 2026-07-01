# VistaraBI Deployment Guide (Vercel / Railway)

## Prerequisites
- PostgreSQL database (e.g., Supabase, Neon, or Railway Postgres).
- Redis instance (e.g., Upstash or Railway Redis) for persistent AI chat memory.
- Stripe account (for billing webhooks).
- Resend account (for emails).
- (Optional) OpenRouter or Groq API keys if not using a self-hosted Ollama instance.

## Vercel Deployment (Frontend / Next.js)
1. **Connect Repository**: Import the `vistarabi-landing` directory from your Git repository into Vercel.
2. **Framework Preset**: Vercel should auto-detect Next.js.
3. **Root Directory**: Set to `vistarabi-landing`.
4. **Build Command**: `npm run build`
5. **Install Command**: `npm install`
6. **Environment Variables**: Add all variables from your `.env` template (excluding `DEMO_MODE` if deploying to production):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `REDIS_URL`
   - `RESEND_API_KEY`
   - `STRIPE_SECRET_KEY`
   - etc.

## Railway Deployment (Backend / DB)
If you prefer deploying everything together on Railway:
1. **Provision Services**: Create a PostgreSQL and a Redis service on Railway.
2. **Connect Repository**: Point Railway to the `vistarabi-landing` directory.
3. **Environment Variables**: Map the internal `DATABASE_URL` and `REDIS_URL` to your Next.js service.
4. **Build Command**: `npm run build`
5. **Start Command**: `npm start`

## Post-Deployment Steps
1. **Database Migration**: Run `npx prisma migrate deploy` against your production database.
2. **Stripe Webhooks**: Configure Stripe to send webhooks to `https://<your-domain>/api/billing/webhook` and set the `STRIPE_WEBHOOK_SECRET` environment variable.
3. **Demo Mode (Optional)**: If you want to deploy a version without database dependencies for sales calls, set `DEMO_MODE=true` and do not provide a `DATABASE_URL`. The app will use the graceful bypass integrated in `proxy.ts`.
