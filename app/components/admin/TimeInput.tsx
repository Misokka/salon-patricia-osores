'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  required?: boolean
}

export default function TimeInput({
  value,
  onChange,
  label,
  required = false,
}: TimeInputProps) {
  const [hours, setHours] = useState('09')
  const [minutes, setMinutes] = useState('00')

  const hoursRef = useRef<HTMLInputElement>(null)
  const minutesRef = useRef<HTMLInputElement>(null)

  // Empêche la boucle parent <-> local
  const isSyncingFromParent = useRef(false)

  /* -----------------------------
     Sync parent -> local state
  ------------------------------ */
  useEffect(() => {
    if (!value) return

    const [h = '09', m = '00'] = value.split(':')

    isSyncingFromParent.current = true
    setHours(h)
    setMinutes(m)
  }, [value])

  /* -----------------------------
     Sync local state -> parent
  ------------------------------ */
  useEffect(() => {
    if (isSyncingFromParent.current) {
      isSyncingFromParent.current = false
      return
    }

    const newValue = `${hours}:${minutes}`
    if (newValue !== value) {
      onChange(newValue)
    }
  }, [hours, minutes, value, onChange])

  /* -----------------------------
     Helpers
  ------------------------------ */
  const incrementHours = () => {
    const h = parseInt(hours, 10)
    const next = h === 23 ? 0 : h + 1
    setHours(String(next).padStart(2, '0'))
  }

  const decrementHours = () => {
    const h = parseInt(hours, 10)
    const next = h === 0 ? 23 : h - 1
    setHours(String(next).padStart(2, '0'))
  }

  const incrementMinutes = () => {
    const m = parseInt(minutes, 10)
    let next = m + 5

    if (next >= 60) {
      next = 0
      incrementHours()
    }

    setMinutes(String(next).padStart(2, '0'))
  }

  const decrementMinutes = () => {
    const m = parseInt(minutes, 10)
    let next = m - 5

    if (next < 0) {
      next = 55
      decrementHours()
    }

    setMinutes(String(next).padStart(2, '0'))
  }

  /* -----------------------------
     Input handlers
  ------------------------------ */
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)

    if (val === '') {
      setHours('00')
      return
    }

    const num = parseInt(val, 10)
    if (num > 23) val = '23'

    setHours(val.padStart(2, '0'))
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2)

    if (val === '') {
      setMinutes('00')
      return
    }

    const num = parseInt(val, 10)
    const rounded = Math.round(num / 5) * 5

    if (rounded >= 60) {
      setMinutes('55')
    } else {
      setMinutes(String(rounded).padStart(2, '0'))
    }
  }

  const handleHoursBlur = () => {
    if (!hours) setHours('00')
  }

  const handleMinutesBlur = () => {
    if (!minutes) setMinutes('00')
  }

  /* -----------------------------
     Render
  ------------------------------ */
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex items-center gap-2">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementHours}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronUpIcon className="w-4 h-4 text-gray-600" />
          </button>

          <input
            ref={hoursRef}
            type="text"
            value={hours}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            maxLength={2}
            className="w-16 text-center text-2xl font-semibold text-gray-900 border-0 focus:ring-2 focus:ring-primary rounded-md py-2"
          />

          <button
            type="button"
            onClick={decrementHours}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <span className="text-2xl font-bold text-gray-400">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={incrementMinutes}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronUpIcon className="w-4 h-4 text-gray-600" />
          </button>

          <input
            ref={minutesRef}
            type="text"
            value={minutes}
            onChange={handleMinutesChange}
            onBlur={handleMinutesBlur}
            maxLength={2}
            className="w-16 text-center text-2xl font-semibold text-gray-900 border-0 focus:ring-2 focus:ring-primary rounded-md py-2"
          />

          <button
            type="button"
            onClick={decrementMinutes}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="ml-2 text-xs text-gray-500">
          <div>↑↓ pour ajuster</div>
          <div>Par pas de 5 min</div>
        </div>
      </div>
    </div>
  )
}
