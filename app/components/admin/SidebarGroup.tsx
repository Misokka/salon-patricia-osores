'use client'

import { useState } from 'react'
import { IconType } from 'react-icons'
import { FaChevronDown } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface SidebarGroupItem {
  label: string
  href: string
  isActive: boolean
}

interface SidebarGroupProps {
  icon: IconType
  label: string
  items: SidebarGroupItem[]
  isCollapsed: boolean
  defaultOpen?: boolean
}

export default function SidebarGroup({
  icon: Icon,
  label,
  items,
  isCollapsed,
  defaultOpen = false,
}: SidebarGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const hasActiveItem = items.some((item) => item.isActive)

  const handleToggle = () => {
    if (!isCollapsed) {
      setIsOpen(!isOpen)
    }
  }

  const baseClasses = 'flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group relative'
  const activeClasses = hasActiveItem
    ? 'bg-primary/10 text-primary'
    : 'text-gray-700 hover:bg-gray-100'

  return (
    <div>
      {/* En-tête du groupe */}
      <div onClick={handleToggle} className={`${baseClasses} ${activeClasses}`}>
        <div className="flex items-center">
          <Icon className={`text-xl flex-shrink-0 ${hasActiveItem ? 'text-primary' : 'text-gray-600 group-hover:text-primary'}`} />
          
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
        </div>

        {!isCollapsed && (
          <FaChevronDown
            className={`text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}

        {/* Tooltip au hover quand collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
            {label}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Sous-items */}
      {!isCollapsed && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-1 space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      item.isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current mr-3 opacity-50"></span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
