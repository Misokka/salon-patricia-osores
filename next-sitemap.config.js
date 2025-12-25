const { salonConfig } = require('./config/salon.config.ts')

/**
 * Configuration du sitemap dynamique
 * Génère automatiquement sitemap.xml et robots.txt
 * Optimisée pour le référencement SEO
 */
module.exports = {
  siteUrl: salonConfig.seo.siteUrl,
  generateRobotsTxt: true,
  
  // Pages à exclure du sitemap
  exclude: [
    '/admin',
    '/admin/*',
    '/api/*',
    '/404',
    '/500',
    '/rendezvous/confirmation', // Exclure les pages de confirmation (pas d'indexation)
    '/rendezvous/reschedule/*', // Exclure les pages de replanification (URLs dynamiques)
  ],
  
  // Configuration robots.txt optimisée
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin/*',
          '/api/',
          '/api/*',
          '/rendezvous/confirmation',
          '/rendezvous/reschedule/',
        ],
        // Délai de politesse pour ne pas surcharger le serveur
        crawlDelay: 1,
      },
      // Règles spécifiques pour Googlebot (plus permissif)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
        crawlDelay: 0.5,
      },
    ],
    // Sitemap référencé dans robots.txt
    additionalSitemaps: [
      `${salonConfig.seo.siteUrl}/sitemap.xml`,
    ],
  },
  
  // Fréquence de mise à jour par défaut
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  generateIndexSitemap: false,
  outDir: './public',
  
  // Transformation personnalisée des URLs avec priorités optimisées
  transform: async (config, path) => {
    // Priorités personnalisées selon les pages
    let priority = config.priority
    let changefreq = config.changefreq
    
    // Page d'accueil - priorité maximale
    if (path === '/') {
      priority = 1.0
      changefreq = 'daily'
    } 
    // Page de prise de rendez-vous - très importante pour la conversion
    else if (path === '/rendezvous' || path.includes('/rendezvous/date')) {
      priority = 0.95
      changefreq = 'daily'
    }
    // Pages légales - importantes pour la confiance
    else if (path === '/cgu' || path === '/mentions-legales' || path === '/politique') {
      priority = 0.6
      changefreq = 'monthly'
    }
    // Autres pages
    else {
      priority = 0.7
      changefreq = 'weekly'
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      // Balise alternate pour le multilangue (si nécessaire à l'avenir)
      alternateRefs: [
        {
          href: `${salonConfig.seo.siteUrl}${path}`,
          hreflang: salonConfig.seo.lang,
        },
      ],
    }
  },
  
  // Options additionnelles pour l'optimisation
  autoLastmod: true, // Met à jour automatiquement la date de modification
  sourceDir: '.next',
  
  // URLs supplémentaires à inclure manuellement si nécessaire
  additionalPaths: async (config) => {
    const result = []
    
    // Vous pouvez ajouter des URLs dynamiques ici
    // Par exemple, si vous avez des pages de services générées dynamiquement
    
    return result
  },
};
