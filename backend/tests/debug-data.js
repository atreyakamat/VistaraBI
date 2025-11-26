import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cleaningJobId = 'f91440dc-d399-47fd-9902-764e7fc1bc7e';

async function debug() {
  try {
    const job = await prisma.cleaningJob.findUnique({
      where: { id: cleaningJobId }
    });
    
    console.log('Cleaning job:', JSON.stringify(job, null, 2));
    
    const data = await prisma.cleanedData.findFirst({
      where: { tableName: job.cleanedTableName }
    });
    
    console.log('\nCleaned data:');
    console.log('- Columns:', data?.columns);
    console.log('- Data rows:', data?.data?.length);
    console.log('- First row:', data?.data?.[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
