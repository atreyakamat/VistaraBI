import ProgressBar from './ProgressBar'
import { Upload } from '../services/uploadApi'
import { useNavigate } from 'react-router-dom'

interface FileListItemProps {
  file: File
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'polling' | 'completed' | 'failed'
  uploadData?: Upload
  error?: string
  onRemove: () => void
  onRetry: () => void
}

export default function FileListItem({
  file,
  uploadProgress,
  uploadStatus,
  uploadData,
  error,
  onRemove,
  onRetry
}: FileListItemProps) {
  const navigate = useNavigate()
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'uploading':
      case 'polling':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'completed':
        return `Completed • ${uploadData?.recordsProcessed || 0} records`
      case 'failed':
        return error || 'Failed'
      case 'uploading':
        return `Uploading... ${uploadProgress}%`
      case 'polling':
        return `Processing... ${uploadData?.recordsProcessed || 0}/${uploadData?.totalRecords || 0} records`
      default:
        return 'Pending'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {uploadStatus === 'completed' && uploadData && (
            <>
              <button
                onClick={() => navigate(`/clean/${uploadData.id}`)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                title="Clean Data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Clean
              </button>
              <button
                onClick={() => navigate(`/data/${uploadData.id}`)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                title="View Data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
            </>
          )}
          {uploadStatus === 'failed' && (
            <button
              onClick={onRetry}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Retry
            </button>
          )}
          {(uploadStatus === 'pending' || uploadStatus === 'failed') && (
            <button
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
              title="Remove"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <ProgressBar progress={uploadProgress} status={uploadStatus} />
        <p className="text-xs text-gray-600">{getStatusText()}</p>
      </div>

      {uploadData?.tableName && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Table: <span className="font-mono text-gray-700">{uploadData.tableName}</span>
          </p>
        </div>
      )}
    </div>
  )
}
