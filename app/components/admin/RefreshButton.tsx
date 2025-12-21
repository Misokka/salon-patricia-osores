'use client'

import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>
  loading?: boolean
  label?: string
}

export default function RefreshButton({
  onRefresh,
  loading = false,
  label = 'Actualiser',
}: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="
        inline-flex items-center gap-2
        px-3 py-2
        text-sm font-medium
        border rounded-md
        text-gray-700
        hover:bg-gray-100
        disabled:opacity-50
        disabled:cursor-not-allowed
      "
    >
      <ArrowPathIcon
        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
      />
      {label}
    </button>
  )
}
