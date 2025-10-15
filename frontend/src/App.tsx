import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'

function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    // Check backend health
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))

    // Check AI service health
    fetch('http://localhost:8000')
      .then(res => res.json())
      .then(() => setAiStatus('online'))
      .catch(() => setAiStatus('offline'))
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Status Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-primary-600">VistaraBI</h1>
              <div className="flex items-center gap-4">
                <StatusIndicator label="Backend" status={backendStatus} />
                <StatusIndicator label="AI Service" status={aiStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

interface StatusIndicatorProps {
  label: string
  status: 'checking' | 'online' | 'offline'
}

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const colors = {
    checking: 'bg-yellow-400',
    online: 'bg-green-400',
    offline: 'bg-red-400'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{label}:</span>
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-gray-500 capitalize">{status}</span>
    </div>
  )
}

export default App
