// types/service.ts

/* ----------------------------------------
   Enums / Types utilitaires
---------------------------------------- */

/**
 * Type de prix d’un service
 * - fixed : prix fixe
 * - from  : prix "à partir de"
 * - quote : sur devis
 */
export type ServicePriceType = 'fixed' | 'from' | 'quote'

/* ----------------------------------------
   Service Category
---------------------------------------- */

export interface ServiceCategory {
  id: string
  salon_id: string

  name: string
  color?: string | null
  position: number

  created_at: string
  updated_at: string
  deleted_at?: string | null
}

/* ----------------------------------------
   Service
---------------------------------------- */


export interface Service {
  id: string
  salon_id: string
  category_id: string

  name: string
  description?: string | null

  duration_minutes: number

  price_type: 'fixed' | 'from' | 'quote'
  price_value: number | null

  is_visible: boolean
  is_featured: boolean
  position: number

  created_at: string
  updated_at: string
  deleted_at?: string | null
}

/* ----------------------------------------
   Service enrichi (frontend)
---------------------------------------- */

/**
 * Service avec sa catégorie (jointure API)
 * Utilisé côté front / admin
 */
export interface ServiceWithCategory extends Service {
  category: ServiceCategory
}

/**
 * Catégorie avec ses services (affichage public)
 */
export interface ServiceCategoryWithServices extends ServiceCategory {
  services: Service[]
}

export interface ServiceImage {
  id: string
  image_url: string
  alt_text?: string | null
}

export interface ServiceWithImage extends Service {
  image: ServiceImage | null
}
