import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, salePrice, saleDate, salesChannelId, salePaymentId, buyerInfo, notes } = body;

    if (!productId || !salePrice || !saleDate || !salesChannelId || !salePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    if (product.status === 'sold') {
      return NextResponse.json({ error: 'Bu ürün zaten satılmış' }, { status: 400 });
    }

    const sale = await db.sale.create({
      data: {
        productId,
        salePrice: parseFloat(salePrice),
        saleDate: new Date(saleDate),
        salesChannelId,
        salePaymentId,
        buyerInfo: buyerInfo?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        product: true,
        salesChannel: true,
        salePayment: true,
      },
    });

    await db.product.update({
      where: { id: productId },
      data: { status: 'sold', isListed: false },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Satış kaydı oluşturulamadı' }, { status: 500 });
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
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Satışlar yüklenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Satış ID gerekli' }, { status: 400 });
    }

    const sale = await db.sale.findUnique({ where: { id } });
    if (!sale) {
      return NextResponse.json({ error: 'Satış bulunamadı' }, { status: 404 });
    }

    // Reset product status
    await db.product.update({
      where: { id: sale.productId },
      data: { status: 'in_stock', isListed: false },
    });

    await db.sale.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Satış silinemedi' }, { status: 500 });
  }
}
