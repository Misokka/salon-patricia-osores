'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Disponibilite {
  id: string
  date: string
  heure: string
  est_disponible: boolean
  required_slots?: Array<{ id: string; heure: string }>
}

import type { ServiceSelection } from '@/types/service-selection'

export default function ChoixDateHeurePage() {
  const router = useRouter()

  const [serviceSelectionne, setServiceSelectionne] =
    useState<ServiceSelection | null>(null)

  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([])
  const [creneauSelectionne, setCreneauSelectionne] = useState<{
    date: string
    heure: string
    required_slots?: Array<{ id: string; heure: string }>
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [jours, setJours] = useState<string[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  // 📱 jour ouvert en mobile
  const [openDay, setOpenDay] = useState<string | null>(null)

  /* -------------------------------------------------- */
  /* Génération des jours */
  /* -------------------------------------------------- */
  useEffect(() => {
    const joursArray: string[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + weekOffset * 7 + i)
      joursArray.push(date.toISOString().split('T')[0])
    }
    setJours(joursArray)
  }, [weekOffset])

  /* -------------------------------------------------- */
  /* Service sélectionné */
  /* -------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('serviceSelectionne')
    if (!stored) {
      router.push('/rendezvous')
      return
    }
    setServiceSelectionne(JSON.parse(stored))
  }, [router])

  /* -------------------------------------------------- */
  /* Fetch disponibilités */
  /* -------------------------------------------------- */
  useEffect(() => {
    const fetchDisponibilites = async () => {
      if (!serviceSelectionne || jours.length === 0) return

      try {
        setLoading(true)
        const res = await axios.get(
          `/api/disponibilites/available?service_id=${serviceSelectionne.id}&date_debut=${jours[0]}&date_fin=${jours[jours.length - 1]}`
        )

        if (res.data.success) {
          const slots = res.data.data.available_slots.map((slot: any) => ({
            id: slot.required_slots[0].id,
            date: slot.date,
            heure: slot.heure,
            est_disponible: true,
            required_slots: slot.required_slots,
          }))
          setDisponibilites(slots)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchDisponibilites()
  }, [jours, serviceSelectionne])

  /* -------------------------------------------------- */
  /* Helpers */
  /* -------------------------------------------------- */
  const formaterDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
  }

  const getCreneauxPourDate = (date: string) =>
    disponibilites.filter((d) => d.date === date)

  const handleSelectCreneau = (
    date: string,
    heure: string,
    dispo: Disponibilite
  ) => {
    const payload = {
      date,
      heure,
      required_slots: dispo.required_slots,
    }

    setCreneauSelectionne(payload)
    localStorage.setItem('creneauSelectionne', JSON.stringify(payload))
  }

  const handleContinuer = () => {
    if (!creneauSelectionne) return
    router.push('/rendezvous/confirmation')
  }

  if (!serviceSelectionne) return null

  /* -------------------------------------------------- */
  /* RENDER */
  /* -------------------------------------------------- */
  return (
    <main className="bg-light min-h-screen">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-4xl font-brand text-dark">
            Réserver en ligne chez Salon Patricia Osores
          </h1>
          <p className="text-gray-600 mt-1">
            Étape 2 sur 3 – Choix de la date et de l'heure
          </p>
        </div>

        {/* Prestation */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-primary text-sm font-semibold mb-1">
            1. Prestation sélectionnée
          </p>
          <h3 className="font-semibold">{serviceSelectionne.name}</h3>
          <p className="text-sm text-gray-500">
            {serviceSelectionne.duration_label} · {serviceSelectionne.price_label}
          </p>
          <button
            onClick={() => router.push('/rendezvous')}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Supprimer
          </button>
        </div>

        {/* Choix date */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            2. Choix de la date & heure
          </h3>

          {loading ? (
            <p className="text-center text-gray-500 py-8">
              Chargement des disponibilités…
            </p>
          ) : (
            <>
              {/* Navigation semaine */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <button
                  disabled={weekOffset === 0}
                  onClick={() => {
                    setWeekOffset((w) => Math.max(0, w - 1))
                    setCreneauSelectionne(null)
                  }}
                  className="btn-secondary disabled:opacity-40"
                >
                  ← Semaine précédente
                </button>

                <span className="font-semibold">
                  {weekOffset === 0
                    ? 'Cette semaine'
                    : `Dans ${weekOffset} semaine${
                        weekOffset > 1 ? 's' : ''
                      }`}
                </span>

                <button
                  onClick={() => {
                    setWeekOffset((w) => w + 1)
                    setCreneauSelectionne(null)
                  }}
                  className="btn-secondary"
                >
                  Semaine suivante →
                </button>
              </div>

              {/* 📱 MOBILE – accordion */}
              <div className="sm:hidden space-y-3">
                {jours.map((jour) => {
                  const creneaux = getCreneauxPourDate(jour)
                  const isOpen = openDay === jour

                  return (
                    <div
                      key={jour}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenDay(isOpen ? null : jour)}
                        className="w-full px-4 py-3 flex justify-between items-center"
                      >
                        <span className="capitalize font-medium">
                          {formaterDate(jour)}
                        </span>
                        <span
                          className={`transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        >
                          ▾
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                          {creneaux.length > 0 ? (
                            creneaux.map((c) => (
                              <button
                                key={c.id}
                                onClick={() =>
                                  handleSelectCreneau(jour, c.heure, c)
                                }
                                className={`py-2 rounded text-sm ${
                                  creneauSelectionne?.date === jour &&
                                  creneauSelectionne?.heure === c.heure
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100'
                                }`}
                              >
                                {c.heure.slice(0, 5)}
                              </button>
                            ))
                          ) : (
                            <p className="col-span-3 text-center text-gray-400">
                              Aucun créneau
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 💻 DESKTOP – calendrier horizontal */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="flex gap-4">
                  {jours.map((jour) => {
                    const creneaux = getCreneauxPourDate(jour)
                    const [j, r] = formaterDate(jour).split(' ')

                    return (
                      <div key={jour} className="w-32">
                        <div className="text-center border-b pb-2 mb-2">
                          <p className="text-xs capitalize">{j}</p>
                          <p className="font-semibold">{r}</p>
                        </div>

                        <div className="space-y-2">
                          {creneaux.length > 0 ? (
                            creneaux.map((c) => (
                              <button
                                key={c.id}
                                onClick={() =>
                                  handleSelectCreneau(jour, c.heure, c)
                                }
                                className={`w-full py-2 rounded text-sm ${
                                  creneauSelectionne?.date === jour &&
                                  creneauSelectionne?.heure === c.heure
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100'
                                }`}
                              >
                                {c.heure.slice(0, 5)}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 text-center">
                              Fermé
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              {creneauSelectionne && (
                <div className="pt-4 border-t flex justify-between items-center">
                  <p className="font-medium capitalize">
                    {formaterDate(creneauSelectionne.date)} à{' '}
                    {creneauSelectionne.heure.slice(0, 5)}
                  </p>
                  <button
                    onClick={handleContinuer}
                    className="bg-dark text-white px-6 py-2 rounded hover:bg-accent"
                  >
                    Continuer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
