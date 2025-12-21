import Link from 'next/link'
import { IconType } from 'react-icons'
import { FaArrowRight } from 'react-icons/fa'

interface QuickActionCardProps {
  title: string
  description: string
  icon: IconType
  href: string
  variant?: 'default' | 'primary'
}

export default function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  href,
  variant = 'default'
}: QuickActionCardProps) {
  const variantClasses = {
    default: 'bg-white border-gray-200 hover:border-gray-300 group-hover:shadow-md',
    primary: 'bg-primary/5 border-primary/20 hover:border-primary/30 group-hover:shadow-md',
  }

  const iconColors = {
    default: 'text-gray-400 group-hover:text-primary',
    primary: 'text-primary',
  }

  return (
    <Link
      href={href}
      className={`block ${variantClasses[variant]} border rounded-xl p-6 transition-all duration-200 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gray-100 group-hover:bg-primary/10 rounded-lg flex items-center justify-center transition-colors`}>
          <Icon className={`text-xl ${iconColors[variant]}`} />
        </div>
        <FaArrowRight className="text-gray-400 group-hover:text-primary transition-colors" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500">
        {description}
      </p>
    </Link>
  )
}
