import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import SchemaScript from './components/SchemaScript'
import ClientLayout from './components/ClientLayout'
import salonConfig from '@/config/salon.config'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-playfair' })

export const metadata: Metadata = {
  metadataBase: new URL(salonConfig.seo.siteUrl),
  title: salonConfig.seo.title,
  description: salonConfig.seo.description,
  keywords: [...salonConfig.seo.keywords],
  authors: [{ name: salonConfig.identity.ownerName }],
  creator: salonConfig.identity.ownerName,
  publisher: salonConfig.identity.name,
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  openGraph: {
    title: salonConfig.seo.titleShort,
    description: salonConfig.seo.description,
    url: salonConfig.seo.siteUrl,
    siteName: salonConfig.identity.name,
    locale: salonConfig.seo.region === 'FR' ? 'fr_FR' : 'fr_BE',
    type: 'website',
    images: [
      {
        url: salonConfig.theme.images.ogImage,
        width: 1200,
        height: 630,
        alt: `${salonConfig.identity.name} - Salon de coiffure à ${salonConfig.identity.city}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: salonConfig.seo.titleShort,
    description: salonConfig.seo.description,
    images: [salonConfig.theme.images.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: salonConfig.seo.siteUrl,
  },
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const bigint = parseInt(value, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r} ${g} ${b}`
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={salonConfig.seo.lang} className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content={salonConfig.theme.colors.primary} />
        <meta name="geo.region" content={salonConfig.contact.address.countryCode} />
        <meta name="geo.placename" content={salonConfig.identity.city} />
        <meta name="geo.position" content={`${salonConfig.contact.coordinates.latitude};${salonConfig.contact.coordinates.longitude}`} />
        <meta name="ICBM" content={`${salonConfig.contact.coordinates.latitude}, ${salonConfig.contact.coordinates.longitude}`} />
        <SchemaScript />
      </head>

      <body className="bg-light text-dark font-base antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
