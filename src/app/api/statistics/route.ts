import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Totals
    const totalPurchases = await db.product.aggregate({ _sum: { purchasePrice: true } });
    const totalSales = await db.sale.aggregate({ _sum: { salePrice: true } });
    const totalProductExpenses = await db.productExpense.aggregate({ _sum: { amount: true } });

    const totalSpent = (totalPurchases._sum.purchasePrice || 0) + (totalProductExpenses._sum.amount || 0);
    const totalRevenue = totalSales._sum.salePrice || 0;
    const totalProfit = totalRevenue - totalSpent;

    // Expense breakdown: savings vs extra_spending
    const savingsExpenses = await db.expense.aggregate({ where: { type: 'savings' }, _sum: { amount: true } });
    const extraSpendingExpenses = await db.expense.aggregate({ where: { type: 'extra_spending' }, _sum: { amount: true } });
    const totalWithdrawn = savingsExpenses._sum.amount || 0; // birikimde = bende kalan
    const totalExtraSpending = extraSpendingExpenses._sum.amount || 0; // ek harcama = tamamen giden
    const totalAllWithdrawn = totalWithdrawn + totalExtraSpending;

    // Product counts
    const inStockCount = await db.product.count({ where: { status: 'in_stock' } });
    const listedCount = await db.product.count({ where: { status: 'listed' } });
    const soldCount = await db.product.count({ where: { status: 'sold' } });
    const totalProducts = await db.product.count();

    // In stock value
    const inStockValue = await db.product.aggregate({
      where: { status: { in: ['in_stock', 'listed'] } },
      _sum: { purchasePrice: true },
    });

    // Payment method breakdown
    const paymentMethods = await db.paymentMethod.findMany({
      include: {
        purchaseProducts: { select: { purchasePrice: true } },
        sales: { select: { salePrice: true } },
        expenses: { select: { amount: true, type: true } },
      },
    });

    const paymentMethodStats = paymentMethods.map(pm => {
      const totalIn = pm.sales.reduce((sum, s) => sum + s.salePrice, 0);
      const totalOut = pm.purchaseProducts.reduce((sum, p) => sum + p.purchasePrice, 0);
      const totalExp = pm.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalSavings = pm.expenses.filter(e => e.type === 'savings').reduce((sum, e) => sum + e.amount, 0);
      const totalExtraSpending = pm.expenses.filter(e => e.type === 'extra_spending').reduce((sum, e) => sum + e.amount, 0);
      const balance = totalIn - totalOut - totalExp;
      return {
        id: pm.id,
        name: pm.name,
        totalIn,
        totalOut,
        totalExpenses: totalExp,
        totalSavings,
        totalExtraSpending,
        balance,
      };
    });

    // Sales channel breakdown
    const salesChannels = await db.salesChannel.findMany({
      include: {
        sales: { select: { salePrice: true } },
      },
    });

    const salesChannelStats = salesChannels.map(sc => ({
      id: sc.id,
      name: sc.name,
      totalSales: sc.sales.length,
      totalRevenue: sc.sales.reduce((sum, s) => sum + s.salePrice, 0),
    }));

    // Monthly stats (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlySales = await db.sale.findMany({
      where: { saleDate: { gte: sixMonthsAgo } },
      select: { saleDate: true, salePrice: true },
    });
    const monthlyPurchases = await db.product.findMany({
      where: { purchaseDate: { gte: sixMonthsAgo } },
      select: { purchaseDate: true, purchasePrice: true },
    });

    // Top colors
    const soldProducts = await db.product.findMany({
      where: { status: 'sold', color: { not: null } },
      select: { color: true },
    });
    const colorCounts: Record<string, number> = {};
    soldProducts.forEach(p => {
      if (p.color) {
        colorCounts[p.color] = (colorCounts[p.color] || 0) + 1;
      }
    });
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Top categories
    const soldWithCategory = await db.product.findMany({
      where: { status: 'sold', categoryId: { not: null } },
      include: { category: true, sale: true },
    });
    const categoryStats: Record<string, { name: string; count: number; revenue: number }> = {};
    soldWithCategory.forEach(p => {
      if (p.category) {
        if (!categoryStats[p.category.id]) {
          categoryStats[p.category.id] = { name: p.category.name, count: 0, revenue: 0 };
        }
        categoryStats[p.category.id].count += 1;
        categoryStats[p.category.id].revenue += p.sale?.salePrice || 0;
      }
    });
    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average profit per item
    const avgProfit = soldCount > 0 ? totalProfit / soldCount : 0;

    // Monthly breakdown
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthlyBreakdown: { month: string; purchases: number; sales: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      const monthPurchases = monthlyPurchases
        .filter(p => new Date(p.purchaseDate) >= d && new Date(p.purchaseDate) <= monthEnd)
        .reduce((sum, p) => sum + p.purchasePrice, 0);
      const monthSales = monthlySales
        .filter(s => new Date(s.saleDate) >= d && new Date(s.saleDate) <= monthEnd)
        .reduce((sum, s) => sum + s.salePrice, 0);

      monthlyBreakdown.push({ month: monthLabel, purchases: monthPurchases, sales: monthSales });
    }

    return NextResponse.json({
      totalSpent,
      totalRevenue,
      totalProfit,
      totalWithdrawn,
      totalExtraSpending,
      totalAllWithdrawn,
      avgProfit,
      inStockCount,
      listedCount,
      soldCount,
      totalProducts,
      inStockValue: inStockValue._sum.purchasePrice || 0,
      paymentMethodStats,
      salesChannelStats,
      topColors,
      topCategories,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 });
  }
}
