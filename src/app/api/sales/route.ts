import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, salePrice, saleDate, salesChannelId, salePaymentId, buyerInfo, notes } = body

    if (!productId || !salePrice || !saleDate || !salesChannelId || !salePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    // Check product exists and is not sold
    const { data: product } = await supabase.from('Product').select('*').eq('id', productId).single()
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }
    if (product.status === 'sold') {
      return NextResponse.json({ error: 'Bu ürün zaten satılmış' }, { status: 400 })
    }

    // Create sale
    const { data, error } = await supabase.from('Sale').insert({
      productId,
      salePrice: parseFloat(salePrice),
      saleDate: new Date(saleDate).toISOString(),
      salesChannelId,
      salePaymentId,
      buyerInfo: buyerInfo?.trim() || null,
      notes: notes?.trim() || null,
    }).select('*, product:Product(*), salesChannel:SalesChannel(*), salePayment:PaymentMethod!salePaymentId(*)').single()

    if (error) throw error

    // Update product status to sold
    await supabase.from('Product').update({ status: 'sold', isListed: false }).eq('id', productId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: 'Satış kaydı oluşturulamadı' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Sale')
      .select('*, product:Product(*, category:Category(*)), salesChannel:SalesChannel(*), salePayment:PaymentMethod!salePaymentId(*)')
      .order('saleDate', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: 'Satışlar yüklenemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Satış ID gerekli' }, { status: 400 })
    }

    // Find sale to get productId
    const { data: sale } = await supabase.from('Sale').select('productId').eq('id', id).single()
    if (!sale) {
      return NextResponse.json({ error: 'Satış bulunamadı' }, { status: 404 })
    }

    // Reset product status
    await supabase.from('Product').update({ status: 'in_stock', isListed: false }).eq('id', sale.productId)

    // Delete sale
    const { error } = await supabase.from('Sale').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json({ error: 'Satış silinemedi' }, { status: 500 })
  }
}
