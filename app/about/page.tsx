import salonConfig from '@/config/salon.config'

export const metadata = {
  title: salonConfig.pages.about.title,
  description: salonConfig.pages.about.description,
  openGraph: {
    title: salonConfig.pages.about.title,
    description: salonConfig.pages.about.description,
    url: `${salonConfig.seo.siteUrl}/about`,
  },
}

export default function AboutPage() {
  return (
    <main className="bg-light min-h-screen text-dark">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-accent py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-playfair font-bold mb-4">À Propos</h1>
          <p className="text-xl text-white/90">
            {salonConfig.identity.name} à {salonConfig.identity.city}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-4xl font-playfair font-bold mb-6 text-dark">
              Bienvenue chez {salonConfig.identity.ownerName}
            </h2>

            <p className="text-lg text-accent mb-6 leading-relaxed">
              Depuis plus de 20 ans, {salonConfig.identity.ownerName} exerce son métier de coiffeuse avec passion 
              et expertise. Son salon à {salonConfig.identity.city} est devenu un lieu de confiance où chaque cliente 
              se sent écoutée et mise en valeur.
            </p>

            <h3 className="text-2xl font-bold text-dark mt-12 mb-4">Notre Philosophie</h3>
            <p className="text-accent mb-4 leading-relaxed">
              Chaque chevelure est unique. C'est pourquoi nous prenons le temps de comprendre vos envies, 
              votre type de cheveux et votre style de vie avant de vous proposer la coupe ou la coloration 
              qui vous mettra vraiment en valeur.
            </p>

            <h3 className="text-2xl font-bold text-dark mt-12 mb-4">Nos Valeurs</h3>
            <ul className="space-y-3 text-accent mb-6">
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span><strong>Expertise :</strong> Formations continues, dernières tendances, maîtrise des techniques</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span><strong>Qualité :</strong> Produits premium (Kérastase, Wella, Davines)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span><strong>Écoute :</strong> Consultation gratuite avant chaque prestation</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">✓</span>
                <span><strong>Bienveillance :</strong> Atmosphère accueillante et détente garantie</span>
              </li>
            </ul>

            <div className="bg-accent/10 border-l-4 border-primary p-6 rounded-lg my-12">
              <p className="text-accent text-lg">
                <strong className="text-dark">Contactez-nous dès maintenant</strong> pour prendre rendez-vous 
                ou poser vos questions. Nous sommes situés à {salonConfig.contact.address.full}, 
                téléphone : <a href={`tel:${salonConfig.contact.phoneLink}`} className="text-primary font-semibold hover:underline">
                  {salonConfig.contact.phoneDisplay}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
