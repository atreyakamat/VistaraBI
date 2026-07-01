import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import http from 'http';

const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findUnique({ where: { email: 'testbatch@examples.com' } });
    if (!user) return console.error('User not found');

    const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'vistarabi-secret-key-change-in-production'
    );

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/projects/fb22b21b-0ea1-428d-8d03-2cbd9c989af6/dashboard',
        method: 'POST',
        headers: { 'Cookie': `vistarabi-token=${token}` }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Body: ${data}`);
        });
    });

    req.on('error', e => console.error(`Error: ${e.message}`));
    req.end();
}

run().finally(() => prisma.$disconnect());
