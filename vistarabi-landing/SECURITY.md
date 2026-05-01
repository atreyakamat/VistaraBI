# Security & Secrets Management

## Overview

This document outlines best practices for managing secrets and sensitive configuration in VistaraBI.

## Environment Files

### `.env` - Shared Configuration
- Contains **non-sensitive** configuration values
- Safe to commit to version control
- Updated only when adding new environment variables
- Used by all team members and CI/CD

### `.env.local` - Local Secrets (⚠️ Never commit)
- Contains **sensitive** values: API keys, passwords, secrets
- Automatically ignored by git (see `.gitignore`)
- Should only exist on local machines and secure deployment systems
- Each developer/system needs their own `.env.local`

### `.env.local.example` - Documentation
- Template showing which secrets to configure locally
- Safe to commit to version control
- Helps new developers understand what to set up

## Setup Instructions

### For Local Development

1. Copy the template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in actual values in `.env.local`:
   ```bash
   # .env.local
   CLOUD_AI_API_KEY=your-actual-key-here
   JWT_SECRET=your-dev-secret
   ```

3. The application will automatically merge `.env` + `.env.local`
   - `.env.local` values override `.env` values

### For Production Deployment

1. Set environment variables on the hosting platform:
   - Vercel: Dashboard → Settings → Environment Variables
   - Docker: Use `docker run -e KEY=value`
   - Kubernetes: Use secrets/configmaps
   - AWS: Use AWS Secrets Manager or Systems Manager Parameter Store

2. Never use `.env.local` in production - use platform-specific secret management

## Security Checklist

- ✅ `.env` committed - non-sensitive config only
- ✅ `.env.local` gitignored - never committed
- ✅ API keys in `.env.local` or platform secrets
- ✅ JWT/NEXTAUTH secrets rotated in production
- ✅ Database credentials in `.env.local` or platform secrets
- ✅ All team members have `.env.local` locally
- ✅ CI/CD uses environment variables, not `.env.local`

## Current Status

| Variable | Current Location | Action |
|----------|------------------|--------|
| OLLAMA_URL | `.env` | ✅ Non-sensitive |
| OLLAMA_MODEL | `.env` | ✅ Non-sensitive |
| CLOUD_AI_API_KEY | **Removed** | ✅ Use `.env.local` |
| CLOUD_AI_BASE_URL | `.env` | ✅ Non-sensitive |
| JWT_SECRET | `.env` (dev) | ⚠️ Change for production |
| NEXTAUTH_SECRET | `.env` (dev) | ⚠️ Change for production |
| DATABASE_URL | `.env` (local) | ✅ Override in `.env.local` for custom DB |

## Future Improvements

- [ ] Add GitHub Actions secret scanning to CI/CD
- [ ] Implement secret rotation for production deployments
- [ ] Add audit logging for secret access
- [ ] Document production secret setup per platform
