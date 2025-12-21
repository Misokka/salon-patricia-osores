import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import AdminContent from "./AdminContent";

export const metadata: Metadata = {
  title: "Rendez-vous — Admin | Salon Démo",
  description: "Interface d'administration pour gérer les demandes de rendez-vous.",
};

export default function AdminRendezvousPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-brand font-normal text-gray-900 mb-2">
            Rendez-vous
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Gérez les demandes et les rendez-vous confirmés du salon.
          </p>
        </div>
        
        <Link
          href="/admin/rendezvous/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium text-sm"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Ajouter RDV manuellement</span>
        </Link>
      </div>

      {/* Composant client */}
      <AdminContent />
    </div>
  );
}
