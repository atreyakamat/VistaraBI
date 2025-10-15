import express from 'express'
import axios from 'axios'

const router = express.Router()

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

// POST /api/chat - Send chat message
router.post('/', async (req, res) => {
  try {
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Forward to AI service
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
      message,
      context
    })

    res.json(response.data)
  } catch (error) {
    console.error('Chat error:', error.message)
    res.status(500).json({
      error: 'Chat service unavailable',
      message: 'Coming soon'
    })
  }
})

// GET /api/chat/history - Get chat history
router.get('/history', async (req, res) => {
  res.json({
    message: 'Chat history - Coming soon',
    history: []
  })
})

export default router
