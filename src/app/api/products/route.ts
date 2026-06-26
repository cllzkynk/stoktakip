import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    let query = supabase.from('Product').select('*, category:Category(*), purchasePayment:PaymentMethod!purchasePaymentId(*), sale:Sale(*, salesChannel:SalesChannel(*), salePayment:PaymentMethod!salePaymentId(*)), expenses:ProductExpense(*)').order('createdAt', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (categoryId) {
      query = query.eq('categoryId', categoryId)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,color.ilike.%${search}%,model.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Ürünler yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, categoryId, purchasePrice, purchaseDate, color, model, size, condition, purchasePaymentId, imageData } = body

    if (!name || !purchasePrice || !purchasePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    // Get next product number
    const { data: lastProduct } = await supabase
      .from('Product')
      .select('productNumber')
      .order('productNumber', { ascending: false })
      .limit(1)
      .maybeSingle()

    const productNumber = (lastProduct?.productNumber || 0) + 1

    const { data, error } = await supabase.from('Product').insert({
      productNumber,
      name: name.trim(),
      description: description?.trim() || null,
      categoryId: categoryId || null,
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: new Date(purchaseDate).toISOString(),
      color: color?.trim() || null,
      model: model?.trim() || null,
      size: size?.trim() || null,
      condition: condition?.trim() || null,
      imageData: imageData || null,
      purchasePaymentId,
      status: 'in_stock',
    }).select('*, category:Category(*), purchasePayment:PaymentMethod!purchasePaymentId(*), sale:Sale(*)').single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Ürün oluşturulamadı' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, description, categoryId, purchasePrice, purchaseDate, color, model, size, condition, isListed, status, purchasePaymentId, imageData } = body

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 })
    }

    // Check existing product
    const { data: existing } = await supabase.from('Product').select('*').eq('id', id).single()
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice)
    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate).toISOString()
    if (color !== undefined) updateData.color = color?.trim() || null
    if (model !== undefined) updateData.model = model?.trim() || null
    if (size !== undefined) updateData.size = size?.trim() || null
    if (condition !== undefined) updateData.condition = condition?.trim() || null
    if (isListed !== undefined) {
      updateData.isListed = isListed === 'true' || isListed === true
      if ((isListed === 'true' || isListed === true) && !existing.isListed) {
        updateData.listedDate = new Date().toISOString()
        updateData.status = 'listed'
      } else if (isListed === 'false' || isListed === false) {
        updateData.listedDate = null
        if (existing.status === 'listed') updateData.status = 'in_stock'
      }
    }
    if (status !== undefined) updateData.status = status
    if (purchasePaymentId) updateData.purchasePaymentId = purchasePaymentId

    // Handle image update - only update if new imageData provided
    if (imageData !== undefined && imageData !== null) {
      updateData.imageData = imageData
    }

    const { data, error } = await supabase
      .from('Product')
      .update(updateData)
      .eq('id', id)
      .select('*, category:Category(*), purchasePayment:PaymentMethod!purchasePaymentId(*), sale:Sale(*, salesChannel:SalesChannel(*), salePayment:PaymentMethod!salePaymentId(*))')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 })
    }

    // Delete related sales and expenses first
    await supabase.from('Sale').delete().eq('productId', id)
    await supabase.from('ProductExpense').delete().eq('productId', id)
    const { error } = await supabase.from('Product').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 })
  }
}
