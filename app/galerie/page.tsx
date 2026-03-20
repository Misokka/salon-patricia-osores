import salonConfig from '@/config/salon.config'
import Gallery from '@/app/components/Gallery'
import Footer from '@/app/components/Footer'

export const metadata = {
  title: salonConfig.pages.gallery.title,
  description: salonConfig.pages.gallery.description,
  openGraph: {
    title: salonConfig.pages.gallery.title,
    description: salonConfig.pages.gallery.description,
    url: `${salonConfig.seo.siteUrl}/galerie`,
  },
}

export default function GalleryPage() {
  const { identity, seo } = salonConfig

  return (
    <main className="bg-light min-h-screen text-dark">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-accent py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-playfair font-bold mb-4">
            {salonConfig.pages.gallery.title}
          </h1>
          <p className="text-xl text-white/90">
            Découvrez les magnifiques transformations capillaires réalisées au {identity.name}
          </p>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Gallery />
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-playfair font-bold mb-8 text-center text-dark">
            Nos Spécialités
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-light p-6 rounded-lg">
              <h3 className="text-xl font-bold text-primary mb-3">Coupes & Dégradés</h3>
              <p className="text-accent">
                Créations sur-mesure adaptées à votre visage et votre style personnel.
              </p>
            </div>

            <div className="bg-light p-6 rounded-lg">
              <h3 className="text-xl font-bold text-primary mb-3">Colorations Créatives</h3>
              <p className="text-accent">
                Coloration complète, balayage californien, mèches parisiennes — toutes les techniques.
              </p>
            </div>

            <div className="bg-light p-6 rounded-lg">
              <h3 className="text-xl font-bold text-primary mb-3">Soins Premium</h3>
              <p className="text-accent">
                Masques nourrissants et traitements réparants avec les meilleures marques.
              </p>
            </div>

            <div className="bg-light p-6 rounded-lg">
              <h3 className="text-xl font-bold text-primary mb-3">Brushing & Lissage</h3>
              <p className="text-accent">
                Mise en forme professionnelle pour sublimer vos cheveux instantanément.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
