export default function MentionsLegalesPage() {
  return (
    <main className="bg-light min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-brand text-dark mb-8">
          Mentions légales
        </h1>

        <div className="space-y-6 bg-white rounded-lg shadow-md p-6 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-dark mb-2">Éditeur du site</h2>
            <p>
              Le présent site est édité par <strong>Jeremy Caron-Labalette</strong>.
            </p>
            <p>
              Email de contact : <strong>contact@jeremycaron-labalette.fr</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark mb-2">Responsabilité</h2>
            <p>
              L’éditeur met à disposition une plateforme technique permettant la
              gestion de rendez-vous pour des salons de services.
            </p>
            <p className="mt-2">
              L’éditeur ne saurait être tenu responsable des prestations réalisées
              par les salons, ni des litiges pouvant survenir entre un salon et ses clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark mb-2">Données personnelles</h2>
            <p>
              Les informations relatives au traitement des données personnelles sont
              détaillées dans la politique de confidentialité accessible sur le site.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
