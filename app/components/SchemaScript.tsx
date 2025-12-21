'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import salonConfig from '@/config/salon.config'
import { usePublicSchedule } from '@/lib/hooks/usePublicSchedule'

const DAYS_MAP: Record<string, string> = {
  Lundi: 'Monday',
  Mardi: 'Tuesday',
  Mercredi: 'Wednesday',
  Jeudi: 'Thursday',
  Vendredi: 'Friday',
  Samedi: 'Saturday',
  Dimanche: 'Sunday',
}

export default function SchemaScript() {
  const { schedule, loading } = usePublicSchedule()
  const [schemaData, setSchemaData] = useState<any>(null)

  useEffect(() => {
    if (loading || schedule.length === 0) return

    const openingHours = schedule
      .filter((day) => day.isOpen && day.ranges.length > 0)
      .map((day) => {
        const firstRange = day.ranges[0]
        const lastRange = day.ranges[day.ranges.length - 1]

        return {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [DAYS_MAP[day.day] || day.day],
          opens: firstRange.start_time,
          closes: lastRange.end_time,
        }
      })

    const hairSalonSchema = {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      '@id': `${salonConfig.seo.siteUrl}#hairsalon`,
      name: salonConfig.identity.name,
      image: [
        `${salonConfig.seo.siteUrl}${salonConfig.theme.images.hero}`,
        `${salonConfig.seo.siteUrl}${salonConfig.theme.images.ogImage}`,
      ],
      description: salonConfig.identity.description,
      url: salonConfig.seo.siteUrl,
      telephone: salonConfig.contact.phone,
      email: salonConfig.contact.email,
      priceRange: '€€',
      paymentAccepted: 'Cash, Credit Card',
      currenciesAccepted: 'EUR',
      address: {
        '@type': 'PostalAddress',
        streetAddress: salonConfig.contact.address.street,
        addressLocality: salonConfig.contact.address.city,
        postalCode: salonConfig.contact.address.postalCode,
        addressRegion: salonConfig.contact.address.region,
        addressCountry: salonConfig.contact.address.countryCode,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: salonConfig.contact.coordinates.latitude,
        longitude: salonConfig.contact.coordinates.longitude,
      },
      openingHoursSpecification: openingHours,
      sameAs: [
        salonConfig.contact.social.instagram,
        salonConfig.contact.social.facebook,
      ].filter(Boolean),
      areaServed: {
        '@type': 'City',
        name: salonConfig.identity.city,
      },
      hasMap: `https://www.google.com/maps?q=${encodeURIComponent(
        salonConfig.contact.address.full
      )}`,
    }

    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${salonConfig.seo.siteUrl}#organization`,
      name: salonConfig.identity.name,
      url: salonConfig.seo.siteUrl,
      logo: `${salonConfig.seo.siteUrl}${salonConfig.theme.images.logo}`,
      description: salonConfig.identity.description,
      address: hairSalonSchema.address,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: salonConfig.contact.phone,
        contactType: 'customer service',
        email: salonConfig.contact.email,
        areaServed: salonConfig.contact.address.countryCode,
        availableLanguage: [salonConfig.seo.lang],
      },
      sameAs: hairSalonSchema.sameAs,
    }

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${salonConfig.seo.siteUrl}#website`,
      url: salonConfig.seo.siteUrl,
      name: salonConfig.identity.name,
      description: salonConfig.identity.description,
      publisher: {
        '@id': `${salonConfig.seo.siteUrl}#organization`,
      },
      inLanguage: salonConfig.seo.lang,
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: salonConfig.seo.siteUrl,
        },
      ],
    }

    setSchemaData({
      hairSalonSchema,
      organizationSchema,
      websiteSchema,
      breadcrumbSchema,
    })
  }, [schedule, loading])

  if (!schemaData) return null

  return (
    <>
      <Script
        id="schema-hairsalon"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData.hairSalonSchema),
        }}
      />

      <Script
        id="schema-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData.organizationSchema),
        }}
      />

      <Script
        id="schema-website"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData.websiteSchema),
        }}
      />

      <Script
        id="schema-breadcrumb"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData.breadcrumbSchema),
        }}
      />
    </>
  )
}
