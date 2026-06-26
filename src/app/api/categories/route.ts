import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

interface CategoryRow {
  id: string
  name: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Fetch all categories and build a tree structure with unlimited depth
 */
async function getCategoryTree() {
  // Fetch ALL categories flat
  const { data, error } = await supabase
    .from('Category')
    .select('*')
    .order('createdAt', { ascending: true })

  if (error) throw error

  const allCategories = (data || []) as CategoryRow[]

  // Build a map
  const map = new Map<string, CategoryRow & { children: (CategoryRow & { children: unknown[] })[] }>()
  for (const cat of allCategories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  // Build tree
  const roots: (CategoryRow & { children: unknown[] })[] = []
  for (const cat of allCategories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function GET() {
  try {
    const tree = await getCategoryTree()
    return NextResponse.json(tree)
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

    const { data, error } = await supabase.from('Category').insert({ name: name.trim(), parentId: parentId || null }).select().single()
    if (error) throw error

    const userId = body.userId
    if (userId) await logActivity(userId, 'category_create', { categoryId: data.id, name: data.name })

    return NextResponse.json(data, { status: 201 })
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

    const { count } = await supabase.from('Product').select('*', { count: 'exact', head: true }).eq('categoryId', id)
    if (count && count > 0) return NextResponse.json({ error: 'Bu kategoride ürünler var' }, { status: 400 })

    const { error } = await supabase.from('Category').delete().eq('id', id)
    if (error) throw error

    const userId = searchParams.get('userId')
    if (userId) await logActivity(userId, 'category_delete', { categoryId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 })
  }
}
