'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Disponibilite {
  id: string
  date: string
  heure: string
  est_disponible: boolean
  required_slots?: Array<{ id: string; heure: string }>
}

// Step 6 : Type pour les membres d'équipe
interface StaffMember {
  id: string
  name: string
  position: string | null
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
    staff_member_id?: string | null  // Step 6
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  // Step 6 : Sélection du coiffeur
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('') // '' = Sans préférence
  const [loadingStaff, setLoadingStaff] = useState(true)

  /* -------------------------------------------------- */
  /* Service sélectionné + Initialisation date */
  /* -------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('serviceSelectionne')
    if (!stored) {
      router.push('/rendezvous')
      return
    }
    setServiceSelectionne(JSON.parse(stored))

    // Initialiser la date à aujourd'hui
    const today = format(new Date(), 'yyyy-MM-dd')
    setSelectedDate(today)
  }, [router])

  /* -------------------------------------------------- */
  /* Step 6 : Fetch membres d'équipe */
  /* -------------------------------------------------- */
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        setLoadingStaff(true)
        const res = await axios.get('/api/public/staff-members')
        if (res.data.success) {
          setStaffMembers(res.data.data || [])
        }
      } catch (e) {
        console.error('Erreur chargement équipe:', e)
      } finally {
        setLoadingStaff(false)
      }
    }
    fetchStaffMembers()
  }, [])

  /* -------------------------------------------------- */
  /* Fetch disponibilités (déclenché aussi par changement de staff ou date) */
  /* -------------------------------------------------- */
  useEffect(() => {
    const fetchDisponibilites = async () => {
      if (!serviceSelectionne || !selectedDate) return

      try {
        setLoading(true)
        // Step 6 : Ajouter staff_member_id si sélectionné
        let url = `/api/disponibilites/available?service_id=${serviceSelectionne.id}&date_debut=${selectedDate}&date_fin=${selectedDate}&_t=${Date.now()}`
        if (selectedStaffId) {
          url += `&staff_member_id=${selectedStaffId}`
        }

        // 🔥 Force no-cache avec timestamp + headers
        const res = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })

        if (res.data.success) {
          // ⚠️ STEP 4 : Protection double - filtrer les slots sans staff disponible
          // Normalement le backend ne devrait jamais renvoyer count=0, mais on filtre par sécurité
          const slots = res.data.data.available_slots
            .filter((slot: any) => (slot.available_staff_count || 0) > 0)
            .map((slot: any) => ({
              id: slot.required_slots[0].id,
              date: slot.date,
              heure: slot.heure,
              est_disponible: true,
              required_slots: slot.required_slots,
              available_staff_count: slot.available_staff_count, // Garder pour debug
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
  }, [selectedDate, serviceSelectionne, selectedStaffId]) // Déclenché par changement de date, service ou staff

  /* -------------------------------------------------- */
  /* Helpers */
  /* -------------------------------------------------- */
  const formaterDateComplete = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleSelectCreneau = (
    date: string,
    heure: string,
    dispo: Disponibilite
  ) => {
    const payload = {
      date,
      heure,
      required_slots: dispo.required_slots,
      staff_member_id: selectedStaffId || null, // Step 6 : inclure le staff choisi
    }

    setCreneauSelectionne(payload)
    localStorage.setItem('creneauSelectionne', JSON.stringify(payload))
  }

  // Step 6 : Handler changement de coiffeur
  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId)
    setCreneauSelectionne(null) // Reset le créneau sélectionné
    localStorage.removeItem('creneauSelectionne')
  }

  // Handler changement de date
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setCreneauSelectionne(null)
    localStorage.removeItem('creneauSelectionne')
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
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Réserver en ligne
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Étape 2 sur 3 – Choix de la date et de l'heure
          </p>
        </div>

        {/* Prestation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs sm:text-sm font-semibold text-primary mb-2">
            1. Prestation sélectionnée
          </p>
          <h3 className="font-semibold text-gray-900">{serviceSelectionne.name}</h3>
          <p className="text-xs sm:text-sm text-gray-500">
            {serviceSelectionne.duration_label} · {serviceSelectionne.price_label}
          </p>
          <button
            onClick={() => router.push('/rendezvous')}
            className="text-primary text-xs sm:text-sm mt-2 hover:underline"
          >
            Supprimer
          </button>
        </div>

        {/* Step 6 : Choix du coiffeur */}
        {staffMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs sm:text-sm font-semibold text-primary mb-3">
              Choisir votre coiffeur (optionnel)
            </p>
            <select
              value={selectedStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              disabled={loadingStaff}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-800"
            >
              <option value="">Sans préférence</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
            {selectedStaffId && (
              <p className="mt-2 text-xs text-gray-500">
                Les créneaux affichés sont ceux où {staffMembers.find(s => s.id === selectedStaffId)?.name} est disponible
              </p>
            )}
          </div>
        )}

        {/* Choix date et heure */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            2. Choisissez votre créneau
          </h3>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Sélectionnez une date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
              required
            />
            {selectedDate && (
              <p className="mt-2 text-xs sm:text-sm text-gray-600 capitalize">
                {formaterDateComplete(selectedDate)}
              </p>
            )}
          </div>

          {/* Créneaux disponibles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <ClockIcon className="w-4 h-4 inline mr-2" />
              Créneaux disponibles pour cette date
            </label>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-gray-500 mt-2">Chargement des créneaux...</p>
              </div>
            ) : disponibilites.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aucun créneau disponible pour cette date</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedStaffId
                    ? `${staffMembers.find(s => s.id === selectedStaffId)?.name} n'est pas disponible. Essayez une autre date ou changez de coiffeur.`
                    : 'Sélectionnez une autre date ou essayez sans préférence de coiffeur.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                {disponibilites.map((slot) => {
                  const slotTime = slot.heure.substring(0, 5)
                  const isSelected = creneauSelectionne?.heure.substring(0, 5) === slotTime

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectCreneau(slot.date, slot.heure, slot)}
                      className={`
                        relative px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all
                        ${isSelected
                          ? 'bg-primary text-white border-primary shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                        }
                      `}
                    >
                      {slotTime}

                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer - Créneau sélectionné */}
          {creneauSelectionne && (
            <div className="pt-4 border-t space-y-3">
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Créneau sélectionné</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {formaterDateComplete(creneauSelectionne.date)}
                </p>
                <p className="text-lg font-bold text-primary mt-1">
                  {creneauSelectionne.heure.slice(0, 5)}
                </p>
                {creneauSelectionne.required_slots && creneauSelectionne.required_slots.length > 1 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Ce service nécessite {creneauSelectionne.required_slots.length} créneaux consécutifs
                  </p>
                )}
              </div>

              <button
                onClick={handleContinuer}
                className="w-full bg-dark text-white px-6 py-3 rounded-lg hover:bg-accent transition-colors font-medium"
              >
                Continuer
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
