'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Banknote, Trash2, ArrowDownToLine, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod { id: string; name: string; }
interface Expense { id: string; amount: number; description: string; date: string; paymentMethodId: string; type: string; paymentMethod: PaymentMethod; }

interface Props { refreshKey: number; onRefresh: () => void; }

export default function ExpensesTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'withdrawal' });

  const fetchData = async () => {
    try {
      const [expRes, pmRes] = await Promise.all([fetch('/api/expenses'), fetch('/api/payment-methods')]);
      setExpenses(await expRes.json());
      setPaymentMethods(await pmRes.json());
    } catch { toast({ title: 'Hata', description: 'Veriler yüklenemedi', variant: 'destructive' }); }
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Gider kaydedildi' });
      setShowAddDialog(false);
      setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'withdrawal' });
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Gider kaydedilemedi', variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu gideri silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'Silindi', description: 'Gider silindi' });
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Gider silinemedi', variant: 'destructive' }); }
  };

  const totalWithdrawn = expenses.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0);
  const totalOtherExpenses = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  // Group by payment method
  const byPaymentMethod: Record<string, { name: string; expenses: Expense[]; total: number }> = {};
  expenses.forEach(exp => {
    if (!byPaymentMethod[exp.paymentMethodId]) {
      byPaymentMethod[exp.paymentMethodId] = { name: exp.paymentMethod.name, expenses: [], total: 0 };
    }
    byPaymentMethod[exp.paymentMethodId].expenses.push(exp);
    byPaymentMethod[exp.paymentMethodId].total += exp.amount;
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><ArrowDownToLine className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-600">Çekilen Para</span></div>
            <p className="text-xl font-bold text-amber-700">{totalWithdrawn.toFixed(2)} ₺</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-red-500" /><span className="text-xs text-red-500">Diğer Giderler</span></div>
            <p className="text-xl font-bold text-red-600">{totalOtherExpenses.toFixed(2)} ₺</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Button */}
      <div className="flex justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'withdrawal' })}>
              <Plus className="w-4 h-4" /> Gider Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Gider / Para Çekme</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Tip *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="withdrawal">Para Çekme</SelectItem>
                    <SelectItem value="expense">Diğer Gider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tutar *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required /></div>
              <div><Label>Açıklama *</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required /></div>
              <div><Label>Tarih *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} required /></div>
              <div><Label>Ödeme Yöntemi *</Label>
                <Select value={form.paymentMethodId} onValueChange={v => setForm(f => ({...f, paymentMethodId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Kaydet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses grouped by payment method */}
      {Object.entries(byPaymentMethod).map(([pmId, group]) => (
        <Card key={pmId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4 text-amber-500" /> {group.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">{group.total.toFixed(2)} ₺</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={exp.type === 'withdrawal' ? 'outline' : 'secondary'} className="text-xs">
                      {exp.type === 'withdrawal' ? 'Çekim' : 'Gider'}
                    </Badge>
                    <span className="text-sm">{exp.description}</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-red-500">-{exp.amount.toFixed(2)} ₺</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => handleDelete(exp.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {expenses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Henüz gider kaydı yok</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
