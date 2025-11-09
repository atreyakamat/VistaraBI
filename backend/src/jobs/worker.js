import { Worker } from 'bullmq'
import Redis from 'ioredis'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { processFile } from '../services/fileProcessor.js'

dotenv.config()

const prisma = new PrismaClient()

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

// Create worker
const worker = new Worker(
  'upload-processing',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`)
    const { uploadId, filePath, fileName, fileType } = job.data

    try {
      await processFile(uploadId, filePath, fileName, fileType)
      return { success: true }
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)
      throw error
    }
  },
  {
    connection,
    concurrency: 3, // Process 3 files concurrently
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
)

// Worker event listeners
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

console.log('🔄 Upload worker started')
console.log('📡 Listening for upload jobs...')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down worker...')
  await worker.close()
  await connection.quit()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⏳ Shutting down worker...')
  await worker.close()
  await connection.quit()
  await prisma.$disconnect()
  process.exit(0)
})
