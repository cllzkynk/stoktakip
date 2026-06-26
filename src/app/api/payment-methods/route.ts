import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase.from('PaymentMethod').select('*').order('createdAt', { ascending: true })
    if (error) throw error
    // Add usage counts
    const withCounts = await Promise.all((data || []).map(async (pm) => {
      const [pRes, sRes, eRes] = await Promise.all([
        supabase.from('Product').select('id', { count: 'exact', head: true }).eq('purchasePaymentId', pm.id),
        supabase.from('Sale').select('id', { count: 'exact', head: true }).eq('salePaymentId', pm.id),
        supabase.from('Expense').select('id', { count: 'exact', head: true }).eq('paymentMethodId', pm.id),
      ])
      return { ...pm, _count: { purchaseProducts: pRes.count || 0, sales: sRes.count || 0, expenses: eRes.count || 0 } }
    }))
    return NextResponse.json(withCounts)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json({ error: 'Ödeme yöntemleri yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, initialBalance } = body
    if (!name || name.trim() === '') return NextResponse.json({ error: 'Ödeme yöntemi adı gerekli' }, { status: 400 })

    const { data, error } = await supabase.from('PaymentMethod').insert({ name: name.trim(), initialBalance: initialBalance ? parseFloat(initialBalance) : 0 }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating payment method:', error)
    return NextResponse.json({ error: 'Ödeme yöntemi oluşturulamadı' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, initialBalance } = body
    if (!id) return NextResponse.json({ error: 'Ödeme yöntemi ID gerekli' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (initialBalance !== undefined) updateData.initialBalance = parseFloat(initialBalance)

    const { data, error } = await supabase.from('PaymentMethod').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json({ error: 'Ödeme yöntemi güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Ödeme yöntemi ID gerekli' }, { status: 400 })

    const { error } = await supabase.from('PaymentMethod').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json({ error: 'Ödeme yöntemi silinemedi' }, { status: 500 })
  }
}
