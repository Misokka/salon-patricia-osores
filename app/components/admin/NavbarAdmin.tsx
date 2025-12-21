'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaBars } from 'react-icons/fa'
import { salonConfig } from '@/config/salon.config'

interface NavbarAdminProps {
  onMenuClick: () => void
}

const NAVBAR_HEIGHT = 64 // adapte si tu changes le padding

export default function NavbarAdmin({ onMenuClick }: NavbarAdminProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navbarUi = (
    <header
      className="
        fixed top-0 inset-x-0 z-50
        bg-white border-b border-gray-200 shadow-sm
        lg:hidden
      "
      style={{ height: NAVBAR_HEIGHT }}
    >
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo + nom du salon */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
            {salonConfig.identity.shortName.charAt(0)}
          </div>
          <div className="leading-tight">
            <h2 className="text-base font-brand font-semibold text-dark">
              {salonConfig.identity.shortName}
            </h2>
            <p className="text-xs text-gray-500">Administration</p>
          </div>
        </div>

        {/* Burger menu */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          aria-label="Ouvrir le menu"
        >
          <FaBars className="text-xl text-dark" />
        </button>
      </div>
    </header>
  )

  return (
    <>
      {/* Spacer obligatoire pour éviter que le contenu passe sous la navbar */}
      <div className="lg:hidden" style={{ height: NAVBAR_HEIGHT }} />

      {/* Portal = FIXED vraiment fixed même avec des transforms */}
      {mounted ? createPortal(navbarUi, document.body) : null}
    </>
  )
}
