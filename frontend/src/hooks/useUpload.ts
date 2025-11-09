import { useState, useCallback } from 'react'
import { uploadApi, Upload } from '../services/uploadApi'

interface FileWithProgress {
  file: File
  id: string
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'polling' | 'completed' | 'failed'
  uploadData?: Upload
  error?: string
}

export function useUpload() {
  const [files, setFiles] = useState<FileWithProgress[]>([])

  const addFiles = useCallback((newFiles: File[]) => {
    const filesWithProgress: FileWithProgress[] = newFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      uploadProgress: 0,
      uploadStatus: 'pending'
    }))
    
    setFiles((prev: FileWithProgress[]) => [...prev, ...filesWithProgress])
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev: FileWithProgress[]) => prev.filter((f: FileWithProgress) => f.id !== fileId))
  }, [])

  const uploadFile = useCallback(async (fileId: string) => {
    const fileItem = files.find((f: FileWithProgress) => f.id === fileId)
    if (!fileItem) return

    try {
      // Update status to uploading
      setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
        f.id === fileId 
          ? { ...f, uploadStatus: 'uploading' as const }
          : f
      ))

      // Upload file
      const uploadData = await uploadApi.uploadFile(
        fileItem.file,
        (progress) => {
          setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
            f.id === fileId 
              ? { ...f, uploadProgress: progress }
              : f
          ))
        }
      )

      // Update with upload data and start polling
      setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
        f.id === fileId 
          ? { 
              ...f, 
              uploadProgress: 100,
              uploadStatus: 'polling' as const,
              uploadData
            }
          : f
      ))

      // Poll for status
      pollUploadStatus(fileId, uploadData.id)

    } catch (error: any) {
      setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
        f.id === fileId 
          ? { 
              ...f, 
              uploadStatus: 'failed' as const,
              error: error.response?.data?.message || error.message || 'Upload failed'
            }
          : f
      ))
    }
  }, [files])

  const pollUploadStatus = useCallback((fileId: string, uploadId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await uploadApi.getUploadStatus(uploadId)
        
        setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
          f.id === fileId 
            ? { ...f, uploadData: status }
            : f
        ))

        if (status.status === 'completed') {
          setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
            f.id === fileId 
              ? { ...f, uploadStatus: 'completed' as const }
              : f
          ))
          clearInterval(interval)
        } else if (status.status === 'failed') {
          setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
            f.id === fileId 
              ? { 
                  ...f, 
                  uploadStatus: 'failed' as const,
                  error: status.errorMessage || 'Processing failed'
                }
              : f
          ))
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Polling error:', error)
        clearInterval(interval)
      }
    }, 2000) // Poll every 2 seconds
  }, [])

  const uploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f: FileWithProgress) => f.uploadStatus === 'pending')
    
    // Upload 3 files at a time
    const concurrency = 3
    for (let i = 0; i < pendingFiles.length; i += concurrency) {
      const batch = pendingFiles.slice(i, i + concurrency)
      await Promise.all(batch.map((f: FileWithProgress) => uploadFile(f.id)))
    }
  }, [files, uploadFile])

  const retryUpload = useCallback((fileId: string) => {
    setFiles((prev: FileWithProgress[]) => prev.map((f: FileWithProgress) => 
      f.id === fileId 
        ? { 
            ...f, 
            uploadProgress: 0,
            uploadStatus: 'pending' as const,
            error: undefined
          }
        : f
    ))
  }, [])

  return {
    files,
    addFiles,
    removeFile,
    uploadFile,
    uploadAll,
    retryUpload
  }
}
