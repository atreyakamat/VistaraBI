interface ProgressBarProps {
  progress: number
  status: 'pending' | 'uploading' | 'polling' | 'completed' | 'failed'
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const getColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'uploading':
      case 'polling':
        return 'bg-blue-500'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${getColor()}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
