import salonConfig from '@/config/salon.config'
import Services from '@/app/components/Services'
import Footer from '@/app/components/Footer'

export const metadata = {
  title: salonConfig.pages.services.title,
  description: salonConfig.pages.services.description,
  keywords: salonConfig.seo.keywords,
  openGraph: {
    title: salonConfig.pages.services.title,
    description: salonConfig.pages.services.description,
    url: `${salonConfig.seo.siteUrl}/services`,
  },
}

export default function ServicesPage() {
  const { identity, contact } = salonConfig

  return (
    <main className="bg-light min-h-screen text-dark">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-accent py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-playfair font-bold mb-4">
            Nos Services de Coiffure
          </h1>
          <p className="text-xl text-white/90">
            Au {identity.name} à {identity.city}, nous proposons une gamme complète 
            de services capillaires avec expertise professionnelle
          </p>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Service: Coupe */}
            <div className="bg-white rounded-lg shadow p-8 border-l-4 border-primary hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-dark mb-3">Coupe Femme</h2>
              <p className="text-accent mb-4">
                Coupes personnalisées adaptées à votre morphologie et votre style. 
                Dégradés modernes, carrés, coupes courtes ou cheveux longs — nos coiffeurs 
                créent la coupe qui vous mettra en valeur.
              </p>
              <a 
                href="/rendezvous?service=coupe"
                className="inline-block text-primary font-semibold hover:text-accent transition"
              >
                Réserver une coupe →
              </a>
            </div>

            {/* Service: Coloration */}
            <div className="bg-white rounded-lg shadow p-8 border-l-4 border-primary hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-dark mb-3">Coloration & Balayage</h2>
              <p className="text-accent mb-4">
                Coloration complète, balayage californien, mèches parisiennes et retouches. 
                Nos techniques professionnelles avec produits premium garantissent une couleur 
                éclatante et durable.
              </p>
              <a 
                href="/rendezvous?service=coloration"
                className="inline-block text-primary font-semibold hover:text-accent transition"
              >
                Réserver une coloration →
              </a>
            </div>

            {/* Service: Soins */}
            <div className="bg-white rounded-lg shadow p-8 border-l-4 border-primary hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-dark mb-3">Soins Capillaires</h2>
              <p className="text-accent mb-4">
                Masques nourrissants, traitements réparants, hydratation intensive. 
                Nos soins capillaires premium avec Kérastase, Wella et Davines redonnent 
                vigueur et brillance à vos cheveux.
              </p>
              <a 
                href="/rendezvous?service=soins"
                className="inline-block text-primary font-semibold hover:text-accent transition"
              >
                Réserver un soin →
              </a>
            </div>

            {/* Service: Brushing */}
            <div className="bg-white rounded-lg shadow p-8 border-l-4 border-primary hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-dark mb-3">Brushing & Lissage</h2>
              <p className="text-accent mb-4">
                Brushing classique, volumineux ou lissage professionnel. Parfait pour 
                sublimer vos cheveux pour un rendez-vous, une soirée ou simplement au quotidien.
              </p>
              <a 
                href="/rendezvous?service=brushing"
                className="inline-block text-primary font-semibold hover:text-accent transition"
              >
                Réserver un brushing →
              </a>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-accent/10 rounded-lg p-8 mt-12 border-l-4 border-accent">
            <h3 className="text-2xl font-bold text-dark mb-4">Besoin de conseils ?</h3>
            <p className="text-accent mb-6">
              Contactez-nous pour une consultation gratuite. Nous vous aiderons à choisir 
              le service adapté à vos besoins.
            </p>
            <div className="space-y-2">
              <p className="text-dark">
                <strong>Téléphone :</strong> <a href={`tel:${contact.phoneLink}`} className="text-primary font-semibold hover:underline">{contact.phoneDisplay}</a>
              </p>
              <p className="text-dark">
                <strong>Email :</strong> <a href={`mailto:${contact.email}`} className="text-primary font-semibold hover:underline">{contact.email}</a>
              </p>
              <p className="text-dark">
                <strong>Adresse :</strong> {contact.address.full}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Services from DB */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-dark mb-12 text-center">Tous nos services</h2>
          <Services />
        </div>
      </section>
      <Footer />
    </main>
  )
}
