import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function UploadPage() {
  const navigate = useNavigate()

  // Redirect to project upload page - we only use project-based workflow
  useEffect(() => {
    navigate('/project/upload')
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to project upload...</p>
      </div>
    </div>
  )
}
