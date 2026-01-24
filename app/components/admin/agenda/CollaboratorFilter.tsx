'use client'

import { useState, useEffect } from 'react'
import { getStaffColor } from './TimeGrid'

export interface Collaborator {
  id: string
  name: string
}

interface CollaboratorFilterProps {
  collaborators: Collaborator[]
  visibleCollaboratorIds: string[]
  onVisibilityChange: (ids: string[]) => void
}

export default function CollaboratorFilter({
  collaborators,
  visibleCollaboratorIds,
  onVisibilityChange,
}: CollaboratorFilterProps) {
  const allSelected = visibleCollaboratorIds.length === collaborators.length
  const noneSelected = visibleCollaboratorIds.length === 0

  const handleSelectAll = () => {
    onVisibilityChange(collaborators.map(c => c.id))
  }

  const handleSelectNone = () => {
    // Garder au moins 1 visible pour éviter un affichage vide
    onVisibilityChange([collaborators[0]?.id].filter(Boolean))
  }

  const handleToggleCollaborator = (id: string) => {
    if (visibleCollaboratorIds.includes(id)) {
      // Désélection: garder au moins 1 collaborateur visible
      const newIds = visibleCollaboratorIds.filter(cid => cid !== id)
      if (newIds.length > 0) {
        onVisibilityChange(newIds)
      }
    } else {
      // Sélection
      onVisibilityChange([...visibleCollaboratorIds, id])
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">
        Membres de l'équipe
      </h3>

      {/* Boutons Tous / Aucun */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelectAll}
          disabled={allSelected}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tous
        </button>
        <button
          onClick={handleSelectNone}
          disabled={visibleCollaboratorIds.length <= 1}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Un seul
        </button>
      </div>

      <div className="space-y-2">
        {/* Liste collaborateurs */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {collaborators.map(collaborator => {
            const isChecked = visibleCollaboratorIds.includes(collaborator.id)
            const color = getStaffColor(collaborator.id)
            const initials = collaborator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

            return (
              <label
                key={collaborator.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleCollaborator(collaborator.id)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${color.bg} border ${color.border} ${color.text} flex items-center justify-center text-[10px] font-medium`}>
                    {initials}
                  </div>
                  <span className="text-sm text-gray-700">
                    {collaborator.name}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {collaborators.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          Aucun membre configuré
        </p>
      )}
      
      {/* Info */}
      <p className="text-xs text-gray-400 mt-3">
        {visibleCollaboratorIds.length} / {collaborators.length} visible{visibleCollaboratorIds.length > 1 ? 's' : ''}
      </p>
    </div>
  )
}
