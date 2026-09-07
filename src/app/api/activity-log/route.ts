import { db } from '@/lib/db'
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

    const requestingUser = await db.user.findUnique({ where: { id: userId } })
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.activityLog.count(),
    ])

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ error: 'Aktivite kayıtları yüklenemedi' }, { status: 500 })
  }
}
