import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Totals - purchase total = sum(purchasePrice * quantity)
    const products = await db.product.findMany({ select: { purchasePrice: true, quantity: true } })
    const totalPurchases = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0)

    const sales = await db.sale.findMany({ select: { salePrice: true, quantity: true } })
    const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0)

    const totalProductExpensesAgg = await db.productExpense.aggregate({ _sum: { amount: true } })
    const totalProductExpenses = totalProductExpensesAgg._sum.amount || 0

    const totalSpent = totalPurchases + totalProductExpenses
    const totalRevenue = totalSalesRevenue
    const totalProfit = totalRevenue - totalSpent

    // Expense breakdown
    const savingsExpenses = await db.expense.aggregate({ where: { type: 'savings' }, _sum: { amount: true } })
    const extraSpendingExpenses = await db.expense.aggregate({ where: { type: 'extra_spending' }, _sum: { amount: true } })
    const totalWithdrawn = savingsExpenses._sum.amount || 0
    const totalExtraSpending = extraSpendingExpenses._sum.amount || 0
    const totalAllWithdrawn = totalWithdrawn + totalExtraSpending

    // Product counts
    const inStockCount = await db.product.count({ where: { status: 'in_stock' } })
    const listedCount = await db.product.count({ where: { status: 'listed' } })
    const soldCount = await db.product.count({ where: { status: 'sold' } })
    const totalProducts = await db.product.count()

    // In stock value - sum(purchasePrice * quantity) for in_stock + listed
    const inStockProducts = await db.product.findMany({
      where: { status: { in: ['in_stock', 'listed'] } },
      select: { purchasePrice: true, quantity: true },
    })
    const inStockValue = inStockProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0)

    // Payment method breakdown
    const paymentMethods = await db.paymentMethod.findMany({
      include: {
        purchaseProducts: { select: { purchasePrice: true, quantity: true } },
        sales: { select: { salePrice: true, quantity: true } },
        expenses: { select: { amount: true, type: true } },
      },
    })

    const paymentMethodStats = paymentMethods.map(pm => {
      const totalIn = pm.sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0)
      const totalOut = pm.purchaseProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0)
      const totalExp = pm.expenses.reduce((sum, e) => sum + e.amount, 0)
      const totalSavings = pm.expenses.filter(e => e.type === 'savings').reduce((sum, e) => sum + e.amount, 0)
      const totalExtraSpending = pm.expenses.filter(e => e.type === 'extra_spending').reduce((sum, e) => sum + e.amount, 0)
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
    const salesChannels = await db.salesChannel.findMany({
      include: { sales: { select: { salePrice: true, quantity: true } } },
    })

    const salesChannelStats = salesChannels.map(sc => ({
      id: sc.id,
      name: sc.name,
      totalSales: sc.sales.reduce((sum, s) => sum + s.quantity, 0),
      totalRevenue: sc.sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0),
    }))

    // Monthly stats (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthlySales = await db.sale.findMany({
      where: { saleDate: { gte: sixMonthsAgo } },
      select: { saleDate: true, salePrice: true, quantity: true },
    })
    const monthlyPurchases = await db.product.findMany({
      where: { purchaseDate: { gte: sixMonthsAgo } },
      select: { purchaseDate: true, purchasePrice: true, quantity: true },
    })

    // Top colors
    const soldProducts = await db.product.findMany({
      where: { status: 'sold', color: { not: null } },
      select: { color: true },
    })
    const colorCounts: Record<string, number> = {}
    soldProducts.forEach(p => {
      if (p.color) colorCounts[p.color] = (colorCounts[p.color] || 0) + 1
    })
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Top categories
    const soldWithCategory = await db.product.findMany({
      where: { status: 'sold', categoryId: { not: null } },
      include: { category: true, sales: true },
    })
    const categoryStats: Record<string, { name: string; count: number; revenue: number }> = {}
    soldWithCategory.forEach(p => {
      if (p.category) {
        if (!categoryStats[p.category.id]) {
          categoryStats[p.category.id] = { name: p.category.name, count: 0, revenue: 0 }
        }
        categoryStats[p.category.id].count += 1
        categoryStats[p.category.id].revenue += p.sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0)
      }
    })
    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Average profit per item (per individual item sold, not per product)
    const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0)
    const avgProfit = totalItemsSold > 0 ? totalProfit / totalItemsSold : 0

    // Monthly breakdown
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const monthlyBreakdown: { month: string; purchases: number; sales: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`

      const monthPurchases = monthlyPurchases
        .filter(p => new Date(p.purchaseDate) >= d && new Date(p.purchaseDate) <= monthEnd)
        .reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0)
      const monthSales = monthlySales
        .filter(s => new Date(s.saleDate) >= d && new Date(s.saleDate) <= monthEnd)
        .reduce((sum, s) => sum + (s.salePrice * s.quantity), 0)

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
