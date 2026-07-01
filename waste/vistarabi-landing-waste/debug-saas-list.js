const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const ps = await prisma.project.findMany({ where: { name: { contains: 'saas', mode: 'insensitive' } } });
    console.log(ps.map(p=>p.name + ' - ' + p.id));
}
main().then(()=>prisma.$disconnect());
