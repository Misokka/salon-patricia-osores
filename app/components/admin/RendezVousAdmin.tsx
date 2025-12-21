'use client'

import { useMemo, useState, useEffect } from 'react'
import { isToday, isThisWeek, isBefore, startOfDay } from 'date-fns'
import axios from 'axios'
import { AnimatePresence } from 'framer-motion'

import RendezVousCard, { type RendezVous } from './RendezVousCard'
import FilterBar, { type FilterStatus, type FilterPeriod } from './FilterBar'
import RefreshButton from './RefreshButton'

export default function RendezVousAdmin() {
  /* ===============================
     State
  =============================== */
  const [items, setItems] = useState<RendezVous[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('tous')
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('a_venir')
  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  /* ===============================
     Effects
  =============================== */
  useEffect(() => {
    fetchRendezVous()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, periodFilter, searchQuery])

  /* ===============================
     API
  =============================== */
  async function fetchRendezVous() {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/admin/rendezvous')
      if (data.success) {
        setItems(data.data || [])
      }
    } catch (e) {
      console.error(e)
      showMessage('error', 'Erreur lors du chargement des rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(
    id: string,
    status: 'accepted' | 'refused' | 'cancelled'
  ) {
    const backup = items.find(r => r.id === id)

    try {
      setUpdating(id)
      setItems(prev =>
        prev.map(r => (r.id === id ? { ...r, status } : r))
      )

      await axios.patch('/api/admin/rendezvous', { id, status })

      const messages = {
        accepted: 'Rendez-vous confirmé',
        refused: 'Rendez-vous refusé',
        cancelled: 'Rendez-vous annulé (créneaux libérés)',
      }

      showMessage('success', messages[status])
    } catch (e) {
      if (backup) {
        setItems(prev =>
          prev.map(r => (r.id === id ? backup : r))
        )
      }
      showMessage('error', 'Erreur lors de la mise à jour')
    } finally {
      setUpdating(null)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  /* ===============================
     Computed
  =============================== */
  const counts = useMemo(
    () => ({
      tous: items.length,
      en_attente: items.filter(r => r.status === 'pending').length,
      accepte: items.filter(r => r.status === 'accepted').length,
      refuse: items.filter(r => r.status === 'refused').length,
    }),
    [items]
  )

  const allFilteredItems = useMemo(() => {
    const today = startOfDay(new Date())

    return items
      .filter(rdv => {
        if (statusFilter !== 'tous') {
          const map = {
            en_attente: 'pending',
            accepte: 'accepted',
            refuse: 'refused',
          } as const

          if (rdv.status !== map[statusFilter]) return false
        }

        const rdvDate = new Date(
          `${rdv.appointment_date}T${rdv.start_time}`
        )

        if (periodFilter === 'aujourdhui' && !isToday(rdvDate)) return false
        if (
          periodFilter === 'semaine' &&
          !isThisWeek(rdvDate, { weekStartsOn: 1 })
        )
          return false
        if (periodFilter === 'a_venir' && isBefore(rdvDate, today)) return false
        if (periodFilter === 'passes' && !isBefore(rdvDate, today)) return false

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            rdv.customer_name.toLowerCase().includes(q) ||
            rdv.service_name.toLowerCase().includes(q) ||
            (rdv.customer_email ?? '').toLowerCase().includes(q) ||
            rdv.customer_phone.includes(q)
          )
        }

        return true
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return `${a.appointment_date} ${a.start_time}`.localeCompare(
          `${b.appointment_date} ${b.start_time}`
        )
      })
  }, [items, statusFilter, periodFilter, searchQuery])

  const filteredItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return allFilteredItems.slice(start, start + itemsPerPage)
  }, [allFilteredItems, currentPage])

  /* ===============================
     Render
  =============================== */
  if (loading) {
    return <div className="p-12 text-center">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      <FilterBar
        statusFilter={statusFilter}
        periodFilter={periodFilter}
        searchQuery={searchQuery}
        onStatusChange={setStatusFilter}
        onPeriodChange={setPeriodFilter}
        onSearchChange={setSearchQuery}
        counts={counts}
      />

      <div className="flex justify-start">
        <RefreshButton onRefresh={fetchRendezVous} loading={loading} />
      </div>

      <AnimatePresence>
        {filteredItems.map(rdv => (
          <RendezVousCard
            key={rdv.id}
            rdv={rdv}
            onAccept={rdv.status === 'pending' ? updateStatus : undefined}
            onReject={rdv.status === 'pending' ? updateStatus : undefined}
            onCancel={
              rdv.status === 'accepted' || rdv.status === 'pending'
                ? updateStatus
                : undefined
            }
            onEdit={
              rdv.status === 'accepted'
                ? () => {
                    // 🔥 À brancher vers modale ou page édition
                    console.log('Modifier RDV', rdv.id)
                  }
                : undefined
            }
            isUpdating={updating === rdv.id}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
