import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { redisConnection } from './jobs/queue.js'

// Import routes
import healthRoutes from './routes/health.js'
import uploadRoutes from './routes/upload.js'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 5000
const shouldStartServer = !process.env.VITEST_WORKER_ID

// Initialize Prisma
export const prisma = new PrismaClient()

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/v1/upload', uploadRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VistaraBI Backend API - Data Upload Module',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      upload: '/api/v1/upload',
      uploadStatus: '/api/v1/upload/:id/status',
      uploads: '/api/v1/uploads'
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  })
})

// Start server unless running inside Vitest
if (shouldStartServer) {
  app.listen(PORT, () => {
    console.log(`🚀 VistaraBI Backend running on port ${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV}`)
    console.log(`🔗 API available at: http://localhost:${PORT}`)
    console.log(`📁 Upload directory: ${uploadsDir}`)
  })
}

// Graceful shutdown
async function shutdown() {
  console.log('\n⏳ Shutting down gracefully...')
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting Prisma:', error)
  }

  if (redisConnection) {
    try {
      await redisConnection.quit()
    } catch (error) {
      console.error('Error closing Redis connection:', error)
    }
  }

  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
