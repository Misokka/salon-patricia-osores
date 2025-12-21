'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface TimeRange {
  start_time: string
  end_time: string
}

export interface DaySchedule {
  day: string
  dayOfWeek: number
  isOpen: boolean
  isExceptional: boolean
  exceptionalReason?: string
  ranges: TimeRange[]
}

interface UsePublicScheduleReturn {
  schedule: DaySchedule[]
  loading: boolean
  error: string | null
  formatted: Array<{ jour: string; heures: string }>
}

/**
 * Hook pour récupérer les horaires du salon (standards + exceptionnels)
 * Retourne également un format pré-formaté pour l'affichage
 */
export function usePublicSchedule(): UsePublicScheduleReturn {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axios.get('/api/public/horaires')
        
        if (response.data.success) {
          setSchedule(response.data.data)
        } else {
          throw new Error('Erreur lors de la récupération des horaires')
        }
      } catch (err) {
        console.error('Erreur chargement horaires:', err)
        setError('Impossible de charger les horaires')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  // Format pour l'affichage (compatible avec l'ancien système)
  const formatted = schedule.map((day) => {
    if (!day.isOpen) {
      return {
        jour: day.day,
        heures: 'Fermé',
      }
    }

    if (day.ranges.length === 0) {
      return {
        jour: day.day,
        heures: 'Fermé',
      }
    }

    const horaireStr = day.ranges
      .map((r) => `${r.start_time} – ${r.end_time}`)
      .join(' / ')

    return {
      jour: day.day,
      heures: horaireStr,
    }
  })

  return {
    schedule,
    loading,
    error,
    formatted,
  }
}
