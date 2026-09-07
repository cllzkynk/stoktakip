import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { parentId: null },
      include: { children: { include: { children: { include: { children: { include: { children: true } } } } } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, parentId } = body
    if (!name || name.trim() === '') return NextResponse.json({ error: 'Kategori adı gerekli' }, { status: 400 })

    const category = await db.category.create({
      data: { name: name.trim(), parentId: parentId || null },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Kategori ID gerekli' }, { status: 400 })

    const productCount = await db.product.count({ where: { categoryId: id } })
    if (productCount > 0) return NextResponse.json({ error: 'Bu kategoride ürünler var' }, { status: 400 })

    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 })
  }
}
