import { IconType } from 'react-icons'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: IconType
  variant?: 'default' | 'primary' | 'success' | 'warning'
}

export default function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  variant = 'default'
}: KPICardProps) {
  const variantClasses = {
    default: 'bg-white border-gray-200',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
  }

  const iconColors = {
    default: 'text-gray-400',
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-amber-600',
  }

  return (
    <div className={`${variantClasses[variant]} border rounded-xl p-6 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {Icon && (
          <Icon className={`text-xl ${iconColors[variant]}`} />
        )}
      </div>
      
      <div className="mb-1">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}
