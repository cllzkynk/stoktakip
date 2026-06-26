'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, Store, Trash2, Edit, Wallet, Save, Users, Activity, Shield, UserPlus, Key, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/app/PasswordGate';

interface PaymentMethod { id: string; name: string; isDefault: boolean; initialBalance: number; _count?: { purchaseProducts: number; sales: number; expenses: number }; }
interface SalesChannel { id: string; name: string; _count?: { sales: number }; }
interface AppUser { id: string; username: string; displayName: string; role: string; isActive: boolean; createdAt: string; }
interface ActivityLogEntry { id: string; userId: string; action: string; details: string | null; createdAt: string; user: { id: string; username: string; displayName: string; } | null; }

interface Props { refreshKey: number; onRefresh: () => void; }

export default function SettingsTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const authUser = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [showAddPM, setShowAddPM] = useState(false);
  const [showAddSC, setShowAddSC] = useState(false);
  const [pmName, setPmName] = useState('');
  const [pmInitialBalance, setPmInitialBalance] = useState('');
  const [scName, setScName] = useState('');
  const [editingBalance, setEditingBalance] = useState<Record<string, string>>({});
  const [savingBalance, setSavingBalance] = useState<Record<string, boolean>>({});

  // User management state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editPassword, setEditPassword] = useState('');

  // Activity log state
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityOffset, setActivityOffset] = useState(0);

  const fetchData = async () => {
    try {
      const [pmRes, scRes] = await Promise.all([fetch('/api/payment-methods'), fetch('/api/sales-channels')]);
      const pmData = pmRes.ok ? await pmRes.json() : [];
      const scData = scRes.ok ? await scRes.json() : [];
      setPaymentMethods(Array.isArray(pmData) ? pmData : []);
      setSalesChannels(Array.isArray(scData) ? scData : []);
    } catch { toast({ title: 'Hata', description: 'Veriler yüklenemedi', variant: 'destructive' }); }
  };

  const fetchUsers = async () => {
    if (!isAdmin || !authUser) return;
    try {
      const res = await fetch(`/api/users?userId=${authUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  const fetchActivityLogs = async (offset = 0) => {
    if (!isAdmin || !authUser) return;
    try {
      const res = await fetch(`/api/activity-log?userId=${authUser.id}&limit=50&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
        setActivityTotal(data.total || 0);
        setActivityOffset(offset);
      }
    } catch {}
  };

  useEffect(() => { fetchData(); }, [refreshKey]);
  useEffect(() => { if (isAdmin) { fetchUsers(); fetchActivityLogs(); } }, [refreshKey, isAdmin]);

  const addPM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = { name: pmName, initialBalance: pmInitialBalance || 0 };
      if (authUser) body.userId = authUser.id;
      const res = await fetch('/api/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Ödeme yöntemi eklendi' });
      setShowAddPM(false); setPmName(''); setPmInitialBalance('');
      fetchData(); onRefresh();
    } catch { toast({ title: 'Hata', description: 'Eklenemedi', variant: 'destructive' }); }
  };

  const updateInitialBalance = async (id: string) => {
    const newBalance = editingBalance[id];
    if (newBalance === undefined) return;
    setSavingBalance(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/payment-methods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, initialBalance: newBalance }) });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Başlangıç bakiyesi güncellendi' });
      setEditingBalance(prev => { const next = { ...prev }; delete next[id]; return next; });
      fetchData(); onRefresh();
    } catch { toast({ title: 'Hata', description: 'Güncellenemedi', variant: 'destructive' }); }
    setSavingBalance(prev => ({ ...prev, [id]: false }));
  };

  const deletePM = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/payment-methods?id=${id}${authUser ? `&userId=${authUser.id}` : ''}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Ödeme yöntemi silindi' });
      fetchData(); onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Silinemedi', variant: 'destructive' }); }
  };

  const addSC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales-channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: scName }) });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Satış kanalı eklendi' });
      setShowAddSC(false); setScName('');
      fetchData(); onRefresh();
    } catch { toast({ title: 'Hata', description: 'Eklenemedi', variant: 'destructive' }); }
  };

  const deleteSC = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sales-channels?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Satış kanalı silindi' });
      fetchData(); onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Silinemedi', variant: 'destructive' }); }
  };

  // User management functions
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, displayName: newDisplayName, role: newRole, requestingUserId: authUser.id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Başarılı', description: 'Kullanıcı eklendi' });
      setShowAddUser(false); setNewUsername(''); setNewPassword(''); setNewDisplayName(''); setNewRole('user');
      fetchUsers(); fetchActivityLogs();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Eklenemedi', variant: 'destructive' }); }
  };

  const updateUser = async () => {
    if (!editingUser || !authUser) return;
    try {
      const body: Record<string, unknown> = { id: editingUser.id, displayName: editingUser.displayName, role: editingUser.role, isActive: editingUser.isActive, requestingUserId: authUser.id };
      if (editPassword) body.password = editPassword;
      const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Başarılı', description: 'Kullanıcı güncellendi' });
      setEditingUser(null); setEditPassword('');
      fetchUsers(); fetchActivityLogs();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Güncellenemedi', variant: 'destructive' }); }
  };

  const deleteUser = async (id: string) => {
    if (!authUser || !confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/users?id=${id}&userId=${authUser.id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Kullanıcı silindi' });
      fetchUsers(); fetchActivityLogs();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Silinemedi', variant: 'destructive' }); }
  };

  const handleLogout = () => {
    try { localStorage.removeItem('stok_takip_auth'); } catch {}
    window.location.reload();
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      product_create: 'Ürün eklendi', product_update: 'Ürün güncellendi', product_delete: 'Ürün silindi',
      sale_create: 'Satış kaydedildi', sale_delete: 'Satış silindi',
      expense_create: 'Gider eklendi', expense_delete: 'Gider silindi',
      product_expense_create: 'Ürün gideri eklendi', product_expense_delete: 'Ürün gideri silindi',
      category_create: 'Kategori eklendi', category_delete: 'Kategori silindi',
      payment_method_create: 'Ödeme yöntemi eklendi', payment_method_update: 'Ödeme yöntemi güncellendi', payment_method_delete: 'Ödeme yöntemi silindi',
      sales_channel_create: 'Satış kanalı eklendi', sales_channel_delete: 'Satış kanalı silindi',
      user_create: 'Kullanıcı eklendi', user_update: 'Kullanıcı güncellendi', user_delete: 'Kullanıcı silindi',
      login: 'Giriş yapıldı', login_failed: 'Başarısız giriş', password_change: 'Şifre değiştirildi',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('delete')) return 'bg-red-50 text-red-700 border-red-200';
    if (action.includes('update') || action === 'password_change') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action === 'login') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action === 'login_failed') return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const totalInitialBalance = paymentMethods.reduce((s, pm) => s + (pm.initialBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Current User Info & Logout */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                {authUser?.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{authUser?.displayName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">@{authUser?.username}</span>
                  {isAdmin && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">Yönetici</Badge>}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" /> Çıkış
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Initial Balance Summary */}
      <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-5 h-5 text-violet-600" /><span className="text-sm text-violet-600 font-medium">Toplam Başlangıç Bakiyesi</span></div>
          <p className="text-2xl font-bold text-violet-700">{totalInitialBalance.toFixed(2)} ₺</p>
        </CardContent>
      </Card>

      {/* User Management - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" /> Kullanıcı Yönetimi</CardTitle>
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => { setNewUsername(''); setNewPassword(''); setNewDisplayName(''); setNewRole('user'); }}>
                    <UserPlus className="w-3 h-3" /> Yeni Kullanıcı
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Yeni Kullanıcı Ekle</DialogTitle></DialogHeader>
                  <form onSubmit={addUser} className="space-y-3">
                    <div><Label>Kullanıcı Adı *</Label><Input value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="orn: ahmet" /></div>
                    <div><Label>Görünen Ad *</Label><Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} required placeholder="Orn: Ahmet Yilmaz" /></div>
                    <div><Label>Şifre * (en az 6 karakter)</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} /></div>
                    <div>
                      <Label>Rol</Label>
                      <div className="flex gap-3 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="role" value="user" checked={newRole === 'user'} onChange={e => setNewRole(e.target.value)} className="accent-emerald-600" />
                          <span className="text-sm">Kullanıcı</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="role" value="admin" checked={newRole === 'admin'} onChange={e => setNewRole(e.target.value)} className="accent-emerald-600" />
                          <span className="text-sm">Yönetici</span>
                        </label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Kullanıcı Ekle</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="p-3 bg-slate-50 rounded-lg group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                      {u.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.displayName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">@{u.username}</span>
                        {u.role === 'admin' && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">Yönetici</Badge>}
                        {!u.isActive && <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] px-1.5 py-0">Pasif</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500" onClick={() => { setEditingUser({ ...u }); setEditPassword(''); }}>
                      <Key className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== authUser?.id && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteUser(u.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kullanıcı Düzenle</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-3">
              <div><Label>Görünen Ad</Label><Input value={editingUser.displayName} onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })} /></div>
              <div>
                <Label>Rol</Label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editRole" value="user" checked={editingUser.role === 'user'} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="accent-emerald-600" />
                    <span className="text-sm">Kullanıcı</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editRole" value="admin" checked={editingUser.role === 'admin'} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="accent-emerald-600" />
                    <span className="text-sm">Yönetici</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>Durum</Label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editActive" value="true" checked={editingUser.isActive} onChange={() => setEditingUser({ ...editingUser, isActive: true })} className="accent-emerald-600" />
                    <span className="text-sm">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editActive" value="false" checked={!editingUser.isActive} onChange={() => setEditingUser({ ...editingUser, isActive: false })} className="accent-emerald-600" />
                    <span className="text-sm">Pasif</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>Yeni Şifre (boş bırakırsanız değişmez)</Label>
                <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Yeni şifre" minLength={editPassword ? 6 : undefined} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={updateUser}>Kaydet</Button>
                <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>İptal</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Log - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /> Aktivite Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-sm">Henüz aktivite kaydı yok</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                      {log.user?.displayName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.user?.displayName || 'Bilinmeyen'}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 border ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {(() => { try { const d = JSON.parse(log.details); return Object.entries(d).filter(([k]) => k !== 'userId').map(([k, v]) => `${k}: ${v}`).join(', '); } catch { return log.details; } })()}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-300 mt-0.5">{new Date(log.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activityTotal > 50 && (
              <div className="flex justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" disabled={activityOffset === 0} onClick={() => fetchActivityLogs(activityOffset - 50)}>Önceki</Button>
                <span className="text-xs text-slate-400 self-center">{Math.floor(activityOffset / 50) + 1} / {Math.ceil(activityTotal / 50)}</span>
                <Button variant="outline" size="sm" disabled={activityOffset + 50 >= activityTotal} onClick={() => fetchActivityLogs(activityOffset + 50)}>Sonraki</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Ödeme Yöntemleri</CardTitle>
            <Dialog open={showAddPM} onOpenChange={setShowAddPM}>
              <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => { setPmName(''); setPmInitialBalance(''); }}><Plus className="w-3 h-3" /> Ekle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Ödeme Yöntemi</DialogTitle></DialogHeader>
                <form onSubmit={addPM} className="space-y-3">
                  <div><Label>Ad *</Label><Input value={pmName} onChange={e => setPmName(e.target.value)} required placeholder="Örn: Nakit, Wise, Vinted" /></div>
                  <div><Label>Başlangıç Bakiyesi</Label><Input type="number" step="0.01" value={pmInitialBalance} onChange={e => setPmInitialBalance(e.target.value)} placeholder="0.00" /></div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Ekle</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {paymentMethods.map(pm => (
            <div key={pm.id} className="p-3 bg-slate-50 rounded-lg group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-sm">{pm.name}</span>
                  {pm.isDefault && <Badge variant="secondary" className="text-xs">Varsayılan</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {((pm._count?.purchaseProducts || 0) + (pm._count?.sales || 0) + (pm._count?.expenses || 0))} işlem
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deletePM(pm.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                <Wallet className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs text-slate-500">Başlangıç:</span>
                {editingBalance[pm.id] !== undefined ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input type="number" step="0.01" value={editingBalance[pm.id]} onChange={e => setEditingBalance(prev => ({ ...prev, [pm.id]: e.target.value }))} className="h-7 text-xs w-28" />
                    <span className="text-xs text-slate-400">₺</span>
                    <Button size="sm" className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateInitialBalance(pm.id)} disabled={savingBalance[pm.id]}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingBalance(prev => { const next = { ...prev }; delete next[pm.id]; return next; })}>
                      İptal
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-semibold text-violet-700">{(pm.initialBalance || 0).toFixed(2)} ₺</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingBalance(prev => ({ ...prev, [pm.id]: (pm.initialBalance || 0).toString() }))}>
                      <Edit className="w-3 h-3 mr-1" /> Düzenle
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sales Channels */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-violet-600" /> Satış Kanalları</CardTitle>
            <Dialog open={showAddSC} onOpenChange={setShowAddSC}>
              <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => setScName('')}><Plus className="w-3 h-3" /> Ekle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Satış Kanalı</DialogTitle></DialogHeader>
                <form onSubmit={addSC} className="space-y-3">
                  <div><Label>Ad *</Label><Input value={scName} onChange={e => setScName(e.target.value)} required placeholder="Örn: Vinted, Tori, Facebook" /></div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Ekle</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {salesChannels.map(sc => (
            <div key={sc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-sm">{sc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{sc._count?.sales || 0} satış</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteSC(sc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
