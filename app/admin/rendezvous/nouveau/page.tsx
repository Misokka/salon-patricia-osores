import type { Metadata } from "next";
import CreateAppointmentForm from "../../../components/admin/CreateAppointmentForm";
import salonConfig from "@/config/salon.config";

export const metadata: Metadata = {
  title: `Nouveau rendez-vous — Admin | ${salonConfig.identity.shortName}`,
  description: "Créer un rendez-vous manuellement pour un client.",
};

export default function NewAppointmentPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-brand font-normal text-gray-900 mb-2">
          Nouveau rendez-vous
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Créez un rendez-vous pour un client (téléphone, sur place, etc.)
        </p>
      </div>

      {/* Formulaire */}
      <CreateAppointmentForm />
    </div>
  );
}
