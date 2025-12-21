'use client'

import { motion } from 'framer-motion'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

interface SettingsPanelProps {
  frequency: number
  onFrequencyChange: (frequency: number) => void
}

const FREQUENCY_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 heure' },
]

export default function SettingsPanel({ frequency, onFrequencyChange }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-5"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <Cog6ToothIcon className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Paramètres des créneaux</h3>
          <p className="text-xs text-gray-500 mb-3">
            Définissez la fréquence des créneaux horaires disponibles
          </p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onFrequencyChange(option.value)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  frequency === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
