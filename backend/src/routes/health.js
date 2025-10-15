import express from 'express'
import { prisma } from '../server.js'

const router = express.Router()

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    res.json({
      status: 'ok',
      message: 'VistaraBI Backend is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        backend: 'operational',
        database: 'operational'
      }
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    })
  }
})

export default router
