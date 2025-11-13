import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Redis queue - optional for development
// Set REDIS_ENABLED=true in .env to enable queue functionality
let uploadQueue = null
let redisConnection = null

function isRedisEnabled() {
  const raw = process.env.REDIS_ENABLED
  if (!raw) {
    return false
  }
  return raw.toLowerCase() === 'true'
}

const REDIS_ENABLED = isRedisEnabled()

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
  console.log('ℹ️  Redis disabled (set REDIS_ENABLED=true to enable queue processing)')
}

export { uploadQueue, redisConnection }
export default uploadQueue
