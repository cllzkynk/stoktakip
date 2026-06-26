import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Seed default payment methods
    const existingPM = await db.paymentMethod.count();
    if (existingPM === 0) {
      await db.paymentMethod.createMany({
        data: [
          { name: 'Nakit', isDefault: true },
          { name: 'Wise' },
          { name: 'Vinted' },
          { name: 'Banka Hesabı' },
        ],
      });
    } else {
      // Check if Banka Hesabı exists, add if not
      const bankExists = await db.paymentMethod.findFirst({ where: { name: 'Banka Hesabı' } });
      if (!bankExists) {
        await db.paymentMethod.create({ data: { name: 'Banka Hesabı' } });
      }
    }

    // Seed default sales channels
    const existingSC = await db.salesChannel.count();
    if (existingSC === 0) {
      await db.salesChannel.createMany({
        data: [
          { name: 'Vinted' },
          { name: 'Tori' },
          { name: 'Facebook' },
        ],
      });
    }

    // Migrate old expense types to new types
    const oldWithdrawals = await db.expense.findMany({ where: { type: 'withdrawal' } });
    if (oldWithdrawals.length > 0) {
      await db.expense.updateMany({ where: { type: 'withdrawal' }, data: { type: 'savings' } });
    }
    const oldExpenses = await db.expense.findMany({ where: { type: 'expense' } });
    if (oldExpenses.length > 0) {
      await db.expense.updateMany({ where: { type: 'expense' }, data: { type: 'extra_spending' } });
    }

    return NextResponse.json({ success: true, message: 'Varsayılan veriler oluşturuldu' });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ error: 'Veriler oluşturulamadı' }, { status: 500 });
  }
}
