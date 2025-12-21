const { salonConfig } = require('./config/salon.config.ts')

/**
 * Configuration du sitemap dynamique
 * Génère automatiquement sitemap.xml et robots.txt
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
  ],
  
  // Configuration robots.txt
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    additionalSitemaps: [
      `${salonConfig.seo.siteUrl}/sitemap.xml`,
    ],
  },
  
  // Fréquence de mise à jour des pages
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  generateIndexSitemap: false,
  outDir: './public',
  
  // Transformation personnalisée des URLs
  transform: async (config, path) => {
    // Priorités personnalisées selon les pages
    let priority = config.priority
    let changefreq = config.changefreq
    
    if (path === '/') {
      priority = 1.0
      changefreq = 'daily'
    } else if (path.includes('/rendezvous')) {
      priority = 0.9
      changefreq = 'daily'
    } else if (path.includes('/services')) {
      priority = 0.8
      changefreq = 'weekly'
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      alternateRefs: [
        {
          href: `${salonConfig.seo.siteUrl}${path}`,
          hreflang: salonConfig.seo.lang,
        },
      ],
    }
  },
  
  // Options additionnelles
  autoLastmod: true,
  sourceDir: '.next',
};
