#!/bin/sh
# docker-entrypoint.sh — Run Prisma migrations then start Next.js

set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🚀 Starting VistaraBI..."
exec node server.js
