'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Trash2, ChevronRight, FolderTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/app/PasswordGate';

interface Category { id: string; name: string; parentId: string | null; children: Category[]; products?: { id: string }[]; }

interface Props { refreshKey: number; onRefresh: () => void; }

export default function CategoriesTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const authUser = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({ name: '', parentId: '' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = res.ok ? await res.json() : [];
      setCategories(Array.isArray(data) ? data : []);
    } catch { toast({ title: 'Hata', description: 'Kategoriler yüklenemedi', variant: 'destructive' }); }
  };

  useEffect(() => { fetchCategories(); }, [refreshKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, parentId: form.parentId || null, userId: authUser?.id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Başarılı', description: 'Kategori eklendi' });
      setShowAddDialog(false);
      setForm({ name: '', parentId: '' });
      fetchCategories();
      onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Kategori eklenemedi', variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}${authUser ? `&userId=${authUser.id}` : ''}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast({ title: 'Silindi', description: 'Kategori silindi' });
      fetchCategories();
      onRefresh();
    } catch (err: unknown) { toast({ title: 'Hata', description: err instanceof Error ? err.message : 'Kategori silinemedi', variant: 'destructive' }); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const flatCategories = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
    let result: { id: string; name: string }[] = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: prefix + cat.name });
      if (cat.children?.length) result = result.concat(flatCategories(cat.children, prefix + cat.name + ' > '));
    }
    return result;
  };

  const renderCategory = (cat: Category, depth = 0) => {
    const hasChildren = cat.children?.length > 0;
    const productCount = cat.products?.length || 0;
    const isExpanded = expanded.has(cat.id);

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(cat.id)} className="p-1 hover:bg-slate-200 rounded">
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <FolderOpen className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-sm flex-1">{cat.name}</span>
          <Badge variant="secondary" className="text-xs">{productCount} ürün</Badge>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => handleDelete(cat.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        {hasChildren && isExpanded && cat.children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FolderTree className="w-5 h-5 text-amber-500" /> Kategori Yönetimi</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setForm({ name: '', parentId: '' })}>
              <Plus className="w-4 h-4" /> Kategori Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Kategori</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Kategori Adı *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
              <div><Label>Üst Kategori</Label>
                <Select value={form.parentId} onValueChange={v => setForm(f => ({...f, parentId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Ana kategori (opsiyonel)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Ana kategori</SelectItem>
                    {flatCategories(categories).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Ekle</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-2">
          {categories.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Henüz kategori yok</p>
            </div>
          ) : (
            categories.map(cat => renderCategory(cat))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
