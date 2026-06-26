import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      include: { paymentMethod: true },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Giderler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, description, date, paymentMethodId, type } = body;

    if (!amount || !description || !date || !paymentMethodId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // type: 'savings' (birikimde - bende kalan), 'extra_spending' (ek harcama - tamamen giden)
    const validType = ['savings', 'extra_spending'].includes(type) ? type : 'savings';

    const expense = await db.expense.create({
      data: {
        amount: parseFloat(amount),
        description: description.trim(),
        date: new Date(date),
        paymentMethodId,
        type: validType,
      },
      include: { paymentMethod: true },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Gider oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Gider ID gerekli' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Gider silinemedi' }, { status: 500 });
  }
}
