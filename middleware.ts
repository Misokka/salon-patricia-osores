import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log('[Middleware] Request:', pathname);
  
  // Mettre à jour la session Supabase
  const { supabase, response } = await updateSession(request)

  // Vérifier si l'utilisateur accède à une route admin
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'
  const isApiRoute = pathname.startsWith('/api/admin')

  console.log('[Middleware] isAdminRoute:', isAdminRoute, 'isApiRoute:', isApiRoute);

  if (isAdminRoute && !isLoginPage) {
    // Vérifier l'authentification pour toutes les routes admin sauf login
    const { data: { user }, error } = await supabase.auth.getUser()

    console.log('[Middleware] User:', user?.id, 'Error:', error?.message);

    // Si pas d'utilisateur ou erreur, rediriger vers login
    if (error || !user) {
      // Pour les API, retourner 401 au lieu de rediriger
      if (isApiRoute) {
        console.error('[Middleware] API route - 401 Unauthorized');
        return NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        );
      }
      
      const redirectUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Vérifier que l'utilisateur a le rôle admin (dans app_metadata, pas user_metadata)
    const userRole = user.app_metadata?.role
    console.log('[Middleware] User role:', userRole);
    
    if (userRole !== 'admin') {
      // Pour les API, retourner 403 au lieu de rediriger
      if (isApiRoute) {
        console.error('[Middleware] API route - 403 Forbidden');
        return NextResponse.json(
          { success: false, error: 'Accès non autorisé' },
          { status: 403 }
        );
      }
      
      // Si l'utilisateur n'est pas admin, rediriger vers la page d'accueil
      const redirectUrl = new URL('/', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    console.log('[Middleware] ✅ Auth OK for:', pathname);
  }

  // Si l'utilisateur est connecté et essaie d'accéder à la page de login
  if (isLoginPage) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && user.app_metadata?.role === 'admin') {
      // Rediriger vers le tableau de bord si déjà connecté
      const redirectUrl = new URL('/admin', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

// Configuration du matcher pour cibler les routes à protéger
export const config = {
  matcher: [
    // Protéger toutes les routes admin
    '/admin/:path*',
    // Protéger les routes API admin
    '/api/admin/:path*',
  ],
}
