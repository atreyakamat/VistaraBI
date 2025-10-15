import express from 'express'

const router = express.Router()

// GET /api/goals - Get all goals
router.get('/', async (req, res) => {
  res.json({
    message: 'Goals endpoint - Coming soon',
    goals: []
  })
})

// POST /api/goals - Create new goal
router.post('/', async (req, res) => {
  res.json({
    message: 'Create goal - Coming soon',
    goal: null
  })
})

// GET /api/goals/:id - Get specific goal
router.get('/:id', async (req, res) => {
  res.json({
    message: 'Get goal by ID - Coming soon',
    goalId: req.params.id
  })
})

export default router
