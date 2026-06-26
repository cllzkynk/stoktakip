import { supabase } from '@/lib/supabase'
import { verifyPassword, hashPassword } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

// Login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 })
    }

    // Find user
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('username', username)
      .eq('isActive', true)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 401 })
    }

    // Check if password hash is placeholder (first time setup)
    if (user.passwordHash === 'PLACEHOLDER_UPDATE_VIA_API') {
      // Update with actual hash of the APP_PASSWORD env var
      const appPassword = process.env.APP_PASSWORD || 'admin123'
      const newHash = hashPassword(appPassword)
      await supabase.from('User').update({ passwordHash: newHash }).eq('id', user.id)
      // Now verify
      if (!verifyPassword(password, newHash)) {
        await logActivity(user.id, 'login_failed', { username })
        return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 })
      }
    } else if (!verifyPassword(password, user.passwordHash)) {
      await logActivity(user.id, 'login_failed', { username })
      return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 })
    }

    // Success
    await logActivity(user.id, 'login', { username })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Error verifying login:', error)
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 500 })
  }
}
