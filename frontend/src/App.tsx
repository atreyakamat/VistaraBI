import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import DataViewPage from './pages/DataViewPage'
import { UploadProvider } from './hooks/useUpload'

function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    // Check backend health
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  return (
    <Router>
      <UploadProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Status Bar */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-blue-600">VistaraBI</h1>
                <div className="flex items-center gap-4">
                  <StatusIndicator label="Backend" status={backendStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/data/:uploadId" element={<DataViewPage />} />
          </Routes>
        </div>
      </UploadProvider>
    </Router>
  )
}

interface StatusIndicatorProps {
  label: string
  status: 'checking' | 'online' | 'offline'
}

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const getColor = () => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className={`w-2 h-2 rounded-full ${getColor()}`} />
    </div>
  )
}

export default App

