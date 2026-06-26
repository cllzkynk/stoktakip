import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const salesChannels = await db.salesChannel.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { sales: true } },
      },
    });
    return NextResponse.json(salesChannels);
  } catch (error) {
    console.error('Error fetching sales channels:', error);
    return NextResponse.json({ error: 'Satış kanalları yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Satış kanalı adı gerekli' }, { status: 400 });
    }

    const salesChannel = await db.salesChannel.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(salesChannel, { status: 201 });
  } catch (error) {
    console.error('Error creating sales channel:', error);
    return NextResponse.json({ error: 'Satış kanalı oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Satış kanalı ID gerekli' }, { status: 400 });
    }

    const usageCount = await db.salesChannel.count({ where: { id } });
    const salesCount = await db.sale.count({ where: { salesChannelId: id } });

    if (salesCount > 0) {
      return NextResponse.json({ error: 'Bu satış kanalında satışlar var, önce satışları silin' }, { status: 400 });
    }

    await db.salesChannel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sales channel:', error);
    return NextResponse.json({ error: 'Satış kanalı silinemedi' }, { status: 500 });
  }
}
