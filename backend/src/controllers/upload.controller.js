import { prisma } from '../server.js'
import { uploadQueue } from '../jobs/queue.js'
import fs from 'fs'

// Upload a file
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file

    // Create upload record in database
    const upload = await prisma.upload.create({
      data: {
        fileName: filename,
        originalName: originalname,
        fileType: mimetype,
        fileSize: BigInt(size),
        filePath: filePath,
        status: 'queued'
      }
    })

    // Add job to queue for processing
    await uploadQueue.add('process-upload', {
      uploadId: upload.id,
      filePath: filePath,
      fileName: filename,
      fileType: mimetype
    })

    // Return upload ID immediately
    res.status(202).json({
      message: 'File uploaded successfully and queued for processing',
      uploadId: upload.id,
      fileName: originalname,
      fileSize: size,
      status: 'queued'
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    })
  }
}

// Get upload status
export const getUploadStatus = async (req, res) => {
  try {
    const { id } = req.params

    const upload = await prisma.upload.findUnique({
      where: { id }
    })

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' })
    }

    // Convert BigInt to string for JSON serialization
    const uploadData = {
      ...upload,
      fileSize: upload.fileSize.toString()
    }

    res.json(uploadData)
  } catch (error) {
    console.error('Get status error:', error)
    res.status(500).json({ 
      error: 'Failed to get upload status',
      message: error.message 
    })
  }
}

// Get all uploads
export const getAllUploads = async (req, res) => {
  try {
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 most recent
    })

    // Convert BigInt to string for JSON serialization
    const uploadsData = uploads.map(upload => ({
      ...upload,
      fileSize: upload.fileSize.toString()
    }))

    res.json(uploadsData)
  } catch (error) {
    console.error('Get uploads error:', error)
    res.status(500).json({ 
      error: 'Failed to get uploads',
      message: error.message 
    })
  }
}

// Delete upload
export const deleteUpload = async (req, res) => {
  try {
    const { id } = req.params

    const upload = await prisma.upload.findUnique({
      where: { id }
    })

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' })
    }

    // Delete file from disk if exists
    if (fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath)
    }

    // Delete database record
    await prisma.upload.delete({
      where: { id }
    })

    res.json({ message: 'Upload deleted successfully' })
  } catch (error) {
    console.error('Delete upload error:', error)
    res.status(500).json({ 
      error: 'Failed to delete upload',
      message: error.message 
    })
  }
}
