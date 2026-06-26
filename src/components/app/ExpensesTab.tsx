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
import { Plus, Banknote, Trash2, PiggyBank, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod { id: string; name: string; }
interface Expense { id: string; amount: number; description: string; date: string; paymentMethodId: string; type: string; paymentMethod: PaymentMethod; }

interface Props { refreshKey: number; onRefresh: () => void; }

const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  savings: { label: 'Birikimde', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <PiggyBank className="w-3.5 h-3.5" /> },
  extra_spending: { label: 'Ek Harcama', color: 'bg-red-100 text-red-700 border-red-200', icon: <Receipt className="w-3.5 h-3.5" /> },
};

export default function ExpensesTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'savings' });

  const fetchData = async () => {
    try {
      const [expRes, pmRes] = await Promise.all([fetch('/api/expenses'), fetch('/api/payment-methods')]);
      const expData = expRes.ok ? await expRes.json() : [];
      const pmData = pmRes.ok ? await pmRes.json() : [];
      setExpenses(Array.isArray(expData) ? expData : []);
      setPaymentMethods(Array.isArray(pmData) ? pmData : []);
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
      setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'savings' });
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Gider kaydedilemedi', variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'Silindi', description: 'Kayıt silindi' });
      fetchData();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Kayıt silinemedi', variant: 'destructive' }); }
  };

  const totalSavings = expenses.filter(e => e.type === 'savings').reduce((s, e) => s + e.amount, 0);
  const totalExtraSpending = expenses.filter(e => e.type === 'extra_spending').reduce((s, e) => s + e.amount, 0);
  const totalAll = totalSavings + totalExtraSpending;

  // Group by payment method, then split by type
  const byPaymentMethod: Record<string, { name: string; expenses: Expense[]; total: number; totalSavings: number; totalExtraSpending: number }> = {};
  expenses.forEach(exp => {
    if (!byPaymentMethod[exp.paymentMethodId]) {
      byPaymentMethod[exp.paymentMethodId] = { name: exp.paymentMethod.name, expenses: [], total: 0, totalSavings: 0, totalExtraSpending: 0 };
    }
    byPaymentMethod[exp.paymentMethodId].expenses.push(exp);
    byPaymentMethod[exp.paymentMethodId].total += exp.amount;
    if (exp.type === 'savings') byPaymentMethod[exp.paymentMethodId].totalSavings += exp.amount;
    if (exp.type === 'extra_spending') byPaymentMethod[exp.paymentMethodId].totalExtraSpending += exp.amount;
  });

  const getTypeInfo = (type: string) => TYPE_LABELS[type] || TYPE_LABELS.savings;

  return (
    <div className="space-y-4">
      {/* Summary - Split into Birikimde and Ek Harcama */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><PiggyBank className="w-4 h-4 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Çekilen Para (Birikimde)</span></div>
            <p className="text-xl font-bold text-emerald-700">{totalSavings.toFixed(2)} ₺</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">Bende kalan para</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-red-500" /><span className="text-xs text-red-500 font-medium">Ek Harcama</span></div>
            <p className="text-xl font-bold text-red-600">{totalExtraSpending.toFixed(2)} ₺</p>
            <p className="text-[10px] text-red-400 mt-0.5">Tamamen giden</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Banknote className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-600 font-medium">Toplam Çekilen</span></div>
            <p className="text-xl font-bold text-amber-700">{totalAll.toFixed(2)} ₺</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Button */}
      <div className="flex justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethodId: '', type: 'savings' })}>
              <Plus className="w-4 h-4" /> Para Çek / Gider Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Para Çek / Gider Ekle</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Tip *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">
                      <span className="flex items-center gap-2"><PiggyBank className="w-4 h-4 text-emerald-600" /> Birikimde (Bende kalan)</span>
                    </SelectItem>
                    <SelectItem value="extra_spending">
                      <span className="flex items-center gap-2"><Receipt className="w-4 h-4 text-red-500" /> Ek Harcama (Tamamen giden)</span>
                    </SelectItem>
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
          <CardContent>
            {/* Sub-totals */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-[10px] text-emerald-600">Birikimde</p>
                  <p className="text-sm font-bold text-emerald-700">{group.totalSavings.toFixed(2)} ₺</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                <Receipt className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-[10px] text-red-500">Ek Harcama</p>
                  <p className="text-sm font-bold text-red-600">{group.totalExtraSpending.toFixed(2)} ₺</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {group.expenses.map(exp => {
                const typeInfo = getTypeInfo(exp.type);
                return (
                  <div key={exp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                          <span className="flex items-center gap-1">{typeInfo.icon} {typeInfo.label}</span>
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
                );
              })}
            </div>
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
