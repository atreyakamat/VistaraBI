#!/bin/sh

echo "⏳ Running Prisma migrations..."

npx prisma generate
npx prisma migrate deploy

echo "🚀 Starting app..."

node server.js