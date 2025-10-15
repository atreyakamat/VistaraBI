import { useState, useEffect } from 'react'

function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<any>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setSystemStatus(data))
      .catch(err => console.error('Backend connection failed:', err))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome to VistaraBI</h2>
        <p className="mt-2 text-gray-600">Intelligent Business Analytics Platform</p>
      </div>

      {/* System Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        {systemStatus ? (
          <div className="space-y-2">
            <StatusRow label="Backend API" value={systemStatus.status || 'Unknown'} />
            <StatusRow label="Database" value={systemStatus.database || 'Unknown'} />
            <StatusRow label="Timestamp" value={new Date(systemStatus.timestamp).toLocaleString()} />
          </div>
        ) : (
          <p className="text-gray-500">Checking system status...</p>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="File Upload"
          description="Upload CSV, Excel, or PDF files for analysis"
          icon="📁"
          status="Ready"
        />
        <FeatureCard
          title="AI Domain Detection"
          description="Automatically detect your business domain"
          icon="🤖"
          status="Ready"
        />
        <FeatureCard
          title="KPI Extraction"
          description="Extract relevant KPIs from your data"
          icon="📊"
          status="Ready"
        />
        <FeatureCard
          title="Chat Interface"
          description="Ask questions about your data in natural language"
          icon="💬"
          status="Coming Soon"
        />
        <FeatureCard
          title="Goal Mapping"
          description="Set goals and get actionable insights"
          icon="🎯"
          status="Coming Soon"
        />
        <FeatureCard
          title="Report Export"
          description="Export beautiful PDF reports"
          icon="📄"
          status="Coming Soon"
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-primary-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-3">Quick Start</h3>
        <ol className="list-decimal list-inside space-y-2 text-primary-800">
          <li>Upload your business data file (CSV, Excel, or PDF)</li>
          <li>Let AI detect your business domain automatically</li>
          <li>Review extracted KPIs and insights</li>
          <li>Chat with your data to get answers</li>
          <li>Export reports to share with your team</li>
        </ol>
      </div>
    </div>
  )
}

interface StatusRowProps {
  label: string
  value: string
}

function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span className="text-sm text-gray-900 font-semibold">{value}</span>
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  status: string
}

function FeatureCard({ title, description, icon, status }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{icon}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'Ready' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {status}
        </span>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default Dashboard
