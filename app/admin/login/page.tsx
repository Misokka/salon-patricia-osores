'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import salonConfig from '@/config/salon.config'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Authentification avec Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Adresse e-mail ou mot de passe incorrect')
        setLoading(false)
        return
      }

      // Vérifier que l'utilisateur a le rôle administrateur
      // Le rôle est stocké dans app_metadata, pas user_metadata
      const userRole = data.user?.app_metadata?.role
      if (userRole !== 'admin') {
        await supabase.auth.signOut()
        setError('Accès non autorisé')
        setLoading(false)
        return
      }

      const redirectTo = searchParams.get('redirect') || '/admin/rendezvous'
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      console.error('Erreur lors de la connexion :', err)
      setError('Une erreur est survenue lors de la connexion')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-white to-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-brand font-normal text-dark mb-2">
            {salonConfig.admin.salon}
          </h1>
          <p className="text-gray-600">Espace Administrateur</p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
          <h2 className="text-2xl font-semibold text-dark mb-6 text-center">
            Connexion
          </h2>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700">
              <div className="flex items-center space-x-2">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="votremail@gmail.com"
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-[#a68b36] transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Informations de sécurité */}
          <div className="mt-6 pt-6 border-t-2 border-gray-100">
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <p>
                Connexion sécurisée. Vos informations sont protégées.
              </p>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 Salon Démo. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-light via-white to-light flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  )
}
