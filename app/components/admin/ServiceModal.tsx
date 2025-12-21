'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

/* ----------------------------------------
   Types
---------------------------------------- */

export interface ServiceFormData {
  name: string
  description?: string
  categoryId: string
  durationMinutes: number
  priceType: 'fixed' | 'from' | 'quote'
  priceValue?: number
  isVisible: boolean
  isFeatured: boolean
}

export type ServiceFormInitialData = ServiceFormData & {
  id?: string
}

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ServiceFormData) => Promise<void>
  categories: Array<{ id: string; name: string }>
  initialData?: ServiceFormInitialData
  defaultCategoryId?: string
  isLoading?: boolean
  currentFeaturedCount?: number
}

/* ----------------------------------------
   Toggle component
---------------------------------------- */

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700">{label}</span>

      <span className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-primary transition-colors" />
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function ServiceModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  isLoading = false,
  currentFeaturedCount = 0,
  defaultCategoryId,
}: ServiceModalProps) {
  const isEdit = Boolean(initialData?.id)

  const [priceType, setPriceType] = useState<ServiceFormData['priceType']>(
    initialData?.priceType ?? 'fixed'
  )

  const [formError, setFormError] = useState<string | null>(null)

  const categoryName =
    categories.find(c => c.id === (initialData?.categoryId ?? defaultCategoryId))
      ?.name ?? ''

  /* ----------------------------------------
     Submit
  ---------------------------------------- */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)

    const data: ServiceFormData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      categoryId: formData.get('categoryId') as string,
      durationMinutes: Number(formData.get('durationMinutes')),
      priceType: formData.get('priceType') as ServiceFormData['priceType'],
      priceValue:
        priceType !== 'quote'
          ? Number(formData.get('priceValue'))
          : undefined,
      isVisible: formData.get('isVisible') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
    }

    /* Validation métier */
    const wasFeatured = Boolean(initialData?.isFeatured)
    const effectiveFeaturedCount = wasFeatured
      ? Math.max(0, currentFeaturedCount - 1)
      : currentFeaturedCount

    if (data.isFeatured && effectiveFeaturedCount >= 3) {
      setFormError(
        'Vous ne pouvez avoir que 3 services mis en avant maximum.'
      )
      return
    }

    setFormError(null)
    await onSubmit(data)
  }

  /* ----------------------------------------
     Render
  ---------------------------------------- */

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
              <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {isEdit
                      ? `Modifier le service "${initialData?.name}"`
                      : `Nouveau service pour la catégorie "${categoryName}"`}
                  </Dialog.Title>

                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <input
                    type="hidden"
                    name="categoryId"
                    defaultValue={initialData?.categoryId ?? defaultCategoryId}
                  />

                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du service *
                    </label>
                    <input
                      name="name"
                      required
                      defaultValue={initialData?.name}
                      className="w-full px-3 py-2 border rounded-md focus:ring-primary"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={initialData?.description}
                      className="w-full px-3 py-2 border rounded-md resize-none"
                    />
                  </div>

                  {/* Durée */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Durée (minutes) *
                    </label>
                    <input
                      type="number"
                      name="durationMinutes"
                      min={5}
                      step={5}
                      required
                      defaultValue={initialData?.durationMinutes}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Prix */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tarification *
                    </label>

                    <div className="flex gap-4 mb-3">
                      {(['fixed', 'from', 'quote'] as const).map(type => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="priceType"
                            value={type}
                            defaultChecked={priceType === type}
                            onChange={() => setPriceType(type)}
                          />
                          {type === 'fixed'
                            ? 'Prix fixe'
                            : type === 'from'
                            ? 'À partir de'
                            : 'Sur devis'}
                        </label>
                      ))}
                    </div>

                    {priceType !== 'quote' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="priceValue"
                          min={0}
                          step="0.01"
                          required
                          defaultValue={initialData?.priceValue}
                          className="w-32 px-3 py-2 border rounded-md"
                        />
                        €
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-4 border-t pt-4">
                    <Toggle
                      name="isVisible"
                      label="Visible sur le site"
                      defaultChecked={initialData?.isVisible ?? true}
                    />

                    <Toggle
                      name="isFeatured"
                      label="Service mis en avant"
                      defaultChecked={initialData?.isFeatured ?? false}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    {formError && (
                      <p className="mr-auto text-sm text-red-600">{formError}</p>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-gray-700"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-primary text-white rounded-md"
                    >
                      {isLoading
                        ? 'Enregistrement...'
                        : isEdit
                        ? 'Enregistrer'
                        : 'Créer'}
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
