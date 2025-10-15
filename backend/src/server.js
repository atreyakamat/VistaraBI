import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'

// Import routes
import healthRoutes from './routes/health.js'
import uploadRoutes from './routes/upload.js'
import filesRoutes from './routes/files.js'
import kpisRoutes from './routes/kpis.js'
import goalsRoutes from './routes/goals.js'
import chatRoutes from './routes/chat.js'
import exportRoutes from './routes/export.js'

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 5000

// Initialize Prisma
export const prisma = new PrismaClient()

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
app.use('/api/upload', uploadRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/kpis', kpisRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/export', exportRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VistaraBI Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      upload: '/api/upload',
      files: '/api/files',
      kpis: '/api/kpis',
      goals: '/api/goals',
      chat: '/api/chat',
      export: '/api/export'
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VistaraBI Backend running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔗 API available at: http://localhost:${PORT}`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})
