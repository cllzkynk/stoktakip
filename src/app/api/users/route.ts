import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'
import { NextRequest, NextResponse } from 'next/server'

// Get all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestingUserId = searchParams.get('userId')

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const requestingUser = await db.user.findUnique({ where: { id: requestingUserId } })
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Kullanıcılar yüklenemedi' }, { status: 500 })
  }
}

// Create new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, displayName, role, requestingUserId } = body

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const requestingUser = await db.user.findUnique({ where: { id: requestingUserId } })
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Kullanıcı adı, şifre ve görünen ad gerekli' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanılıyor' }, { status: 400 })
    }

    const validRole = ['admin', 'user'].includes(role) ? role : 'user'
    const passwordHash = hashPassword(password)

    const user = await db.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        displayName: displayName.trim(),
        role: validRole,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    await logActivity(requestingUserId, 'user_create', { createdUserId: user.id, username: user.username, role: validRole })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }
}

// Update user (admin only)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, username, password, displayName, role, isActive, requestingUserId } = body

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const requestingUser = await db.user.findUnique({ where: { id: requestingUserId } })
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (displayName !== undefined) updateData.displayName = displayName.trim()
    if (role !== undefined && ['admin', 'user'].includes(role)) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
      }
      updateData.passwordHash = hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await logActivity(requestingUserId, 'user_update', { updatedUserId: id, changes: Object.keys(updateData) })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 })
  }
}

// Delete user (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const requestingUserId = searchParams.get('userId')

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const requestingUser = await db.user.findUnique({ where: { id: requestingUserId } })
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
    }

    if (id === requestingUserId) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 })
    }

    await db.user.delete({ where: { id } })

    await logActivity(requestingUserId, 'user_delete', { deletedUserId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 })
  }
}
