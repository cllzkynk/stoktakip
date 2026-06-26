import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase.from('Category').select('*, children:Category(*)').is('parentId', null).order('createdAt', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
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

    const { data, error } = await supabase.from('Category').insert({ name: name.trim(), parentId: parentId || null }).select('*, children:Category(*)').single()
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
