import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CategoryNode {
  id: string
  name: string
  parentId: string | null
  children: CategoryNode[]
}

/**
 * Get all categories as a flat list and build a tree
 */
async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await db.category.findMany({
    orderBy: { createdAt: 'asc' },
  })

  const map = new Map<string, CategoryNode>()
  for (const c of all) {
    map.set(c.id, { id: c.id, name: c.name, parentId: c.parentId, children: [] })
  }

  const roots: CategoryNode[] = []
  for (const c of all) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/**
 * Recursively collect all category IDs (self + descendants)
 */
function collectIds(node: CategoryNode): string[] {
  const ids = [node.id]
  for (const child of node.children) {
    ids.push(...collectIds(child))
  }
  return ids
}

/**
 * Find a node by ID in the tree
 */
function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const tree = await getCategoryTree()

    // If no categoryId, return the full tree with aggregate stats per node
    if (!categoryId) {
      // Fetch all products with their category and sales
      const allProducts = await db.product.findMany({
        include: {
          sales: { include: { salesChannel: true, salePayment: true } },
          expenses: true,
          category: true,
        },
      })

      // Map: categoryId -> array of products in that category subtree
      const statsByCategory = new Map<string, {
        productCount: number
        totalSpent: number
        totalRevenue: number
        soldCount: number
        inStockCount: number
        avgSaleDays: number
        channels: Record<string, { name: string; count: number; revenue: number }>
        payments: Record<string, { name: string; count: number; revenue: number }>
      }>()

      // For each root category, compute aggregated stats including descendants
      const computeStats = (node: CategoryNode) => {
        const ids = collectIds(node)
        const products = allProducts.filter(p => p.categoryId && ids.includes(p.categoryId))

        let totalSpent = 0
        let totalRevenue = 0
        let soldCount = 0
        let inStockCount = 0
        let totalSaleDays = 0
        let saleCount = 0
        const channels: Record<string, { name: string; count: number; revenue: number }> = {}
        const payments: Record<string, { name: string; count: number; revenue: number }> = {}

        for (const p of products) {
          totalSpent += p.purchasePrice * p.quantity
          if (p.status === 'sold') soldCount += 1
          else inStockCount += 1

          for (const sale of p.sales) {
            totalRevenue += sale.salePrice * sale.quantity
            saleCount += 1
            const days = (new Date(sale.saleDate).getTime() - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
            totalSaleDays += days

            const ch = sale.salesChannel
            if (ch) {
              if (!channels[ch.id]) channels[ch.id] = { name: ch.name, count: 0, revenue: 0 }
              channels[ch.id].count += sale.quantity
              channels[ch.id].revenue += sale.salePrice * sale.quantity
            }
            const pm = sale.salePayment
            if (pm) {
              if (!payments[pm.id]) payments[pm.id] = { name: pm.name, count: 0, revenue: 0 }
              payments[pm.id].count += sale.quantity
              payments[pm.id].revenue += sale.salePrice * sale.quantity
            }
          }
        }

        const stats = {
          productCount: products.length,
          totalSpent,
          totalRevenue,
          totalProfit: totalRevenue - totalSpent,
          soldCount,
          inStockCount,
          avgSaleDays: saleCount > 0 ? totalSaleDays / saleCount : 0,
          channels,
          payments,
        }

        statsByCategory.set(node.id, stats)
        for (const child of node.children) {
          computeStats(child)
        }
      }

      for (const root of tree) {
        computeStats(root)
      }

      return NextResponse.json({ tree, statsByCategory: Object.fromEntries(statsByCategory) })
    }

    // Specific category requested - return detailed stats
    const node = findNode(tree, categoryId)
    if (!node) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 })
    }

    const ids = collectIds(node)
    const products = await db.product.findMany({
      where: { categoryId: { in: ids } },
      include: {
        category: true,
        sales: { include: { salesChannel: true, salePayment: true } },
        expenses: true,
        purchasePayment: true,
      },
    })

    let totalSpent = 0
    let totalRevenue = 0
    let totalProductExpenses = 0
    let soldCount = 0
    let inStockCount = 0
    let listedCount = 0
    let totalItemsInStock = 0
    let totalSaleDays = 0
    let saleCount = 0
    const channels: Record<string, { name: string; count: number; revenue: number }> = {}
    const payments: Record<string, { name: string; count: number; revenue: number }> = {}
    const purchasePayments: Record<string, { name: string; spent: number; count: number }> = {}
    const topProducts: Array<{ name: string; quantity: number; spent: number; revenue: number; status: string }> = []

    for (const p of products) {
      totalSpent += p.purchasePrice * p.quantity
      totalProductExpenses += (p.expenses || []).reduce((s, e) => s + e.amount, 0)
      if (p.status === 'sold') soldCount += 1
      else if (p.status === 'listed') listedCount += 1
      else { inStockCount += 1; totalItemsInStock += p.quantity }

      // Purchase payment breakdown
      const pp = p.purchasePayment
      if (pp) {
        if (!purchasePayments[pp.id]) purchasePayments[pp.id] = { name: pp.name, spent: 0, count: 0 }
        purchasePayments[pp.id].spent += p.purchasePrice * p.quantity
        purchasePayments[pp.id].count += 1
      }

      for (const sale of p.sales) {
        totalRevenue += sale.salePrice * sale.quantity
        saleCount += 1
        const days = (new Date(sale.saleDate).getTime() - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
        totalSaleDays += days

        const ch = sale.salesChannel
        if (ch) {
          if (!channels[ch.id]) channels[ch.id] = { name: ch.name, count: 0, revenue: 0 }
          channels[ch.id].count += sale.quantity
          channels[ch.id].revenue += sale.salePrice * sale.quantity
        }
        const pm = sale.salePayment
        if (pm) {
          if (!payments[pm.id]) payments[pm.id] = { name: pm.name, count: 0, revenue: 0 }
          payments[pm.id].count += sale.quantity
          payments[pm.id].revenue += sale.salePrice * sale.quantity
        }
      }

      const revenue = p.sales.reduce((s, sale) => s + sale.salePrice * sale.quantity, 0)
      topProducts.push({
        name: p.name,
        quantity: p.quantity,
        spent: p.purchasePrice * p.quantity,
        revenue,
        status: p.status,
      })
    }

    topProducts.sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({
      category: node,
      stats: {
        totalProducts: products.length,
        totalSpent,
        totalRevenue,
        totalProductExpenses,
        totalProfit: totalRevenue - totalSpent - totalProductExpenses,
        soldCount,
        inStockCount,
        listedCount,
        totalItemsInStock,
        avgSaleDays: saleCount > 0 ? totalSaleDays / saleCount : 0,
        channels: Object.values(channels).sort((a, b) => b.revenue - a.revenue),
        payments: Object.values(payments).sort((a, b) => b.revenue - a.revenue),
        purchasePayments: Object.values(purchasePayments).sort((a, b) => b.spent - a.spent),
        topProducts: topProducts.slice(0, 10),
        childCategories: node.children.map(c => ({ id: c.id, name: c.name })),
      },
    })
  } catch (error) {
    console.error('Error fetching category stats:', error)
    return NextResponse.json({ error: 'Kategori istatistikleri yüklenemedi' }, { status: 500 })
  }
}
