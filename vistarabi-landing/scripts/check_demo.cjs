const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const user = await p.user.findUnique({ where: { email: 'demo@vistara.com' }, select: { id: true, email: true, name: true, createdAt: true } });
  console.log('User:', JSON.stringify(user, null, 2));
  const projects = await p.project.findMany({ where: { user: { email: 'demo@vistara.com' } }, select: { id: true, name: true, createdAt: true } });
  console.log('Projects:', JSON.stringify(projects, null, 2));
  await p.$disconnect();
}
main();
