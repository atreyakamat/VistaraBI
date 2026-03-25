import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { redisConnection } from './jobs/queue.js'

// Import rate limiting middleware
import { apiLimiter, uploadLimiter, processingLimiter } from './middleware/rateLimiter.js'

// Import routes
import healthRoutes from './routes/health.js'
import uploadRoutes from './routes/upload.js'
import cleaningRoutes from './routes/cleaning.routes.js'
import domainRoutes from './routes/domain.routes.js'
import kpiRoutes from './routes/kpi.routes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import testRoutes from './routes/testRoutes.js'

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

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter)

// Routes with specific rate limiting
app.use('/api/health', healthRoutes) // Health check excluded from rate limiting
app.use('/api/v1/upload', uploadLimiter, uploadRoutes) // Stricter limit for uploads
app.use('/api/v1/clean', processingLimiter, cleaningRoutes) // Limit for data processing
app.use('/api/v1/domain', processingLimiter, domainRoutes) // Limit for domain detection
app.use('/api/v1/kpi', processingLimiter, kpiRoutes) // Limit for KPI extraction
app.use('/api/dashboard', dashboardRoutes) // Uses general API limiter
app.use('/api/projects', projectRoutes) // Uses general API limiter
app.use('/api/test', testRoutes) // Uses general API limiter

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
