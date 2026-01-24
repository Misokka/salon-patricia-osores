'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  UserGroupIcon, 
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { getStaffColor } from '@/app/components/admin/agenda/TimeGrid'

interface StaffMember {
  id: string
  name: string
  is_active: boolean
  position: number
  created_at: string
}

type Tab = 'members' | 'absences'

// ============================================================
// TIMEZONE UTILITIES (Europe/Paris)
// ============================================================

const SALON_TIMEZONE = 'Europe/Paris'

/**
 * Convertit une date+heure locale du salon en ISO string avec timezone
 * @param dateStr YYYY-MM-DD
 * @param timeStr HH:mm
 * @returns ISO string avec offset (ex: 2026-01-18T08:00:00+01:00)
 */
function formatLocalDateTimeToISO(dateStr: string, timeStr: string): string {
  // Parser les composants
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  // Créer une date dans la timezone du salon
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset'
  })

  // Créer une date temporaire pour obtenir l'offset
  const tempDate = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes, 0))
  const parts = formatter.formatToParts(tempDate)
  const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00'

  // Construire l'ISO avec offset
  const isoWithOffset = `${dateStr}T${timeStr}:00${offset.replace('GMT', '')}`
  return isoWithOffset
}

/**
 * Parse une date ISO (avec timezone) et retourne les composants en heure locale salon
 * @param isoString Date ISO (ex: 2026-01-18T08:00:00+01:00)
 * @returns { date: 'YYYY-MM-DD', time: 'HH:mm' }
 */
