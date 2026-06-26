import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Get activity logs (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    // Check if requesting user is admin
    const { data: requestingUser } = await supabase.from('User').select('role').eq('id', userId).single()
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { data, error, count } = await supabase
      .from('ActivityLog')
      .select('*, user:User(id, username, displayName)', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ logs: data || [], total: count || 0 })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ error: 'Aktivite kayıtları yüklenemedi' }, { status: 500 })
  }
}
