import Hero from './components/Hero'
import About from './components/About'
import Services from './components/Services'
import Gallery from './components/Gallery'
import Testimonials from './components/Testimonials'
import Contact from './components/Contact'
import Footer from './components/Footer'
import './globals.css'

/**
 * Page d'accueil - Structure HTML sémantique optimisée SEO
 * H1 dans Hero, H2 dans chaque section
 */
export default function Home() {
  return (
    <main className="bg-light text-dark">
      <Hero />
      <Services />
      <Gallery />
      <About />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  )
}
