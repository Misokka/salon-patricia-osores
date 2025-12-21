export default function PolitiqueConfidentialitePage() {
  return (
    <main className="bg-light min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* En-tête */}
        <div className="mb-10">
          <h1 className="text-4xl font-brand text-dark mb-3">
            Politique de confidentialité
          </h1>
          <p className="text-gray-600 text-sm">
            Dernière mise à jour : <span className="italic">Le 21 décembre 2025</span>
          </p>
        </div>

        <div className="space-y-6">

          {/* Introduction */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-700 leading-relaxed">
              La présente politique de confidentialité a pour objectif d’informer
              les utilisateurs sur la manière dont leurs données personnelles sont
              collectées, utilisées et protégées lors de l’utilisation du service
              de prise de rendez-vous proposé par <strong>Jeremy Caron-Labalette</strong>.
            </p>
          </section>

          {/* Responsable */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Responsable du traitement
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Le responsable du traitement des données est :
            </p>
            <p className="mt-2 text-gray-700">
              <strong>Jeremy Caron-Labalette</strong><br />
              Email : <strong>contact@jeremy-caron-labalette.fr</strong>
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Dans le cadre d’une prise de rendez-vous, le salon concerné agit
              également en tant que responsable du traitement pour les données
              de ses propres clients.
            </p>
          </section>

          {/* Données collectées */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Données personnelles collectées
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Nom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone (facultatif)</li>
              <li>Message libre (facultatif)</li>
              <li>Données liées au rendez-vous (service, date, heure)</li>
            </ul>
            <p className="mt-3 text-gray-700">
              Aucune donnée sensible n’est collectée.
            </p>
          </section>

          {/* Finalité */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Finalités du traitement
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Permettre la prise de rendez-vous en ligne</li>
              <li>Gérer les demandes (acceptation, refus, modification, annulation)</li>
              <li>Assurer la communication entre le client et le salon</li>
              <li>Envoyer des emails transactionnels liés au rendez-vous</li>
            </ul>
            <p className="mt-3 text-gray-700">
              Les données ne sont jamais utilisées à des fins commerciales ou publicitaires.
            </p>
          </section>

          {/* Base légale */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Base légale du traitement
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Le traitement des données repose sur l’exécution d’un service
              demandé par l’utilisateur (prise de rendez-vous) ainsi que sur
              l’intérêt légitime des salons à gérer leur activité.
            </p>
          </section>

          {/* Destinataires */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Destinataires des données
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Les données personnelles sont accessibles uniquement :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
              <li>au salon concerné par le rendez-vous</li>
              <li>à <strong>Jeremy Caron-Labalette</strong>, à des fins techniques</li>
            </ul>
            <p className="mt-3 text-gray-700">
              Les données ne sont ni vendues, ni louées, ni cédées à des tiers.
            </p>
          </section>

          {/* Hébergement */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Hébergement et sécurité
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Les données sont hébergées sur des serveurs sécurisés situés dans
              l’Union Européenne via Supabase. Des mesures techniques et
              organisationnelles sont mises en place afin de garantir la
              confidentialité et la sécurité des données.
            </p>
          </section>

          {/* Conservation */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Durée de conservation
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Les données sont conservées uniquement pendant la durée nécessaire
              à la gestion des rendez-vous et à la relation entre le client et le salon,
              et au maximum <strong>3 ans</strong>, sauf obligation légale contraire.
            </p>
          </section>

          {/* Droits */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Droits des utilisateurs
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Conformément à la réglementation en vigueur, vous disposez d’un droit
              d’accès, de rectification, d’effacement, de limitation et d’opposition
              concernant vos données personnelles.
            </p>
            <p className="mt-3 text-gray-700">
              Toute demande peut être adressée au salon concerné ou à :
              <br />
              <strong>contact@jeremy-caron-labalette.fr</strong>
            </p>
          </section>

          {/* Cookies */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-dark mb-3">
              Cookies
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Le site n’utilise pas de cookies publicitaires ou de suivi marketing.
              Seuls des cookies strictement nécessaires au fonctionnement du site
              peuvent être utilisés.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
