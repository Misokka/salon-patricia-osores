'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import MiniCalendar from './MiniCalendar'
import CollaboratorFilter, { Collaborator } from './CollaboratorFilter'

interface MobileFiltersDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentDate: Date
  onDateSelect: (date: Date) => void
  collaborators: Collaborator[]
  visibleCollaboratorIds: string[]
  onVisibilityChange: (ids: string[]) => void
  staffViewMode: boolean
  onStaffViewModeToggle: () => void
}

export default function MobileFiltersDrawer({
  isOpen,
  onClose,
  currentDate,
  onDateSelect,
  collaborators,
  visibleCollaboratorIds,
  onVisibilityChange,
  staffViewMode,
  onStaffViewModeToggle,
}: MobileFiltersDrawerProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        {/* Drawer */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-sm">
                  <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-primary px-4 py-6 sm:px-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
                          <AdjustmentsHorizontalIcon className="w-6 h-6" />
                          Filtres
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-white hover:text-gray-200 focus:outline-none"
                          onClick={onClose}
                        >
                          <span className="sr-only">Fermer</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Mini calendrier */}
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Calendrier</h3>
                        <MiniCalendar
                          selectedDate={currentDate}
                          onDateSelect={(date) => {
                            onDateSelect(date)
                            // Fermer le drawer après sélection de date
                            onClose()
                          }}
                        />
                      </div>

                      {/* Filtres collaborateurs */}
                      {collaborators.length > 0 && (
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Membres de l'équipe</h3>
                          
                          {/* Toggle Vue par membre */}
                          <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Vue par membre</span>
                            <button
                              onClick={onStaffViewModeToggle}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                staffViewMode ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  staffViewMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          
                          {staffViewMode && (
                            <div className="mb-3 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
                              En vue jour : colonnes par membre. En vue semaine : matrice jours × membres.
                            </div>
                          )}
                          
                          <CollaboratorFilter
                            collaborators={collaborators}
                            visibleCollaboratorIds={visibleCollaboratorIds}
                            onVisibilityChange={onVisibilityChange}
                          />
                        </div>
                      )}

                      {/* Info aide */}
                      <div className="p-4 bg-blue-50">
                        <p className="text-xs text-blue-700">
                          <strong>Astuce :</strong> Cliquez sur un rendez-vous pour voir les détails complets.
                        </p>
                      </div>
                    </div>

                    {/* Footer avec bouton fermer */}
                    <div className="border-t border-gray-200 px-4 py-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Appliquer les filtres
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
