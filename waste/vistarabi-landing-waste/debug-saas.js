const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
    const p = await prisma.project.findFirst({ where: { name: { contains: 'saas' } } }); 
    if (!p) return console.log('no project'); 
    
    const kpis = await prisma.approvedKPI.findMany({ where: { blueprint: { projectId: p.id } } }); 
    console.log('KPIs:', kpis.map(k=>k.id)); 
    
    const dc = await prisma.dashboardConfig.findUnique({ where: { projectId: p.id } }); 
    console.log('Config exists:', !!dc); 
    if(dc) console.log('Config KPIs:', dc.sections[0].cards.map(c=>c.kpiId)); 
} 
main().then(()=>prisma.$disconnect());
