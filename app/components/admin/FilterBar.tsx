'use client'

import { motion } from 'framer-motion'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

export type FilterStatus = 'tous' | 'en_attente' | 'accepte' | 'refuse'
export type FilterPeriod = 'tous' | 'aujourdhui' | 'semaine' | 'a_venir' | 'passes'

interface FilterBarProps {
  statusFilter: FilterStatus
  periodFilter: FilterPeriod
  searchQuery: string
  onStatusChange: (status: FilterStatus) => void
  onPeriodChange: (period: FilterPeriod) => void
  onSearchChange: (query: string) => void
  counts: {
    tous: number
    en_attente: number
    accepte: number
    refuse: number
  }
}

export default function FilterBar({
  statusFilter,
  periodFilter,
  searchQuery,
  onStatusChange,
  onPeriodChange,
  onSearchChange,
  counts,
}: FilterBarProps) {
  
  const statusOptions: { value: FilterStatus; label: string; color: string }[] = [
    { value: 'tous', label: 'Tous', color: 'gray' },
    { value: 'en_attente', label: 'En attente', color: 'amber' },
    { value: 'accepte', label: 'Confirmés', color: 'green' },
    { value: 'refuse', label: 'Refusés', color: 'red' },
  ]

  const periodOptions: { value: FilterPeriod; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'aujourdhui', label: 'Aujourd\'hui' },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'a_venir', label: 'À venir' },
    { value: 'passes', label: 'Passés' },
  ]

  const getStatusColorClass = (color: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
    }
    
    switch (color) {
      case 'amber':
        return 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200'
      case 'green':
        return 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200'
      case 'red':
        return 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200'
      default:
        return 'bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/20'
    }
  }

  const hasActiveFilters = statusFilter !== 'tous' || periodFilter !== 'tous' || searchQuery !== ''

  const clearAllFilters = () => {
    onStatusChange('tous')
    onPeriodChange('tous')
    onSearchChange('')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
      {/* Recherche */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom ou service..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
        )}
      </div>

      {/* Filtres statut */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs sm:text-sm font-medium text-gray-700">Statut</span>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all border ${getStatusColorClass(
                option.color,
                statusFilter === option.value
              )}`}
            >
              {option.label}
              <span className="ml-1.5 text-xs opacity-75">
                ({option.value === 'tous' ? counts.tous : counts[option.value]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtres période */}
      <div>
        <span className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Période</span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                periodFilter === option.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={clearAllFilters}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
          Réinitialiser les filtres
        </motion.button>
      )}
    </div>
  )
}
