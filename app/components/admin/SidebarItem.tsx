'use client'

import Link from 'next/link'
import { IconType } from 'react-icons'
import { motion } from 'framer-motion'

interface SidebarItemProps {
  href: string
  icon: IconType
  label: string
  isActive: boolean
  isCollapsed: boolean
  onClick?: () => void
}

export default function SidebarItem({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: SidebarItemProps) {
  const baseClasses = 'flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative'
  const activeClasses = isActive
    ? 'bg-primary text-white shadow-sm'
    : 'text-gray-700 hover:bg-gray-100'

  const content = (
    <>
      <Icon className={`text-xl flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-primary'}`} />
      
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="ml-3 font-medium whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}

      {/* Tooltip au hover quand collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
          {label}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </>
  )

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      {content}
    </Link>
  )
}
