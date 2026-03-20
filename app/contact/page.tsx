'use client'

import salonConfig from '@/config/salon.config'
import Footer from '@/app/components/Footer'
import { usePublicSchedule } from '@/lib/hooks/usePublicSchedule'

export default function ContactPage() {
  const { identity, contact } = salonConfig
  const { formatted: horaires, loading } = usePublicSchedule()

  return (
    <main className="bg-light min-h-screen text-dark">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-accent py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-playfair font-bold mb-4">Contact</h1>
          <p className="text-xl text-white/90">
            Contactez le {identity.name} à {identity.city}
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Info Box: Adresse */}
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-2xl font-bold text-primary mb-4">Localisation</h3>
              <p className="text-accent text-lg font-semibold mb-2">
                {identity.name}
              </p>
              <p className="text-dark mb-4 leading-relaxed">
                {contact.address.street}<br />
                {contact.address.postalCode} {contact.address.city}<br />
                {contact.address.country}
              </p>
              <p className="text-sm text-accent">
                Situé au cœur de {identity.city}, facilement accessible en voiture et à pied.
              </p>
            </div>

            {/* Info Box: Contact */}
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-2xl font-bold text-primary mb-4">Nous Contacter</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-accent font-semibold mb-1">TÉLÉPHONE</p>
                  <a 
                    href={`tel:${contact.phoneLink}`}
                    className="text-dark text-lg font-semibold hover:text-primary transition"
                  >
                    {contact.phoneDisplay}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-accent font-semibold mb-1">EMAIL</p>
                  <a 
                    href={`mailto:${contact.email}`}
                    className="text-dark text-lg font-semibold hover:text-primary transition"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div className="bg-white rounded-lg shadow p-8 mb-12">
            <h3 className="text-2xl font-bold text-dark mb-6">Horaires d'Ouverture</h3>
            {loading ? (
              <p className="text-accent">Chargement des horaires...</p>
            ) : (
              <div className="space-y-2">
                {horaires.map((h) => (
                  <div key={h.jour} className="flex justify-between text-dark">
                    <span className="font-semibold">{h.jour}</span>
                    <span>{h.heures}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Prêt à prendre rendez-vous ?</h3>
            <p className="mb-6 text-white/90">
              Réservez facilement votre créneau en ligne. Confirmation dans les 24 heures.
            </p>
            <a 
              href="/rendezvous"
              className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-light transition"
            >
              Réserver maintenant
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
