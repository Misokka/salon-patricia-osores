/**
 * 🔧 HELPERS SEO
 * Fonctions utilitaires pour générer du contenu SEO optimisé
 */

import salonConfig from '@/config/salon.config'

/**
 * Génère un title optimisé SEO pour une page
 * Format : "Page | Salon Name - City"
 */
export const generatePageTitle = (pageTitle: string): string => {
  return `${pageTitle} | ${salonConfig.identity.name} - ${salonConfig.identity.city}`
}

/**
 * Génère une meta description contextualisée
 */
export const generateMetaDescription = (service?: string): string => {
  if (service) {
    return `${service} au ${salonConfig.identity.name} à ${salonConfig.identity.city}. ${salonConfig.identity.description}`
  }
  return salonConfig.seo.description
}

/**
 * Génère des mots-clés locaux pour le SEO
 */
export const generateLocalKeywords = (additionalKeywords: string[] = []): string[] => {
  const baseKeywords = [
    ...salonConfig.seo.keywords,
    `salon de coiffure ${salonConfig.identity.city}`,
    `coiffeur ${salonConfig.identity.city}`,
    salonConfig.identity.name,
  ]
  
  return [...baseKeywords, ...additionalKeywords]
}

/**
 * Génère un canonical URL pour une page
 */
export const generateCanonicalUrl = (path: string = ''): string => {
  const baseUrl = salonConfig.seo.siteUrl
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Génère le contenu NAP (Name, Address, Phone) pour cohérence SEO local
 */
export const getNAPData = () => ({
  name: salonConfig.identity.name,
  address: salonConfig.contact.address.full,
  phone: salonConfig.contact.phoneDisplay,
  phoneLink: salonConfig.contact.phoneLink,
  city: salonConfig.identity.city,
  country: salonConfig.identity.country,
})

/**
 * Génère une description riche avec mots-clés locaux
 */
export const generateRichDescription = (): string => {
  return `${salonConfig.identity.name}, votre salon de coiffure à ${salonConfig.identity.city}. Spécialiste en coupe, coloration, balayage et soins capillaires. ${salonConfig.identity.description}`
}

/**
 * Génère les données pour le Schema.org avec contexte local
 */
export const generateLocalBusinessContext = () => ({
  name: salonConfig.identity.name,
  type: 'HairSalon',
  address: salonConfig.contact.address,
  geo: salonConfig.contact.coordinates,
  phone: salonConfig.contact.phone,
  email: salonConfig.contact.email,
  url: salonConfig.seo.siteUrl,
  city: salonConfig.identity.city,
  country: salonConfig.identity.country,
})

/**
 * Génère les tags Open Graph pour une page spécifique
 */
export const generateOpenGraphTags = (customTitle?: string, customDescription?: string, customImage?: string) => ({
  title: customTitle || salonConfig.seo.titleShort,
  description: customDescription || salonConfig.seo.description,
  url: salonConfig.seo.siteUrl,
  siteName: salonConfig.identity.name,
  image: customImage || salonConfig.theme.images.ogImage,
  locale: salonConfig.seo.region === 'FR' ? 'fr_FR' : 'fr_BE',
  type: 'website',
})

/**
 * Valide que toutes les données SEO critiques sont présentes
 */
export const validateSEOData = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!salonConfig.identity.name) errors.push('Nom du salon manquant')
  if (!salonConfig.identity.city) errors.push('Ville manquante')
  if (!salonConfig.contact.address.full) errors.push('Adresse complète manquante')
  if (!salonConfig.contact.phone) errors.push('Téléphone manquant')
  if (!salonConfig.seo.siteUrl || salonConfig.seo.siteUrl.includes('localhost')) {
    errors.push('URL de production manquante ou invalide')
  }
  if (!salonConfig.seo.title) errors.push('Title SEO manquant')
  if (!salonConfig.seo.description) errors.push('Description SEO manquante')
  if (salonConfig.seo.description.length > 160) {
    errors.push('Description SEO trop longue (max 160 caractères)')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export default {
  generatePageTitle,
  generateMetaDescription,
  generateLocalKeywords,
  generateCanonicalUrl,
  getNAPData,
  generateRichDescription,
  generateLocalBusinessContext,
  generateOpenGraphTags,
  validateSEOData,
}
