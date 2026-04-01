interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100)
  
  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 overflow-hidden ${className || ''}`}>
      <div
        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out rounded-full"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}

