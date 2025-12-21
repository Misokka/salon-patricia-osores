'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaChartLine, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaCut, 
  FaListUl,
  FaImage,
  FaClock,
  FaHome,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import { salonConfig } from '@/config/salon.config'
import SidebarItem from './SidebarItem'
import SidebarGroup from './SidebarGroup'
import LogoutModal from './LogoutModal'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

export default function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    if (loggingOut) return
    
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await new Promise((resolve) => setTimeout(resolve, 300))
      router.push('/admin/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      alert('Erreur lors de la déconnexion')
    } finally {
      setLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'

  // Desktop: sidebar fixe
  if (!isMobile) {
    // Exposer la largeur de la sidebar via CSS variable
    useEffect(() => {
      document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '256px')
    }, [isCollapsed])

    return (
      <aside className={`${sidebarWidth} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed left-0 top-0 h-screen z-30 overflow-visible`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {salonConfig.identity.shortName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-lg font-brand font-semibold text-dark truncate">
                  {salonConfig.identity.shortName}
                </h2>
                <p className="text-xs text-gray-500">Administration</p>
              </div>
            </motion.div>
          ) : (
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
              {salonConfig.identity.shortName.charAt(0)}
            </div>
          )}
        </div>

        {/* Bouton toggle collapse - dépasse de la sidebar */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-md z-50"
          aria-label={isCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"}
        >
          {isCollapsed ? (
            <FaChevronRight className="text-xs text-gray-600" />
          ) : (
            <FaChevronLeft className="text-xs text-gray-600" />
          )}
        </button>

        {/* Navigation - scrollable indépendamment */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <SidebarItem
            href="/admin"
            icon={FaChartLine}
            label="Tableau de bord"
            isActive={pathname === '/admin'}
            isCollapsed={isCollapsed}
          />

          <SidebarItem
            href="/admin/agenda"
            icon={FaCalendarAlt}
            label="Calendrier"
            isActive={pathname === '/admin/agenda'}
            isCollapsed={isCollapsed}
           />

          <SidebarGroup
            icon={FaClipboardList}
            label="Rendez-vous"
            isCollapsed={isCollapsed}
            defaultOpen={pathname.startsWith('/admin/rendezvous') || pathname.startsWith('/admin/disponibilites')}
            items={[
              { label: 'Gestion des rendez-vous', href: '/admin/rendezvous', isActive: pathname === '/admin/rendezvous' },
              { label: 'Disponibilités', href: '/admin/disponibilites', isActive: pathname === '/admin/disponibilites' },
            ]}
          />

          <SidebarGroup
            icon={FaClock}
            label="Horaires"
            isCollapsed={isCollapsed}
            defaultOpen={pathname.startsWith('/admin/horaires') || pathname.startsWith('/admin/disponibilites')}
            items={[
              { label: "Horaires du salon", href: '/admin/horaires/ouverture', isActive: pathname === '/admin/horaires/ouverture' },
              { label: 'Horaires exceptionnels', href: '/admin/horaires/exceptionnels', isActive: pathname === '/admin/horaires/exceptionnels' },
            ]}
          />

          <SidebarGroup
            icon={FaCut}
            label="Services"
            isCollapsed={isCollapsed}
            defaultOpen={pathname.startsWith('/admin/services')}
            items={[
              { label: 'Gestion des services', href: '/admin/services', isActive: pathname === '/admin/services' },
              { label: 'Images services favoris', href: '/admin/services/images', isActive: pathname === '/admin/services/images' },
            ]}
          />

          <SidebarGroup
            icon={FaImage}
            label="Images"
            isCollapsed={isCollapsed}
            defaultOpen={pathname.startsWith('/admin/images')}
            items={[
              { label: 'Image À propos', href: '/admin/images/about', isActive: pathname === '/admin/images/about' },
              { label: 'Galerie des réalisations', href: '/admin/images/galerie', isActive: pathname === '/admin/images/galerie' },
            ]}
          />

          
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0 mt-auto">
          <button
            onClick={() => router.push('/')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start space-x-2'} px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors group relative`}
          >
            <FaHome className="text-lg" />
            {!isCollapsed && <span className="font-medium">Voir le site</span>}
            
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                Voir le site
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            disabled={loggingOut}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start space-x-2'} px-4 py-3 text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative`}
          >
            <FaSignOutAlt className="text-lg" />
            {!isCollapsed && <span className="font-medium">Déconnexion</span>}
            
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                Déconnexion
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </button>
        </div>

        {/* Modale de confirmation déconnexion */}
        <LogoutModal
          isOpen={showLogoutModal}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
          isLoading={loggingOut}
        />
      </aside>
    )
  }

  // Mobile: sidebar off-canvas
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {salonConfig.identity.shortName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-brand font-semibold text-dark">
                    {salonConfig.identity.shortName}
                  </h2>
                  <p className="text-xs text-gray-500">Administration</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <SidebarItem
                href="/admin"
                icon={FaChartLine}
                label="Tableau de bord"
                isActive={pathname === '/admin'}
                isCollapsed={false}
                onClick={onClose}
              />

              <SidebarItem
                href="/admin/agenda"
                icon={FaCalendarAlt}
                label="Calendrier"
                isActive={pathname === '/admin/agenda'}
                isCollapsed={false}
                onClick={onClose}
              />

              <SidebarGroup
                icon={FaCalendarAlt}
                label="Rendez-vous"
                isCollapsed={false}
                defaultOpen={pathname.startsWith('/admin/rendezvous') || pathname.startsWith('/admin/disponibilites')}
                items={[
                  { label: 'Gestion des rendez-vous', href: '/admin/rendezvous', isActive: pathname === '/admin/rendezvous' },
                  { label: 'Disponibilités', href: '/admin/disponibilites', isActive: pathname === '/admin/disponibilites' },
                ]}
              />

              <SidebarGroup
                icon={FaClock}
                label="Horaires"
                isCollapsed={false}
                defaultOpen={pathname.startsWith('/admin/horaires') || pathname.startsWith('/admin/disponibilites')}
                items={[
                  { label: "Horaires du salon", href: '/admin/horaires/ouverture', isActive: pathname === '/admin/horaires/ouverture' },
                  { label: 'Horaires exceptionnels', href: '/admin/horaires/exceptionnels', isActive: pathname === '/admin/horaires/exceptionnels' },
                ]}
              />

              <SidebarGroup
                icon={FaCut}
                label="Services"
                isCollapsed={false}
                defaultOpen={pathname.startsWith('/admin/services')}
                items={[
                  { label: 'Gestion des services', href: '/admin/services', isActive: pathname === '/admin/services' },
                  { label: 'Images services favoris', href: '/admin/services/images', isActive: pathname === '/admin/services/images' },
                ]}
              />

              <SidebarGroup
                icon={FaImage}
                label="Images"
                isCollapsed={false}
                defaultOpen={pathname.startsWith('/admin/images')}
                items={[
                  { label: 'Image principale', href: '/admin/images/about', isActive: pathname === '/admin/images/about' },
                  { label: 'Galerie des réalisations', href: '/admin/images/galerie', isActive: pathname === '/admin/images/galerie' },
                ]}
              />

              
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  onClose?.()
                  router.push('/')
                }}
                className="w-full flex items-center justify-start space-x-2 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaHome />
                <span className="font-medium">Voir le site</span>
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                disabled={loggingOut}
                className="w-full flex items-center justify-start space-x-2 px-4 py-3 text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSignOutAlt />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </motion.aside>

          {/* Modale de confirmation déconnexion */}
          <LogoutModal
            isOpen={showLogoutModal}
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
            isLoading={loggingOut}
          />
        </>
      )}
    </AnimatePresence>
  )
}
