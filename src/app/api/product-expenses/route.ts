import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const expenses = await db.productExpense.findMany({
      where: { productId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching product expenses:', error);
    return NextResponse.json({ error: 'Ürün giderleri yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, amount, description, date } = body;

    if (!productId || !amount || !description || !date) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const expense = await db.productExpense.create({
      data: {
        productId,
        amount: parseFloat(amount),
        description: description.trim(),
        date: new Date(date),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating product expense:', error);
    return NextResponse.json({ error: 'Ürün gideri oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Gider ID gerekli' }, { status: 400 });
    }

    await db.productExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product expense:', error);
    return NextResponse.json({ error: 'Ürün gideri silinemedi' }, { status: 500 });
  }
}
