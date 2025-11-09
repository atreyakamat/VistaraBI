import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { 
  uploadFile, 
  getUploadStatus, 
  getAllUploads,
  deleteUpload 
} from '../controllers/upload.controller.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

// File filter - accept specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/xml',
    'text/xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]

  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.xml', '.pdf', '.docx', '.pptx', '.txt']
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`File type not supported. Allowed types: ${allowedExtensions.join(', ')}`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1 GB limit
  }
})

// Routes
router.post('/', upload.single('file'), uploadFile)
router.get('/:id/status', getUploadStatus)
router.get('/', getAllUploads)
router.delete('/:id', deleteUpload)

export default router

