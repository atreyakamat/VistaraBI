import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface DragDropZoneProps {
  onFilesAdded: (files: File[]) => void
  disabled?: boolean
}

export default function DragDropZone({ onFilesAdded, disabled }: DragDropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles)
  }, [onFilesAdded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt']
    },
    maxSize: 1024 * 1024 * 1024, // 1 GB
    multiple: true
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12
        flex flex-col items-center justify-center
        cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400 bg-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <svg 
        className="w-16 h-16 text-gray-400 mb-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
        />
      </svg>

      {isDragActive ? (
        <p className="text-lg font-medium text-blue-600">Drop files here...</p>
      ) : (
        <>
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drag & drop files here, or click to select
          </p>
          <p className="text-sm text-gray-500">
            Supports: CSV, Excel, JSON, XML, PDF, DOCX, PPTX, TXT (up to 1 GB)
          </p>
        </>
      )}
    </div>
  )
}
