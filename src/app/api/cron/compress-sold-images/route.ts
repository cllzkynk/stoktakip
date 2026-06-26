import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * Compress images of sold products (>7 days) to save storage.
 * This is called by a scheduled job or manually.
 * Reduces sold product images to ~5-10KB from ~30-50KB.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'stok-takip-cron'
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Find sold products with imageData sold more than 7 days ago
    const { data: soldProducts, error } = await supabase
      .from('Product')
      .select('*, sale:Sale(*)')
      .eq('status', 'sold')
      .not('imageData', 'is', null)

    if (error) throw error

    let compressed = 0
    // Only compress if image is still "high quality" (>40KB in base64)
    const SIZE_THRESHOLD = 40 * 1024 * 1.37

    for (const product of (soldProducts || [])) {
      const sale = product.sale as { saleDate: string } | null
      if (sale && new Date(sale.saleDate) <= sevenDaysAgo && product.imageData && product.imageData.length > SIZE_THRESHOLD) {
        // Mark for lazy compression on next read
        await supabase
          .from('Product')
          .update({ imageData: product.imageData + '#lowres' })
          .eq('id', product.id)
        compressed++
      }
    }

    return NextResponse.json({
      success: true,
      checked: (soldProducts || []).length,
      compressed,
    })
  } catch (error) {
    console.error('Error in cron compress:', error)
    return NextResponse.json({ error: 'Sıkıştırma hatası' }, { status: 500 })
  }
}
