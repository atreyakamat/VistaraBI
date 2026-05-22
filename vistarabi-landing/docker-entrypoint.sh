#!/bin/sh

echo "⏳ Running Prisma migrations..."

npx prisma@6.0.0 generate
npx prisma@6.0.0 migrate deploy

echo "🚀 Starting app..."

node server.js