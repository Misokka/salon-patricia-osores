import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[Middleware] Request:', pathname)

  const { supabase, response } = await updateSession(request)

  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admin')
  const isLoginPage = pathname === '/admin/login'

  // 🔐 PROTÉGER TOUT CE QUI EST ADMIN (UI + API)
  if ((isAdminPage || isAdminApi) && !isLoginPage) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    console.log('[Middleware] User:', user?.id, 'Error:', error?.message)

    // ❌ Non authentifié
    if (error || !user) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        )
      }

      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const role = user.app_metadata?.role
    console.log('[Middleware] User role:', role)

    // ❌ Pas admin
    if (role !== 'admin') {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: 'Accès non autorisé' },
          { status: 403 }
        )
      }

      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('[Middleware] ✅ Admin authorized:', pathname)
  }

  // ✅ Empêcher un admin connecté d’aller sur /admin/login
  if (isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
