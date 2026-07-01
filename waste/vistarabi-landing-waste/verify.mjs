import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.update({
    where: { email: 'testbatch@examples.com' },
    data: { emailVerified: new Date() }
}).then(() => console.log('verified')).finally(()=>p.$disconnect());