import { supabase } from './supabase'

export type ActionType =
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'sale_create'
  | 'sale_delete'
  | 'expense_create'
  | 'expense_delete'
  | 'product_expense_create'
  | 'product_expense_delete'
  | 'category_create'
  | 'category_delete'
  | 'payment_method_create'
  | 'payment_method_update'
  | 'payment_method_delete'
  | 'sales_channel_create'
  | 'sales_channel_delete'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'login'
  | 'login_failed'
  | 'password_change'

/**
 * Log an activity to the database
 */
export async function logActivity(
  userId: string,
  action: ActionType,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('ActivityLog').insert({
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Get display name for an action
 */
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    product_create: 'Ürün eklendi',
    product_update: 'Ürün güncellendi',
    product_delete: 'Ürün silindi',
    sale_create: 'Satış kaydedildi',
    sale_delete: 'Satış silindi',
    expense_create: 'Gider eklendi',
    expense_delete: 'Gider silindi',
    product_expense_create: 'Ürün gideri eklendi',
    product_expense_delete: 'Ürün gideri silindi',
    category_create: 'Kategori eklendi',
    category_delete: 'Kategori silindi',
    payment_method_create: 'Ödeme yöntemi eklendi',
    payment_method_update: 'Ödeme yöntemi güncellendi',
    payment_method_delete: 'Ödeme yöntemi silindi',
    sales_channel_create: 'Satış kanalı eklendi',
    sales_channel_delete: 'Satış kanalı silindi',
    user_create: 'Kullanıcı eklendi',
    user_update: 'Kullanıcı güncellendi',
    user_delete: 'Kullanıcı silindi',
    login: 'Giriş yapıldı',
    login_failed: 'Başarısız giriş',
    password_change: 'Şifre değiştirildi',
  }
  return labels[action] || action
}
