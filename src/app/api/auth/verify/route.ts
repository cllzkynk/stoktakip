import { db } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { username },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 401 })
    }

    if (!verifyPassword(password, user.passwordHash)) {
      await logActivity(user.id, 'login_failed', { username })
      return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 })
    }

    await logActivity(user.id, 'login', { username })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role as 'admin' | 'user',
      }
    })
  } catch (error) {
    console.error('Error verifying login:', error)
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 500 })
  }
}
