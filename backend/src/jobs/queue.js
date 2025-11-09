import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

// Create upload processing queue
export const uploadQueue = new Queue('upload-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600 // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 500 // Keep last 500 failed jobs for debugging
    }
  }
})

export default uploadQueue
