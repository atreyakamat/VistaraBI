import { prisma } from '../server.js'
import { uploadQueue } from '../jobs/queue.js'
import { processFile, resolveFileKind } from '../services/fileProcessor.js'
import { getExtractedData } from '../services/excel.service.js'
import fs from 'fs'
import path from 'path'

function formatUpload(upload) {
  return {
    id: upload.id,
    fileName: upload.fileName,
    originalName: upload.originalName,
    fileType: upload.fileType,
    fileSize: upload.fileSize.toString(),
    filePath: upload.filePath,
    status: upload.status,
    recordsProcessed: upload.recordsProcessed,
    totalRecords: upload.totalRecords,
    tableName: upload.tableName,
    errorMessage: upload.errorMessage,
    metadata: upload.metadata,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
    completedAt: upload.completedAt
  }
}

// Upload a file
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file

    const detectedKind = resolveFileKind(originalname, mimetype)

    if (!detectedKind) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      return res.status(415).json({
        error: 'Unsupported file type',
        message: `Unsupported file format for ${originalname || path.basename(filePath)}`
      })
    }

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

    let jobId = null

    if (uploadQueue) {
      const job = await uploadQueue.add('process-upload', {
        uploadId: upload.id,
        filePath,
        originalName: originalname,
        mimeType: mimetype
      })
      jobId = job.id
    } else {
      ;(async () => {
        try {
          await processFile(upload.id, filePath, originalname, mimetype)
        } catch (error) {
          console.error('Background processing failed:', error)
        }
      })()
    }

    const uploadResponse = formatUpload(upload)

    res.status(202).json({
      ...uploadResponse,
      message: 'File uploaded successfully and is being processed',
      jobId,
      fileKind: detectedKind,
      note: uploadQueue
        ? 'Job queued for processing. Check status endpoint for updates.'
        : 'Processing without queue. Check status endpoint for updates.'
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

    // Delete database record (will cascade delete data_rows)
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

// Get extracted data from upload
export const getUploadData = async (req, res) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 100

    const result = await getExtractedData(id, page, limit)

    res.json(result)
  } catch (error) {
    console.error('Get upload data error:', error)
    res.status(500).json({ 
      error: 'Failed to get upload data',
      message: error.message 
    })
  }
}
