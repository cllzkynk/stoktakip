import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Şifre gerekli' }, { status: 400 })
    }

    const appPassword = process.env.APP_PASSWORD
    if (!appPassword) {
      // If no password set in env, allow access
      return NextResponse.json({ success: true })
    }

    // Hash the provided password with SHA-256 and compare
    const hashedInput = crypto.createHash('sha256').update(password).digest('hex')
    const hashedExpected = crypto.createHash('sha256').update(appPassword).digest('hex')

    if (hashedInput === hashedExpected) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 })
    }
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 500 })
  }
}
