import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all products with their sales and expenses
    const { data: products, error: pErr } = await supabase
      .from('Product')
      .select('*, sale:Sale(*), expenses:ProductExpense(*)')
    if (pErr) throw pErr

    // Fetch all sales with relations
    const { data: sales, error: sErr } = await supabase
      .from('Sale')
      .select('*, product:Product(*, category:Category(*)), salesChannel:SalesChannel(*)')
    if (sErr) throw sErr

    // Fetch all expenses
    const { data: expenses, error: eErr } = await supabase
      .from('Expense')
      .select('*')
    if (eErr) throw eErr

    // Fetch payment methods
    const { data: paymentMethods, error: pmErr } = await supabase
      .from('PaymentMethod')
      .select('*')
    if (pmErr) throw pmErr

    // Fetch sales channels
    const { data: salesChannels, error: scErr } = await supabase
      .from('SalesChannel')
      .select('*')
    if (scErr) throw scErr

    // Totals
    const totalPurchases = (products || []).reduce((sum, p) => sum + (p.purchasePrice || 0), 0)
    const totalProductExpenses = (products || []).reduce((sum, p) => {
      return sum + (p.expenses || []).reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0)
    }, 0)
    const totalSalesRevenue = (sales || []).reduce((sum, s) => sum + (s.salePrice || 0), 0)

    const totalSpent = totalPurchases + totalProductExpenses
    const totalRevenue = totalSalesRevenue
    const totalProfit = totalRevenue - totalSpent

    // Expense breakdown
    const totalWithdrawn = (expenses || []).filter(e => e.type === 'savings').reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalExtraSpending = (expenses || []).filter(e => e.type === 'extra_spending').reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalAllWithdrawn = totalWithdrawn + totalExtraSpending

    // Product counts
    const inStockCount = (products || []).filter(p => p.status === 'in_stock').length
    const listedCount = (products || []).filter(p => p.status === 'listed').length
    const soldCount = (products || []).filter(p => p.status === 'sold').length
    const totalProducts = (products || []).length

    // In stock value
    const inStockValue = (products || [])
      .filter(p => p.status === 'in_stock' || p.status === 'listed')
      .reduce((sum, p) => sum + (p.purchasePrice || 0), 0)

    // Payment method breakdown
    const paymentMethodStats = (paymentMethods || []).map(pm => {
      const pmPurchases = (products || []).filter(p => p.purchasePaymentId === pm.id)
      const pmSales = (sales || []).filter(s => s.salePaymentId === pm.id)
      const pmExpenses = (expenses || []).filter(e => e.paymentMethodId === pm.id)

      const totalIn = pmSales.reduce((sum, s) => sum + (s.salePrice || 0), 0)
      const totalOut = pmPurchases.reduce((sum, p) => sum + (p.purchasePrice || 0), 0)
      const totalExp = pmExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const totalSavings = pmExpenses.filter(e => e.type === 'savings').reduce((sum, e) => sum + (e.amount || 0), 0)
      const totalExtraSpending = pmExpenses.filter(e => e.type === 'extra_spending').reduce((sum, e) => sum + (e.amount || 0), 0)
      const initialBalance = pm.initialBalance || 0
      const balance = initialBalance + totalIn - totalOut - totalExp

      return {
        id: pm.id,
        name: pm.name,
        initialBalance,
        totalIn,
        totalOut,
        totalExpenses: totalExp,
        totalSavings,
        totalExtraSpending,
        balance,
      }
    })

    // Sales channel breakdown
    const salesChannelStats = (salesChannels || []).map(sc => {
      const scSales = (sales || []).filter(s => s.salesChannelId === sc.id)
      return {
        id: sc.id,
        name: sc.name,
        totalSales: scSales.length,
        totalRevenue: scSales.reduce((sum, s) => sum + (s.salePrice || 0), 0),
      }
    })

    // Monthly stats (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const monthlySales = (sales || []).filter(s => new Date(s.saleDate) >= sixMonthsAgo)
    const monthlyPurchases = (products || []).filter(p => new Date(p.purchaseDate) >= sixMonthsAgo)

    // Top colors
    const colorCounts: Record<string, number> = {}
    ;(products || []).filter(p => p.status === 'sold' && p.color).forEach(p => {
      if (p.color) colorCounts[p.color] = (colorCounts[p.color] || 0) + 1
    })
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Top categories
    const categoryStats: Record<string, { name: string; count: number; revenue: number }> = {}
    ;(products || []).filter(p => p.status === 'sold' && p.categoryId && p.category).forEach(p => {
      const cat = p.category as { id: string; name: string } | null
      if (cat) {
        if (!categoryStats[cat.id]) {
          categoryStats[cat.id] = { name: cat.name, count: 0, revenue: 0 }
        }
        categoryStats[cat.id].count += 1
        categoryStats[cat.id].revenue += p.sale?.salePrice || 0
      }
    })
    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Average profit per item
    const avgProfit = soldCount > 0 ? totalProfit / soldCount : 0

    // Monthly breakdown
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const monthlyBreakdown: { month: string; purchases: number; sales: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`

      const monthPurchases = monthlyPurchases
        .filter(p => {
          const pd = new Date(p.purchaseDate)
          return pd >= d && pd <= monthEnd
        })
        .reduce((sum, p) => sum + (p.purchasePrice || 0), 0)
      const monthSales = monthlySales
        .filter(s => {
          const sd = new Date(s.saleDate)
          return sd >= d && sd <= monthEnd
        })
        .reduce((sum, s) => sum + (s.salePrice || 0), 0)

      monthlyBreakdown.push({ month: monthLabel, purchases: monthPurchases, sales: monthSales })
    }

    return NextResponse.json({
      totalSpent,
      totalRevenue,
      totalProfit,
      totalWithdrawn,
      totalExtraSpending,
      totalAllWithdrawn,
      totalInitialBalance: paymentMethodStats.reduce((s, pm) => s + pm.initialBalance, 0),
      totalBalance: paymentMethodStats.reduce((s, pm) => s + pm.balance, 0),
      avgProfit,
      inStockCount,
      listedCount,
      soldCount,
      totalProducts,
      inStockValue,
      paymentMethodStats,
      salesChannelStats,
      topColors,
      topCategories,
      monthlyBreakdown,
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 })
  }
}
