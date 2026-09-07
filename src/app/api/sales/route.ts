import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, salePrice, saleDate, salesChannelId, salePaymentId, buyerInfo, notes, quantity, userId } = body

    if (!productId || !salePrice || !saleDate || !salesChannelId || !salePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const saleQty = parseInt(quantity) > 0 ? parseInt(quantity) : 1

    if (product.quantity < saleQty) {
      return NextResponse.json({ error: `Yeterli stok yok! Mevcut: ${product.quantity} adet` }, { status: 400 })
    }

    // Create sale record
    const sale = await db.sale.create({
      data: {
        productId,
        salePrice: parseFloat(salePrice),
        saleDate: new Date(saleDate),
        salesChannelId,
        salePaymentId,
        buyerInfo: buyerInfo?.trim() || null,
        notes: notes?.trim() || null,
        quantity: saleQty,
      },
      include: {
        product: true,
        salesChannel: true,
        salePayment: true,
      },
    })

    // Reduce product quantity
    const newQty = product.quantity - saleQty
    const newStatus = newQty === 0 ? 'sold' : (product.status === 'listed' ? 'listed' : 'in_stock')

    await db.product.update({
      where: { id: productId },
      data: {
        quantity: newQty,
        status: newStatus,
        isListed: newQty === 0 ? false : product.isListed,
      },
    })

    if (userId) await logActivity(userId, 'sale_create', { saleId: sale.id, productId, salePrice: parseFloat(salePrice), quantity: saleQty })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: 'Satış kaydı oluşturulamadı' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      include: {
        product: { include: { category: true } },
        salesChannel: true,
        salePayment: true,
      },
      orderBy: { saleDate: 'desc' },
    })
    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: 'Satışlar yüklenemedi' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id) {
      return NextResponse.json({ error: 'Satış ID gerekli' }, { status: 400 })
    }

    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) {
      return NextResponse.json({ error: 'Satış bulunamadı' }, { status: 404 })
    }

    // Restore product quantity
    const product = await db.product.findUnique({ where: { id: sale.productId } })
    if (product) {
      const restoredQty = product.quantity + sale.quantity
      await db.product.update({
        where: { id: sale.productId },
        data: {
          quantity: restoredQty,
          status: 'in_stock',
          isListed: false,
        },
      })
    }

    await db.sale.delete({ where: { id } })

    if (userId) await logActivity(userId, 'sale_delete', { saleId: id, productId: sale.productId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json({ error: 'Satış silinemedi' }, { status: 500 })
  }
}
