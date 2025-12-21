export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'cancelled'

export interface Appointment {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  service_id?: string
  service_name?: string
  appointment_date: string // YYYY-MM-DD
  start_time: string // HH:mm
  end_time?: string
  created_at?: string
  status: AppointmentStatus
  notes?: string | null
}

export interface AppointmentWithDetails extends Appointment {
  /* Service */
  service_duration?: number
  service_price?: number
}
