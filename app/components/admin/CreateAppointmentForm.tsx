'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/apiClient'
import { motion } from 'framer-motion'
import { ChevronLeftIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'

import type { Service } from '@/types/service'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  is_available: boolean
}

interface SlotGroup {
  firstSlotId: string
  startTime: string
  slots: TimeSlot[]
}

interface AvailableSlotData {
  service: Service
  slot_frequency_minutes: number
  required_slots_count: number
  available_slots: any[]
}

export default function CreateAppointmentForm() {
  const router = useRouter()
  
  // État du formulaire
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([]) // Groupes de créneaux complets
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [slotFrequency, setSlotFrequency] = useState<number>(30) // Fréquence dynamique depuis l'API
  
  // Informations client
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [internalNote, setInternalNote] = useState('')
  
  // État UI
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Charger les services au montage
  useEffect(() => {
    fetchServices()
  }, [])

  // Charger les créneaux quand service + date changent
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots()
    } else {
      setSlotGroups([])
      setSelectedSlotIds([])
    }
  }, [selectedService, selectedDate])

  const fetchServices = async () => {
    try {
      const { data } = await apiClient.get('/api/admin/services')
      if (data.success) {
        setServices(data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement services:', error)
      showMessage('error', 'Impossible de charger les services')
    }
  }

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return

    try {
      setLoadingSlots(true)
      const { data } = await apiClient.get('/api/disponibilites/available', {
        params: {
          service_id: selectedService.id,
          date_debut: selectedDate,
          date_fin: selectedDate
        }
      })

      if (data.success && data.data?.available_slots) {
        // Stocker la fréquence des créneaux depuis l'API
        const apiSlotFrequency = data.data.slot_frequency_minutes || 30
        setSlotFrequency(apiSlotFrequency)

        console.log('📊 Config créneaux:', {
          service: selectedService.name,
          duration: selectedService.duration_minutes,
          slot_frequency: apiSlotFrequency,
          required_slots: data.data.required_slots_count
        })

        // 🔧 FIX : Stocker les GROUPES COMPLETS au lieu d'aplatir
        const groups: SlotGroup[] = data.data.available_slots.map((slot: any) => ({
          firstSlotId: slot.required_slots[0].id,
          startTime: slot.required_slots[0].heure,
          slots: slot.required_slots.map((rs: any) => ({
            id: rs.id,
            slot_date: slot.date,
            start_time: rs.heure,
            is_available: true
          }))
        }))
        
        setSlotGroups(groups)
        console.log('✅ Groupes de créneaux chargés:', groups.length)
      } else {
        setSlotGroups([])
      }
    } catch (error) {
      console.error('Erreur chargement créneaux:', error)
      showMessage('error', 'Impossible de charger les créneaux disponibles')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSlotClick = (group: SlotGroup) => {
    if (!selectedService) return
    
    console.log('🎯 Sélection groupe:', {
      service: selectedService.name,
      duration: selectedService.duration_minutes,
      start_time: group.startTime,
      slots_in_group: group.slots.length
    })
    
    // Sélectionner tous les créneaux du groupe
    setSelectedSlotIds(group.slots.map(s => s.id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedService || !selectedDate || selectedSlotIds.length === 0 || !customerName.trim()) {
      showMessage('error', 'Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)

      const firstGroup = slotGroups.find(g => g.slots.some(s => s.id === selectedSlotIds[0]))
      if (!firstGroup) {
        showMessage('error', 'Créneau invalide')
        return
      }

      const { data } = await apiClient.post('/api/admin/rendezvous/create', {
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        heure: firstGroup.startTime,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        internal_note: internalNote.trim() || null,
        required_slot_ids: selectedSlotIds
      })

      if (data.success) {
        showMessage('success', 'Rendez-vous créé avec succès')
        setTimeout(() => {
          router.push('/admin/rendezvous')
        }, 1500)
      } else {
        showMessage('error', data.error || 'Erreur lors de la création')
      }
    } catch (error: any) {
      console.error('Erreur création RDV:', error)
      showMessage('error', error.response?.data?.error || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const formatPrice = (service: Service) => {
    if (service.price_type === 'quote') return 'Sur devis'
    if (service.price_type === 'from') return `À partir de ${service.price_value}€`
    return `${service.price_value}€`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}` : `${h}h`
  }

  return (
    <div className="space-y-6">
      {/* Message feedback */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du service */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            Service
          </h2>
          
          <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-gray-500">Chargement des services...</p>
            ) : (
              <div className="grid gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedService(service)
                      setSelectedSlotIds([]) // Reset sélection créneaux
                    }}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedService?.id === service.id
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDuration(service.duration_minutes)}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {formatPrice(service)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sélection de la date */}
        {selectedService && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              Date
            </h2>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSelectedSlotIds([])
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Sélection de l'heure */}
        {selectedService && selectedDate && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              Heure
            </h2>

            {loadingSlots ? (
              <p className="text-sm text-gray-500">Chargement des créneaux...</p>
            ) : slotGroups.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun créneau disponible pour cette date</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slotGroups.map((group) => {
                  const isSelected = selectedSlotIds.includes(group.firstSlotId)

                  return (
                    <button
                      key={group.firstSlotId}
                      type="button"
                      onClick={() => handleSlotClick(group)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {group.startTime.substring(0, 5)}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedSlotIds.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {selectedSlotIds.length} créneau(x) sélectionné(s) — {formatDuration(selectedService.duration_minutes)}
              </p>
            )}
          </div>
        )}

        {/* Informations client */}
        {selectedSlotIds.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gray-400" />
              Informations client
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Marie Dupont"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="06 19 51 50 86"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="marie@example.com (optionnel)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utile pour les confirmations automatiques
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note interne (optionnel)
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Remarques, préférences..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push('/admin/rendezvous')}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Annuler
          </button>
          
          <button
            type="submit"
            disabled={loading || !selectedService || selectedSlotIds.length === 0 || !customerName.trim()}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Création...' : 'Créer le rendez-vous'}
          </button>
        </div>
      </form>
    </div>
  )
}
