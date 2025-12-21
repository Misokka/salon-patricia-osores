import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const { supabase, response } = await updateSession(request)

  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')
  const isLoginPage = pathname === '/admin/login'

  // Protéger toutes les routes admin (pages + API)
  if ((isAdminPage || isAdminApi) && !isLoginPage) {
    const { data: { user }, error } = await supabase.auth.getUser()

    // Non authentifié
    if (error || !user) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        )
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Vérifier le rôle admin
    const role = user.app_metadata?.role
    if (role !== 'admin') {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: 'Accès non autorisé' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Rediriger si déjà connecté en admin
  if (isLoginPage) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.app_metadata?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
