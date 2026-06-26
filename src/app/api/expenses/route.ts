import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Expense')
      .select('*, paymentMethod:PaymentMethod(*)')
      .order('date', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Giderler yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, description, date, paymentMethodId, type } = body

    if (!amount || !description || !date || !paymentMethodId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    // type: 'savings' (birikimde - bende kalan), 'extra_spending' (ek harcama - tamamen giden)
    const validType = ['savings', 'extra_spending'].includes(type) ? type : 'savings'

    const { data, error } = await supabase.from('Expense').insert({
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date(date).toISOString(),
      paymentMethodId,
      type: validType,
    }).select('*, paymentMethod:PaymentMethod(*)').single()

    if (error) throw error

    // Log activity
    const userId = body.userId
    if (userId) await logActivity(userId, 'expense_create', { expenseId: data.id, amount: parseFloat(amount), description: description.trim(), type: validType })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Gider oluşturulamadı' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Gider ID gerekli' }, { status: 400 })
    }

    const { error } = await supabase.from('Expense').delete().eq('id', id)
    if (error) throw error

    // Log activity
    const userId = searchParams.get('userId')
    if (userId) await logActivity(userId, 'expense_delete', { expenseId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Gider silinemedi' }, { status: 500 })
  }
}
