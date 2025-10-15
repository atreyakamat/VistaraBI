// File Upload Types
export interface FileUpload {
  id: string
  fileName: string
  fileType: string
  status: 'uploading' | 'uploaded' | 'cleaning' | 'cleaned' | 'processed' | 'error'
  uploadedAt: Date
}

// Placeholder for future implementation
