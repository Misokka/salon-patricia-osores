'use client'

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { format, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import RefreshButton from './../RefreshButton'


export type ViewMode = 'day' | 'week'
export type TimeInterval = 5 | 10 | 15 | 20 | 30 | 60

interface AgendaHeaderProps {
  currentDate: Date
  viewMode: ViewMode
  timeInterval: TimeInterval
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  onTimeIntervalChange: (interval: TimeInterval) => void
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
}

export default function AgendaHeader({
  currentDate,
  viewMode,
  timeInterval,
  onPrevious,
  onNext,
  onToday,
  onViewModeChange,
  onTimeIntervalChange,
  onRefresh,
  refreshing = false,
}: AgendaHeaderProps) {
  const intervals: TimeInterval[] = [5, 10, 15, 20, 30, 60]

  // Format de la date affichée
  const getDateLabel = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
    } else {
      // Pour la semaine, afficher "Semaine du X au Y"
      return format(currentDate, "'Semaine' w - MMMM yyyy", { locale: fr })
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-20 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Section gauche: Navigation date */}
        <div className="flex items-center gap-3">
          {/* Bouton Aujourd'hui */}
          {onRefresh && (
            <RefreshButton
              onRefresh={onRefresh}
              loading={refreshing}
              label="Actualiser"
            />
          )}
          <button
            onClick={onToday}
            disabled={isToday(currentDate)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aujourd'hui
          </button>

          

          {/* Navigation précédent/suivant */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevious}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={viewMode === 'day' ? 'Jour précédent' : 'Semaine précédente'}
            >
              <FaChevronLeft className="text-sm" />
            </button>
            <button
              onClick={onNext}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={viewMode === 'day' ? 'Jour suivant' : 'Semaine suivante'}
            >
              <FaChevronRight className="text-sm" />
            </button>
          </div>

          {/* Label date */}
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 capitalize min-w-0 sm:min-w-[280px]">
            {getDateLabel()}
          </h2>
        </div>

        {/* Section droite: Contrôles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Toggle Vue jour/semaine */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('day')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semaine
            </button>
          </div>

          {/* Sélecteur intervalle visuel */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:inline">Intervalle:</span>
            <select
              value={timeInterval}
              onChange={(e) => onTimeIntervalChange(Number(e.target.value) as TimeInterval)}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {intervals.map((interval) => (
                <option key={interval} value={interval}>
                  {interval} min
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
