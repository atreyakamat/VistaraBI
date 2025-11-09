import { useUpload } from '../hooks/useUpload'
import DragDropZone from '../components/DragDropZone'
import FileListItem from '../components/FileListItem'

interface FileWithProgress {
  file: File
  id: string
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'polling' | 'completed' | 'failed'
  uploadData?: any
  error?: string
}

export default function UploadPage() {
  const { files, addFiles, removeFile, uploadAll, retryUpload } = useUpload()

  const pendingCount = (files as FileWithProgress[]).filter((f: FileWithProgress) => f.uploadStatus === 'pending').length
  const uploadingCount = (files as FileWithProgress[]).filter((f: FileWithProgress) => f.uploadStatus === 'uploading' || f.uploadStatus === 'polling').length
  const completedCount = (files as FileWithProgress[]).filter((f: FileWithProgress) => f.uploadStatus === 'completed').length
  const failedCount = (files as FileWithProgress[]).filter((f: FileWithProgress) => f.uploadStatus === 'failed').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Data Upload</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload your data files to Vistara BI for analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload Zone */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Files
              </h2>
              <DragDropZone 
                onFilesAdded={addFiles}
                disabled={uploadingCount > 0}
              />
              
              {pendingCount > 0 && (
                <div className="mt-4">
                  <button
                    onClick={uploadAll}
                    disabled={uploadingCount > 0}
                    className={`
                      w-full px-4 py-2 rounded-lg font-medium
                      transition-colors
                      ${uploadingCount > 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Upload Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{uploadingCount}</div>
                  <div className="text-xs text-gray-600">Processing</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - File List */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Files ({files.length})
              </h2>
              
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500">No files uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add files using the upload zone</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {files.map((fileItem) => (
                    <FileListItem
                      key={fileItem.id}
                      file={fileItem.file}
                      uploadProgress={fileItem.uploadProgress}
                      uploadStatus={fileItem.uploadStatus}
                      uploadData={fileItem.uploadData}
                      error={fileItem.error}
                      onRemove={() => removeFile(fileItem.id)}
                      onRetry={() => retryUpload(fileItem.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
