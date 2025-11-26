import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import DataViewPage from './pages/DataViewPage'
import CleaningConfigPage from './pages/CleaningConfigPage'
import CleaningReportPage from './pages/CleaningReportPage'
import DomainDetectionPage from './pages/DomainDetectionPage'
import KpiSelectionPage from './pages/KpiSelectionPage'
import DashboardViewPage from './pages/DashboardViewPage'
import ProjectUploadPage from './pages/ProjectUploadPage'
import ProjectResultsPage from './pages/ProjectResultsPage'
import ProjectCleaningPage from './pages/ProjectCleaningPage'
import ProjectDomainDetectionPage from './pages/ProjectDomainDetectionPage'
import ProjectRelationshipsPage from './pages/ProjectRelationshipsPage'
import ProjectKpiSelectionPage from './pages/ProjectKpiSelectionPage'
import ProjectDashboardPage from './pages/ProjectDashboardPage'
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
            <Route path="/project/upload" element={<ProjectUploadPage />} />
            <Route path="/project/:projectId/results" element={<ProjectResultsPage />} />
            <Route path="/project/:projectId/clean" element={<ProjectCleaningPage />} />
            <Route path="/project/:projectId/domain" element={<ProjectDomainDetectionPage />} />
            <Route path="/project/:projectId/relationships" element={<ProjectRelationshipsPage />} />
            <Route path="/project/:projectId/kpi" element={<ProjectKpiSelectionPage />} />
            <Route path="/project/:projectId/domain" element={<ProjectDomainDetectionPage />} />
            <Route path="/project/:projectId/kpi" element={<ProjectKpiSelectionPage />} />
            <Route path="/project/:projectId/dashboard" element={<ProjectDashboardPage />} />
            <Route path="/data/:uploadId" element={<DataViewPage />} />
            <Route path="/clean/:uploadId" element={<CleaningConfigPage />} />
            <Route path="/cleaning/:jobId/report" element={<CleaningReportPage />} />
            <Route path="/domain/:jobId" element={<DomainDetectionPage />} />
            <Route path="/kpi/:domainJobId" element={<KpiSelectionPage />} />
            <Route path="/dashboard/:datasetId" element={<DashboardViewPage />} />
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

