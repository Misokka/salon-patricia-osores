'use client'

import { useState, useEffect } from 'react'

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

  const handleToggleAll = () => {
    if (allSelected) {
      // Désélectionner tous -> garder au moins le premier
      onVisibilityChange([collaborators[0]?.id].filter(Boolean))
    } else {
      // Sélectionner tous
      onVisibilityChange(collaborators.map(c => c.id))
    }
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
        Collaborateurs
      </h3>

      <div className="space-y-2">
        {/* Option "Tous" */}
        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-700">
            Tous
          </span>
        </label>

        {/* Liste collaborateurs */}
        <div className="border-t border-gray-200 pt-2 space-y-2">
          {collaborators.map(collaborator => {
            const isChecked = visibleCollaboratorIds.includes(collaborator.id)

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
                <span className="text-sm text-gray-700">
                  {collaborator.name}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {collaborators.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          Aucun collaborateur configuré
        </p>
      )}
    </div>
  )
}
