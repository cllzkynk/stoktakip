'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, CreditCard, Store, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod { id: string; name: string; isDefault: boolean; _count?: { purchaseProducts: number; sales: number; expenses: number }; }
interface SalesChannel { id: string; name: string; _count?: { sales: number }; }

interface Props { refreshKey: number; onRefresh: () => void; }

export default function SettingsTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [showAddPM, setShowAddPM] = useState(false);
  const [showAddSC, setShowAddSC] = useState(false);
  const [pmName, setPmName] = useState('');
  const [scName, setScName] = useState('');

  const fetchData = async () => {
    try {
      const [pmRes, scRes] = await Promise.all([fetch('/api/payment-methods'), fetch('/api/sales-channels')]);
      setPaymentMethods(await pmRes.json());
      setSalesChannels(await scRes.json());
    } catch { toast({ title: 'Hata', description: 'Veriler yüklenemedi', variant: 'destructive' }); }
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  const addPM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: pmName }) });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Ödeme yöntemi eklendi' });
      setShowAddPM(false);
      setPmName('');
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Eklenemedi', variant: 'destructive' }); }
  };

  const deletePM = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Ödeme yöntemi silindi' });
      fetchData();
      onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Silinemedi', variant: 'destructive' }); }
  };

  const addSC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales-channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: scName }) });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Satış kanalı eklendi' });
      setShowAddSC(false);
      setScName('');
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Eklenemedi', variant: 'destructive' }); }
  };

  const deleteSC = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/sales-channels?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Satış kanalı silindi' });
      fetchData();
      onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Silinemedi', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Ödeme Yöntemleri</CardTitle>
            <Dialog open={showAddPM} onOpenChange={setShowAddPM}>
              <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => setPmName('')}><Plus className="w-3 h-3" /> Ekle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Ödeme Yöntemi</DialogTitle></DialogHeader>
                <form onSubmit={addPM} className="space-y-3">
                  <div><Label>Ad *</Label><Input value={pmName} onChange={e => setPmName(e.target.value)} required placeholder="Örn: Nakit, Wise, Vinted" /></div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Ekle</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {paymentMethods.map(pm => (
            <div key={pm.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
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
          ))}
          {paymentMethods.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">Henüz ödeme yöntemi yok</p>}
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
          {salesChannels.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">Henüz satış kanalı yok</p>}
        </CardContent>
      </Card>
    </div>
  );
}
