import express from 'express'

const router = express.Router()

// GET /api/kpis - Get all KPIs
router.get('/', async (req, res) => {
  res.json({
    message: 'KPIs endpoint - Coming soon',
    kpis: []
  })
})

// GET /api/kpis/:fileId - Get KPIs for a specific file
router.get('/:fileId', async (req, res) => {
  res.json({
    message: 'Get KPIs for file - Coming soon',
    fileId: req.params.fileId,
    kpis: []
  })
})

export default router
