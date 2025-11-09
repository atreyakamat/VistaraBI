import axios, { AxiosProgressEvent } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface Upload {
  id: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: string
  filePath: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  recordsProcessed: number
  totalRecords: number
  tableName?: string
  errorMessage?: string
  metadata?: any
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export const uploadApi = {
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<Upload> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(`${API_URL}/api/v1/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })

    return response.data
  },

  async getUploadStatus(uploadId: string): Promise<Upload> {
    const response = await axios.get(`${API_URL}/api/v1/upload/${uploadId}/status`)
    return response.data
  },

  async getAllUploads(): Promise<Upload[]> {
    const response = await axios.get(`${API_URL}/api/v1/upload`)
    return response.data
  },

  async deleteUpload(uploadId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/v1/upload/${uploadId}`)
  }
}
