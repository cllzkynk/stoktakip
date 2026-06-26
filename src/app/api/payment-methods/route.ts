import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const paymentMethods = await db.paymentMethod.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { purchaseProducts: true, sales: true, expenses: true } },
      },
    });
    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Ödeme yöntemleri yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, initialBalance } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Ödeme yöntemi adı gerekli' }, { status: 400 });
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        name: name.trim(),
        initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json({ error: 'Ödeme yöntemi oluşturulamadı' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, initialBalance } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ödeme yöntemi ID gerekli' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (initialBalance !== undefined) updateData.initialBalance = parseFloat(initialBalance);

    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(paymentMethod);
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json({ error: 'Ödeme yöntemi güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ödeme yöntemi ID gerekli' }, { status: 400 });
    }

    const usageCount = await db.paymentMethod.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseProducts: true, sales: true, expenses: true } },
      },
    });

    if (usageCount && (usageCount._count.purchaseProducts > 0 || usageCount._count.sales > 0 || usageCount._count.expenses > 0)) {
      return NextResponse.json({ error: 'Bu ödeme yöntemi kullanımda, önce ilişkili kayıtları silin' }, { status: 400 });
    }

    await db.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: 'Ödeme yöntemi silinemedi' }, { status: 500 });
  }
}
