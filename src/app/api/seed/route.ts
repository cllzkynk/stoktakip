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
        ],
      });
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

    return NextResponse.json({ success: true, message: 'Varsayılan veriler oluşturuldu' });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ error: 'Veriler oluşturulamadı' }, { status: 500 });
  }
}
