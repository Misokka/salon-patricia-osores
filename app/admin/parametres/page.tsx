"use client";

import { useState, useEffect } from "react";

export default function ParametresPage() {
  const [requireManualApproval, setRequireManualApproval] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch("/api/admin/salon-settings");
      if (!response.ok) throw new Error("Erreur lors du chargement");

      const data = await response.json();
      setRequireManualApproval(data?.require_manual_approval ?? true);
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      setMessage({ type: "error", text: "Erreur lors du chargement des paramètres" });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(newValue: boolean) {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/salon-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ require_manual_approval: newValue }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

      setRequireManualApproval(newValue);
      setMessage({ type: "success", text: "Paramètre enregistré avec succès !" });

      // Effacer le message après 3 secondes
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement du paramètre" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres du salon</h1>
          <p className="text-gray-600">Configurez le fonctionnement de votre système de réservation</p>
        </div>

        {/* Message de confirmation/erreur */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Section Gestion des rendez-vous */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Gestion des rendez-vous</h2>

          <div className="space-y-6">
            {/* Toggle Validation manuelle */}
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-6">
                <label htmlFor="require_manual_approval" className="font-semibold text-gray-900 block mb-1">
                  Validation manuelle des rendez-vous
                </label>
                <p className="text-sm text-gray-600">
                  {requireManualApproval ? (
                    <>
                      <strong className="text-amber-600">Mode actuel : Validation manuelle</strong>
                      <br />
                      Les rendez-vous restent en attente jusqu&apos;à votre validation.
                    </>
                  ) : (
                    <>
                      <strong className="text-green-600">Mode actuel : Acceptation automatique</strong>
                      <br />
                      Les rendez-vous sont acceptés instantanément. Vous êtes juste notifié.
                    </>
                  )}
                </p>
              </div>

              {/* Toggle moderne */}
              <button
                type="button"
                role="switch"
                aria-checked={requireManualApproval}
                onClick={() => handleToggle(!requireManualApproval)}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  requireManualApproval ? "bg-amber-500" : "bg-green-500"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    requireManualApproval ? "translate-x-0" : "translate-x-6"
                  }`}
                />
              </button>
            </div>

            {/* Explications détaillées */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Différences entre les deux modes :</h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium text-gray-900 text-sm">Validation manuelle (activée)</span>
                  </div>
                  <ul className="text-xs text-gray-600 ml-7 space-y-1">
                    <li>• Les RDV ont le statut &quot;En attente&quot;</li>
                    <li>• Vous devez accepter ou refuser chaque demande</li>
                    <li>• Le client attend votre validation</li>
                    <li>• Permet de vérifier la disponibilité réelle avant confirmation</li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium text-gray-900 text-sm">Acceptation automatique (désactivée)</span>
                  </div>
                  <ul className="text-xs text-gray-600 ml-7 space-y-1">
                    <li>• Les RDV sont immédiatement acceptés</li>
                    <li>• Le client reçoit une confirmation instantanée</li>
                    <li>• Vous êtes juste notifié par email</li>
                    <li>• Plus rapide pour le client, moins de gestion pour vous</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
