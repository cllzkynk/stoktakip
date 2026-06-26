import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ProductExpense')
      .select('*')
      .eq('productId', productId)
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching product expenses:', error)
    return NextResponse.json({ error: 'Ürün giderleri yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, amount, description, date } = body

    if (!productId || !amount || !description || !date) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    const { data, error } = await supabase.from('ProductExpense').insert({
      productId,
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date(date).toISOString(),
    }).select().single()

    if (error) throw error

    const userId = body.userId
    if (userId) await logActivity(userId, 'product_expense_create', { expenseId: data.id, productId, amount: parseFloat(amount) })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating product expense:', error)
    return NextResponse.json({ error: 'Ürün gideri oluşturulamadı' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Gider ID gerekli' }, { status: 400 })
    }

    const { error } = await supabase.from('ProductExpense').delete().eq('id', id)
    if (error) throw error

    const userId = searchParams.get('userId')
    if (userId) await logActivity(userId, 'product_expense_delete', { expenseId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product expense:', error)
    return NextResponse.json({ error: 'Ürün gideri silinemedi' }, { status: 500 })
  }
}
