import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { getDefaultSalonId } from '@/lib/salonContext'

export async function GET() {
  const salonId = getDefaultSalonId()

  const { data, error } = await supabase
    .from('service_categories')
    .select(`
      id,
      name,
      position,
      services (
        id,
        name,
        description,
        duration_minutes,
        price_type,
        price_value,
        is_visible
      )
    `)
    .eq('salon_id', salonId)
    .order('position')

  if (error) {
    console.error(error)
    return NextResponse.json({ success: false }, { status: 500 })
  }

  const categories = data
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      services: cat.services.filter((s: any) => s.is_visible),
    }))
    .filter(cat => cat.services.length > 0)

  return NextResponse.json({
    success: true,
    data: { categories },
  })
}
