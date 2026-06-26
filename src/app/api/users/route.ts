import { supabase } from '@/lib/supabase'
import { hashPassword, verifyPassword } from '@/lib/auth-utils'
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

    // Check if requesting user is admin
    const { data: requestingUser } = await supabase.from('User').select('role').eq('id', requestingUserId).single()
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('User')
      .select('id, username, displayName, role, isActive, createdAt, updatedAt')
      .order('createdAt', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
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

    // Check if requesting user is admin
    const { data: requestingUser } = await supabase.from('User').select('role').eq('id', requestingUserId).single()
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Kullanıcı adı, şifre ve görünen ad gerekli' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
    }

    // Check if username exists
    const { data: existing } = await supabase.from('User').select('id').eq('username', username).maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanılıyor' }, { status: 400 })
    }

    const passwordHash = hashPassword(password)
    const validRole = ['admin', 'user'].includes(role) ? role : 'user'

    const { data, error } = await supabase.from('User').insert({
      username: username.trim(),
      passwordHash,
      displayName: displayName.trim(),
      role: validRole,
    }).select('id, username, displayName, role, isActive, createdAt').single()

    if (error) throw error

    await logActivity(requestingUserId, 'user_create', { createdUserId: data.id, username: data.username, role: validRole })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }
}

// Update user (admin only - change password, role, etc.)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, username, password, displayName, role, isActive, requestingUserId } = body

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    // Check if requesting user is admin
    const { data: requestingUser } = await supabase.from('User').select('role').eq('id', requestingUserId).single()
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

    const { data, error } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', id)
      .select('id, username, displayName, role, isActive, createdAt, updatedAt')
      .single()

    if (error) throw error

    await logActivity(requestingUserId, 'user_update', { updatedUserId: id, changes: Object.keys(updateData) })

    return NextResponse.json(data)
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

    // Check if requesting user is admin
    const { data: requestingUser } = await supabase.from('User').select('role').eq('id', requestingUserId).single()
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (id === requestingUserId) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 })
    }

    const { error } = await supabase.from('User').delete().eq('id', id)
    if (error) throw error

    await logActivity(requestingUserId, 'user_delete', { deletedUserId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 })
  }
}
