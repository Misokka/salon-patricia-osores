'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CategoryFormData) => Promise<void>
  initialData?: {
    id?: string
    name: string
    color?: string
  }
  isLoading?: boolean
}

export interface CategoryFormData {
  name: string
  color?: string
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: CategoryModalProps) {
  const isEdit = !!initialData?.id

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: CategoryFormData = {
      name: formData.get('name') as string,
      color: (formData.get('color') as string) || undefined,
    }
    await onSubmit(data)
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                  <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900">
                    {isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                  {/* Nom */}
                  <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Nom de la catégorie *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      defaultValue={initialData?.name}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: Coupes & Coiffures"
                    />
                  </div>

                  {/* Couleur */}
                  <div>
                    <label htmlFor="color" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Couleur (optionnelle)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="color"
                        name="color"
                        defaultValue={initialData?.color || '#BFA14A'}
                        className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                      />
                      <span className="text-xs text-gray-500">
                        Couleur pour identifier visuellement la catégorie
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
