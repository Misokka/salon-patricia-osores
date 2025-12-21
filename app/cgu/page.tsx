export default function CGUPage() {
  return (
    <main className="bg-light min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* En-tête */}
        <div className="mb-10">
          <h1 className="text-4xl font-brand text-dark mb-3">
            Conditions Générales d’Utilisation
          </h1>
          <p className="text-gray-600 text-sm">
            Dernière mise à jour : <span className="italic">Le 21 décembre 2025</span>
          </p>
        </div>

        <div className="space-y-6">

          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-700 leading-relaxed">
              Les présentes Conditions Générales d’Utilisation (CGU) ont pour objet
              de définir les modalités d’accès et d’utilisation de la plateforme
              de gestion de rendez-vous fournie par <strong>Jeremy Caron-Labalette</strong>.
            </p>
          </section>

          {/* Objet */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Objet du service
            </h2>
            <p className="text-gray-700 leading-relaxed">
              La plateforme fournit un outil technique permettant aux salons de
              services (coiffure, esthétique, etc.) de gérer leurs prestations,
              disponibilités et rendez-vous en ligne.
            </p>
            <p className="mt-3 text-gray-700">
              La plateforme agit exclusivement en tant que fournisseur technique
              et n’intervient pas dans la relation commerciale entre le salon et ses clients.
            </p>
          </section>

          {/* Accès */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Accès à la plateforme
            </h2>
            <p className="text-gray-700 leading-relaxed">
              L’accès à l’interface d’administration est réservé aux salons disposant
              d’un compte créé suite à une invitation envoyée par la plateforme.
            </p>
            <p className="mt-3 text-gray-700">
              Le salon est responsable de la confidentialité de ses identifiants
              et de toute action effectuée depuis son compte.
            </p>
          </section>

          {/* Responsabilité salon */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Responsabilités du salon
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>l’exactitude des informations renseignées</li>
              <li>la gestion de ses rendez-vous et disponibilités</li>
              <li>la conformité de son activité à la réglementation en vigueur</li>
              <li>la gestion des données personnelles de ses clients</li>
            </ul>
          </section>

          {/* RGPD */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Protection des données personnelles
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Dans le cadre de l’utilisation de la plateforme, le salon agit en tant
              que responsable du traitement des données personnelles de ses clients.
            </p>
            <p className="mt-3 text-gray-700">
              <strong>Jeremy Caron-Labalette</strong> agit en tant que
              sous-traitant technique au sens du Règlement Général sur la Protection
              des Données (RGPD), uniquement pour les besoins techniques du service.
            </p>
          </section>

          {/* Limitation */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Limitation de responsabilité
            </h2>
            <p className="text-gray-700 leading-relaxed">
              La plateforme ne saurait être tenue responsable des annulations,
              litiges, retards ou différends intervenant entre le salon et ses clients.
            </p>
            <p className="mt-3 text-gray-700">
              La plateforme s’engage à fournir un service fonctionnel mais ne garantit
              pas une disponibilité ininterrompue.
            </p>
          </section>

          {/* Suspension */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Suspension ou résiliation
            </h2>
            <p className="text-gray-700 leading-relaxed">
              La plateforme se réserve le droit de suspendre ou de résilier l’accès
              d’un salon en cas d’utilisation abusive, frauduleuse ou non conforme
              aux présentes CGU.
            </p>
          </section>

          {/* Modifications */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Modification des CGU
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes CGU peuvent être modifiées à tout moment afin de refléter
              les évolutions du service ou de la réglementation.
            </p>
          </section>

          {/* Droit applicable */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Droit applicable
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes CGU sont soumises au droit applicable dans le pays
              d’établissement de <strong>Jeremy Caron-Labalette</strong>.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
