import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Redis queue - optional for development
// Set REDIS_ENABLED=false in .env to disable queue functionality
let uploadQueue = null
let redisConnection = null

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'

if (REDIS_ENABLED) {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null
    })

    uploadQueue = new Queue('upload-processing', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { count: 500 }
      }
    })

    uploadQueue.on('error', (err) => {
      console.error('Upload queue error:', err)
    })

    console.log('✅ Redis queue initialized')
  } catch (error) {
    console.error('Failed to initialize Redis queue. Falling back to in-process execution.', error)
    uploadQueue = null
    if (redisConnection) {
      redisConnection.quit().catch(() => {})
      redisConnection = null
    }
  }
} else {
  console.log('ℹ️  Redis disabled via REDIS_ENABLED=false')
}

export { uploadQueue, redisConnection }
export default uploadQueue
