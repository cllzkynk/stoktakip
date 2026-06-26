import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase.from('SalesChannel').select('*').order('createdAt', { ascending: true })
    if (error) throw error

    // Add sales counts
    const withCounts = await Promise.all((data || []).map(async (sc) => {
      const { count } = await supabase.from('Sale').select('id', { count: 'exact', head: true }).eq('salesChannelId', sc.id)
      return { ...sc, _count: { sales: count || 0 } }
    }))

    return NextResponse.json(withCounts)
  } catch (error) {
    console.error('Error fetching sales channels:', error)
    return NextResponse.json({ error: 'Satış kanalları yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Satış kanalı adı gerekli' }, { status: 400 })
    }

    const { data, error } = await supabase.from('SalesChannel').insert({ name: name.trim() }).select().single()
    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating sales channel:', error)
    return NextResponse.json({ error: 'Satış kanalı oluşturulamadı' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Satış kanalı ID gerekli' }, { status: 400 })
    }

    const { count } = await supabase.from('Sale').select('id', { count: 'exact', head: true }).eq('salesChannelId', id)
    if (count && count > 0) {
      return NextResponse.json({ error: 'Bu satış kanalında satışlar var, önce satışları silin' }, { status: 400 })
    }

    const { error } = await supabase.from('SalesChannel').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sales channel:', error)
    return NextResponse.json({ error: 'Satış kanalı silinemedi' }, { status: 500 })
  }
}
