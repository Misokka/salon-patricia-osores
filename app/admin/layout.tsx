'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Sidebar from '@/app/components/admin/Sidebar'
import NavbarAdmin from '@/app/components/admin/NavbarAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fermer le menu mobile quand la route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Empêcher le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Si on est sur la page de login, ne pas afficher le layout admin
  const isLoginPage = pathname === '/admin/login'
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile: Navbar + Sidebar off-canvas */}
      <div className="lg:hidden">
        <NavbarAdmin onMenuClick={() => setMobileMenuOpen(true)} />
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          isMobile={true}
        />
        <main className="p-4">
          {children}
        </main>
      </div>

      {/* Desktop: Sidebar fixe + Contenu */}
      <div className="hidden lg:block">
        <Sidebar isMobile={false} />
        {/* Contenu avec marge pour compenser la sidebar fixe */}
        <main className="min-h-screen bg-gray-50 p-8 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
