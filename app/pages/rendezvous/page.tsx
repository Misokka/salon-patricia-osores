import RendezVous from '../../components/RendezVous';
import salonConfig from '@/config/salon.config';

export const metadata = {
  title: `Prendre rendez-vous - ${salonConfig.identity.shortName}`,
  description:
    `Réservez votre séance au salon ${salonConfig.identity.shortName} à Liège : coupe, couleur, balayage ou soin capillaire. Simple et rapide en ligne.`,
}

export default function RendezVousPage() {
  return (
    <main className="bg-light min-h-screen text-dark">
        <RendezVous />
    </main>
  )
}
