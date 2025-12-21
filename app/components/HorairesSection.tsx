"use client";

import { motion } from "framer-motion";
import { usePublicSchedule } from "@/lib/hooks/usePublicSchedule";
import { fadeUp, staggerContainer, staggerItem, scrollRevealProps } from "@/lib/animations";
import { ClockIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function HorairesSection() {
  const { schedule, loading, error } = usePublicSchedule();

  if (loading) {
    return (
      <section id="horaires" className="py-20 bg-light">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="horaires" className="py-20 bg-light">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center text-red-600">
            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-3" />
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="horaires" className="py-20 bg-light">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          {...scrollRevealProps}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl font-brand font-bold mb-4 text-dark"
          >
            Horaires d'ouverture
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-600 mb-12"
          >
            Notre salon est ouvert du lundi au samedi
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto"
          >
            <div className="space-y-4">
              {schedule.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className={`flex justify-between items-center py-3 px-4 rounded-lg transition-colors ${
                    day.isOpen ? 'hover:bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ClockIcon className={`w-5 h-5 ${day.isOpen ? 'text-primary' : 'text-gray-300'}`} />
                    <span
                      className={`text-lg font-medium ${
                        day.isOpen ? 'text-dark' : 'text-gray-400'
                      }`}
                    >
                      {day.day}
                    </span>
                    {day.isExceptional && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        Exceptionnel
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {day.isOpen ? (
                      <span className="text-gray-700">
                        {day.ranges.map((r, i) => (
                          <span key={i}>
                            {r.start_time} – {r.end_time}
                            {i < day.ranges.length - 1 && ' / '}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-400">Fermé</span>
                    )}
                    
                    {day.isExceptional && day.exceptionalReason && (
                      <div className="text-xs text-gray-500 mt-1">
                        {day.exceptionalReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Les horaires peuvent varier pendant les jours fériés
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
