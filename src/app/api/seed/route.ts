import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Seed default payment methods
    const { count: pmCount } = await supabase.from('PaymentMethod').select('id', { count: 'exact', head: true })

    if (pmCount === 0) {
      await supabase.from('PaymentMethod').insert([
        { name: 'Nakit', isDefault: true },
        { name: 'Wise' },
        { name: 'Vinted' },
        { name: 'Banka Hesabı' },
      ])
    } else {
      // Check if Banka Hesabı exists
      const { data: bankExists } = await supabase.from('PaymentMethod').select('id').eq('name', 'Banka Hesabı').maybeSingle()
      if (!bankExists) {
        await supabase.from('PaymentMethod').insert({ name: 'Banka Hesabı' })
      }
    }

    // Seed default sales channels
    const { count: scCount } = await supabase.from('SalesChannel').select('id', { count: 'exact', head: true })
    if (scCount === 0) {
      await supabase.from('SalesChannel').insert([
        { name: 'Vinted' },
        { name: 'Tori' },
        { name: 'Facebook' },
      ])
    }

    // Migrate old expense types
    const { data: oldWithdrawals } = await supabase.from('Expense').select('id').eq('type', 'withdrawal')
    if (oldWithdrawals && oldWithdrawals.length > 0) {
      await supabase.from('Expense').update({ type: 'savings' }).eq('type', 'withdrawal')
    }

    const { data: oldExpenses } = await supabase.from('Expense').select('id').eq('type', 'expense')
    if (oldExpenses && oldExpenses.length > 0) {
      await supabase.from('Expense').update({ type: 'extra_spending' }).eq('type', 'expense')
    }

    return NextResponse.json({ success: true, message: 'Varsayılan veriler oluşturuldu' })
  } catch (error) {
    console.error('Error seeding data:', error)
    return NextResponse.json({ error: 'Veriler oluşturulamadı' }, { status: 500 })
  }
}