function parseISOToLocalDateTime(isoString: string): { date: string; time: string } {
  const date = new Date(isoString)
  
  // Formater en timezone salon
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`
  }
}

/**
 * Formate une date ISO en texte français avec timezone salon
 */
function formatDateTimeToFrench(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: SALON_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour le formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  
  // États pour l'édition
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  // Message de feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchStaffMembers()
  }, [])

  const fetchStaffMembers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/staff-members')
      if (response.data.success) {
        setStaffMembers(response.data.data)
      } else {
        setError('Impossible de charger l\'équipe')
      }
    } catch (err) {
      console.error('Erreur chargement équipe:', err)
      setError('Erreur lors du chargement de l\'équipe')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    try {
      setAdding(true)
      const response = await axios.post('/api/admin/staff-members', {
        name: newName.trim()
      })
      
      if (response.data.success) {
        setStaffMembers(prev => [...prev, response.data.data])
        setNewName('')
        setShowAddForm(false)
        showMessage('success', 'Membre ajouté avec succès')
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de l\'ajout')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    try {
      setSaving(true)
      const response = await axios.patch(`/api/admin/staff-members/${member.id}`, {
        is_active: !member.is_active
      })
      
      if (response.data.success) {
        setStaffMembers(prev => prev.map(m => 
          m.id === member.id ? { ...m, is_active: !m.is_active } : m
        ))
        showMessage('success', member.is_active ? 'Membre désactivé' : 'Membre activé')
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editingName.trim()) return

    try {
      setSaving(true)
      const response = await axios.patch(`/api/admin/staff-members/${id}`, {
        name: editingName.trim()
      })
      
      if (response.data.success) {
        setStaffMembers(prev => prev.map(m => 
          m.id === id ? { ...m, name: editingName.trim() } : m
        ))
        setEditingId(null)
        setEditingName('')
        showMessage('success', 'Nom modifié avec succès')
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Supprimer "${member.name}" de l'équipe ?`)) return

    try {
      setSaving(true)
      const response = await axios.delete(`/api/admin/staff-members/${member.id}`)
      
      if (response.data.success) {
        setStaffMembers(prev => prev.filter(m => m.id !== member.id))
        showMessage('success', 'Membre supprimé')
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <UserGroupIcon className="w-7 h-7 text-primary" />
          Équipe
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les membres de votre équipe et leurs absences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              Membres ({staffMembers.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'absences'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5" />
              Absences
            </span>
          </button>
        </nav>
      </div>

      {/* Message de feedback */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'members' && (
        <>
          {/* Header action */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Ajouter un membre
            </button>
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
              <h3 className="font-medium mb-3">Nouveau membre</h3>
              <form onSubmit={handleAdd} className="flex gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom du membre"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={adding || !newName.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewName('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

          {/* Liste des membres */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {staffMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun membre dans l'équipe
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
            {staffMembers.map((member) => {
              const color = getStaffColor(member.id)
              const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              
              return (
              <li key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  {/* Info membre */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${color.bg} border-2 ${color.border} ${color.text} flex items-center justify-center font-medium text-sm ${
                      !member.is_active ? 'opacity-50' : ''
                    }`}>
                      {initials}
                    </div>
                    
                    {editingId === member.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(member.id)
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                      />
                    ) : (
                      <div>
                        <span className="font-medium text-gray-900">{member.name}</span>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          {member.is_active ? (
                            <>
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                              <span className="text-green-600">Actif</span>
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Inactif</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {editingId === member.id ? (
                      <>
                        <button
                          onClick={() => handleEdit(member.id)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(member.id)
                            setEditingName(member.name)
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Modifier le nom"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={saving}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            member.is_active 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50`}
                          title={member.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {member.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={saving}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
              )
            })}
              </ul>
            )}
          </div>

          {/* Astuce */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Astuce :</strong> Chaque salon doit avoir au moins un membre actif. 
              Les membres inactifs ne seront pas disponibles pour les réservations.
            </p>
          </div>
        </>
      )}

      {activeTab === 'absences' && (
        <AbsencesTab staffMembers={staffMembers} showMessage={showMessage} />
      )}
    </div>
  )
}

// ============================================================
// COMPOSANT : Onglet Absences
// ============================================================

interface Absence {
  id: string
  staff_member_id: string
  staff_name: string
  start_datetime: string
  end_datetime: string
  reason: string | null
  created_at: string
}

interface AbsencesTabProps {
  staffMembers: StaffMember[]
  showMessage: (type: 'success' | 'error', text: string) => void
}

function AbsencesTab({ staffMembers, showMessage }: AbsencesTabProps) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Formulaire
  const [formData, setFormData] = useState({
    staff_member_id: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '18:00',
    reason: ''
  })

  // Édition
  const [editingId, setEditingId] = useState<string | null>(null)

  // Step 7.1 : Détection de conflits
  const [conflictCount, setConflictCount] = useState<number>(0)
  const [conflictAppointments, setConflictAppointments] = useState<any[]>([])
  const [showConflictDetails, setShowConflictDetails] = useState(false)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  useEffect(() => {
    fetchAbsences()
  }, [])

  // Step 7.1 : Vérifier les conflits quand les données du formulaire changent
  useEffect(() => {
    const checkConflicts = async () => {
      // Réinitialiser si données incomplètes
      if (!formData.staff_member_id || !formData.start_date || !formData.end_date) {
        setConflictCount(0)
        setConflictAppointments([])
        return
      }

      try {
        setCheckingConflicts(true)
        const start_datetime = formatLocalDateTimeToISO(formData.start_date, formData.start_time)
        const end_datetime = formatLocalDateTimeToISO(formData.end_date, formData.end_time)

        const response = await axios.get('/api/admin/absence-conflicts', {
          params: {
            staff_member_id: formData.staff_member_id,
            start_datetime,
            end_datetime
          }
        })

        if (response.data.success) {
          setConflictCount(response.data.data.count)
          setConflictAppointments(response.data.data.appointments)
        }
      } catch (err) {
        console.error('Erreur vérification conflits:', err)
      } finally {
        setCheckingConflicts(false)
      }
    }

    // Debounce pour éviter trop de requêtes
    const timer = setTimeout(checkConflicts, 500)
    return () => clearTimeout(timer)
  }, [formData.staff_member_id, formData.start_date, formData.start_time, formData.end_date, formData.end_time])

  const fetchAbsences = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/staff-absences')
      if (response.data.success) {
        setAbsences(response.data.data)
      }
    } catch (err) {
      console.error('Erreur chargement absences:', err)
      showMessage('error', 'Erreur lors du chargement des absences')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      staff_member_id: '',
      start_date: '',
      start_time: '09:00',
      end_date: '',
      end_time: '18:00',
      reason: ''
    })
    setShowAddForm(false)
    setEditingId(null)
    // Step 7.1 : Reset conflits
    setConflictCount(0)
    setConflictAppointments([])
    setShowConflictDetails(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.staff_member_id || !formData.start_date || !formData.end_date) {
      showMessage('error', 'Veuillez remplir tous les champs obligatoires')
      return
    }

    // FIX TIMEZONE: Convertir les dates locales en ISO avec timezone salon
    const start_datetime = formatLocalDateTimeToISO(formData.start_date, formData.start_time)
    const end_datetime = formatLocalDateTimeToISO(formData.end_date, formData.end_time)

    try {
      setSaving(true)

      if (editingId) {
        // Mise à jour
        const response = await axios.put('/api/admin/staff-absences', {
          id: editingId,
          start_datetime,
          end_datetime,
          reason: formData.reason || null
        })

        if (response.data.success) {
          setAbsences(prev => prev.map(a => 
            a.id === editingId ? response.data.data : a
          ))
          showMessage('success', 'Absence modifiée')
          resetForm()
        }
      } else {
        // Création
        const response = await axios.post('/api/admin/staff-absences', {
          staff_member_id: formData.staff_member_id,
          start_datetime,
          end_datetime,
          reason: formData.reason || null
        })

        if (response.data.success) {
          await fetchAbsences() // Recharger pour avoir staff_name
          showMessage('success', 'Absence ajoutée')
          resetForm()
        }
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (absence: Absence) => {
    // FIX TIMEZONE: Parser en timezone salon
    const startLocal = parseISOToLocalDateTime(absence.start_datetime)
    const endLocal = parseISOToLocalDateTime(absence.end_datetime)

    setFormData({
      staff_member_id: absence.staff_member_id,
      start_date: startLocal.date,
      start_time: startLocal.time,
      end_date: endLocal.date,
      end_time: endLocal.time,
      reason: absence.reason || ''
    })
    setEditingId(absence.id)
    setShowAddForm(true)
  }

  // État pour la modale de suppression
  const [deleteConfirm, setDeleteConfirm] = useState<Absence | null>(null)

  const handleDeleteClick = (absence: Absence) => {
    setDeleteConfirm(absence)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    try {
      setSaving(true)
      const response = await axios.delete(`/api/admin/staff-absences?id=${deleteConfirm.id}`)
      
      if (response.data.success) {
        setAbsences(prev => prev.filter(a => a.id !== deleteConfirm.id))
        showMessage('success', 'Absence supprimée')
        setDeleteConfirm(null)
      }
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (datetime: string) => {
    // FIX TIMEZONE: Formater en timezone salon
    return formatDateTimeToFrench(datetime)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  const activeStaff = staffMembers.filter(s => s.is_active)

  return (
    <div>
      {/* Header action */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          {showAddForm ? 'Annuler' : 'Ajouter une absence'}
        </button>
      </div>

      {/* Formulaire */}
      {showAddForm && (
        <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="font-medium mb-4">
            {editingId ? 'Modifier l\'absence' : 'Nouvelle absence'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Staff member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membre <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staff_member_id}
                onChange={(e) => setFormData(prev => ({ ...prev, staff_member_id: e.target.value }))}
                disabled={!!editingId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                required
              >
                <option value="">Sélectionner un membre</option>
                {activeStaff.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure début
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure fin
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Raison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif (optionnel)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Congés, Maladie, Formation..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Step 7.1 : Alerte conflits */}
            {conflictCount > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">
                      {conflictCount} rendez-vous concerné{conflictCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Cette absence chevauche des rendez-vous existants. Ils devront être réassignés ou annulés.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowConflictDetails(!showConflictDetails)}
                      className="text-sm text-amber-700 underline hover:text-amber-900 mt-2"
                    >
                      {showConflictDetails ? 'Masquer les détails' : 'Voir les rendez-vous concernés'}
                    </button>
                    
                    {showConflictDetails && conflictAppointments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {conflictAppointments.map((appt) => (
                          <div key={appt.appointment_id} className="bg-white rounded p-3 border border-amber-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{appt.customer_name}</p>
                                <p className="text-sm text-gray-600">{appt.service_name}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                appt.status === 'accepted' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {appt.status === 'accepted' ? 'Confirmé' : 'En attente'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(appt.appointment_date).toLocaleDateString('fr-FR', { 
                                weekday: 'long', day: 'numeric', month: 'long' 
                              })} à {appt.start_time.slice(0, 5)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Ajouter')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des absences */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {absences.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune absence enregistrée</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {absences.map((absence) => (
              <li key={absence.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{absence.staff_name}</span>
                      {absence.reason && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          {absence.reason}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Du : {formatDate(absence.start_datetime)}</div>
                      <div>Au : {formatDate(absence.end_datetime)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(absence)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(absence)}
                      disabled={saving}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Info :</strong> Les membres en absence ne seront pas disponibles pour les réservations pendant cette période. 
          Les autres membres restent disponibles.
        </p>
      </div>
      {/* Modale de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Supprimer l'absence</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Êtes-vous sûr de vouloir supprimer cette absence de <strong>{deleteConfirm.staff_name}</strong> ?
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
              <div className="text-gray-600">Du : {formatDate(deleteConfirm.start_datetime)}</div>
              <div className="text-gray-600">Au : {formatDate(deleteConfirm.end_datetime)}</div>
              {deleteConfirm.reason && (
                <div className="text-gray-600 mt-1">Motif : <span className="font-medium">{deleteConfirm.reason}</span></div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  )
}
