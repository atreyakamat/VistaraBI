import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { uploadApi, ExtractedData } from '../services/uploadApi'
import CleaningPanel from '../components/CleaningPanel'

export default function DataViewPage() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ExtractedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(50)

  useEffect(() => {
    if (uploadId) {
      loadData(uploadId, currentPage, limit)
    }
  }, [uploadId, currentPage, limit])

  const loadData = async (id: string, page: number, pageLimit: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await uploadApi.getUploadData(id, page, pageLimit)
      setData(result)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!data) return
    
    // Create CSV content
    const headers = data.upload.headers.join(',')
    const rows = data.data.map(row => {
      return data.upload.headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    }).join('\n')
    
    const csv = `${headers}\n${rows}`
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${data.upload.originalName.replace(/\.[^/.]+$/, '')}_extracted.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-lg font-semibold text-gray-900">Error Loading Data</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/upload')}
                className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Upload
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{data.upload.originalName}</h1>
              <p className="mt-2 text-sm text-gray-600">
                Viewing {data.pagination.totalRows} rows from database
                {data.upload.sheetName && ` • Sheet: ${data.upload.sheetName}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-600 font-medium">Total Rows</p>
              <p className="text-2xl font-bold text-blue-900">{data.pagination.totalRows}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Columns</p>
              <p className="text-2xl font-bold text-blue-900">{data.upload.headers.length}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Current Page</p>
              <p className="text-2xl font-bold text-blue-900">
                {data.pagination.page} / {data.pagination.totalPages}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Status</p>
              <p className="text-2xl font-bold text-green-600">
                {data.upload.status === 'completed' ? '✓ Complete' : data.upload.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cleaning Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CleaningPanel uploadId={uploadId!} />
      </div>

      {/* Data Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row #
                  </th>
                  {data.upload.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                      {row.rowNumber}
                    </td>
                    {data.upload.headers.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {row[header] !== null && row[header] !== undefined ? String(row[header]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={currentPage === data.pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * limit, data.pagination.totalRows)}
                    </span>{' '}
                    of <span className="font-medium">{data.pagination.totalRows}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                      let pageNum
                      if (data.pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= data.pagination.totalPages - 2) {
                        pageNum = data.pagination.totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={currentPage === data.pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
