'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, Eye, Megaphone, ShoppingBag, Edit, Trash2, Image as ImageIcon, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImage, getBase64SizeKB } from '@/lib/image-compress';

interface Category { id: string; name: string; parentId: string | null; children: Category[]; }
interface PaymentMethod { id: string; name: string; }
interface Sale { id: string; salePrice: number; saleDate: string; salesChannelId: string; salePaymentId: string; buyerInfo?: string; notes?: string; salesChannel: { id: string; name: string }; salePayment: { id: string; name: string }; }
interface Product { id: string; productNumber: number; name: string; description?: string; categoryId?: string; category?: Category; purchasePrice: number; purchaseDate: string; color?: string; model?: string; size?: string; condition?: string; imageUrl?: string; imageData?: string; isListed: boolean; listedDate?: string; status: string; purchasePaymentId: string; purchasePayment: PaymentMethod; sale?: Sale; expenses: { id: string; amount: number; description: string; date: string }[]; }

// Get product image src - prefers imageData (base64 in DB), falls back to imageUrl (file path)
// For sold products older than 7 days, shows reduced quality indicator
const getProductImage = (product: Product) => product.imageData || product.imageUrl || null;

// Check if a sold product's image should be displayed in low quality (7+ days since sale)
const isOldSoldProduct = (product: Product): boolean => {
  if (product.status !== 'sold' || !product.sale) return false;
  const saleDate = new Date(product.sale.saleDate);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return saleDate < sevenDaysAgo;
};

interface Props {
  refreshKey: number;
  onRefresh: () => void;
}

export default function InventoryTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number>(0);

  // Sale form
  const [saleForm, setSaleForm] = useState({ salePrice: '', saleDate: new Date().toISOString().split('T')[0], salesChannelId: '', salePaymentId: '', buyerInfo: '', notes: '' });

  // Add/Edit form
  const [productForm, setProductForm] = useState({
    name: '', description: '', categoryId: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], color: '', model: '', size: '', condition: '', purchasePaymentId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const [productsRes, catRes, pmRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        fetch('/api/categories'),
        fetch('/api/payment-methods'),
      ]);
      setProducts(await productsRes.json());
      setCategories(await catRes.json());
      setPaymentMethods(await pmRes.json());
    } catch { toast({ title: 'Hata', description: 'Veriler yüklenemedi', variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [refreshKey, statusFilter, search]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          imageData: compressedImage,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Ürün eklendi' });
      setShowAddDialog(false);
      resetProductForm();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Ürün eklenemedi', variant: 'destructive' }); }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: productForm.name,
          description: productForm.description,
          categoryId: productForm.categoryId,
          purchasePrice: productForm.purchasePrice,
          purchaseDate: productForm.purchaseDate,
          color: productForm.color,
          model: productForm.model,
          size: productForm.size,
          condition: productForm.condition,
          purchasePaymentId: productForm.purchasePaymentId,
          imageData: compressedImage, // null if not changed, new base64 if changed
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Başarılı', description: 'Ürün güncellendi' });
      setShowEditDialog(false);
      resetProductForm();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Ürün güncellenemedi', variant: 'destructive' }); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'Silindi', description: 'Ürün silindi' });
      setShowDetailDialog(false);
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Ürün silinemedi', variant: 'destructive' }); }
  };

  const handleToggleListed = async (product: Product) => {
    try {
      const formData = new FormData();
      formData.append('id', product.id);
      formData.append('isListed', (!product.isListed).toString());
      formData.append('name', product.name);
      formData.append('purchasePaymentId', product.purchasePaymentId);

      const res = await fetch('/api/products', { method: 'PUT', body: formData });
      if (!res.ok) throw new Error();
      toast({ title: product.isListed ? 'İlandan kaldırıldı' : 'İlana eklendi', description: product.name });
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Durum güncellenemedi', variant: 'destructive' }); }
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...saleForm, productId: selectedProduct.id }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Satış kaydedildi', description: `${selectedProduct.name} satıldı!` });
      setShowSaleDialog(false);
      setSaleForm({ salePrice: '', saleDate: new Date().toISOString().split('T')[0], salesChannelId: '', salePaymentId: '', buyerInfo: '', notes: '' });
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Satış kaydedilemedi', variant: 'destructive' }); }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', categoryId: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], color: '', model: '', size: '', condition: '', purchasePaymentId: '' });
    setCompressedImage(null);
    setImageSize(0);
    setImagePreview(null);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      purchasePrice: product.purchasePrice.toString(),
      purchaseDate: new Date(product.purchaseDate).toISOString().split('T')[0],
      color: product.color || '',
      model: product.model || '',
      size: product.size || '',
      condition: product.condition || '',
      purchasePaymentId: product.purchasePaymentId,
    });
    setImagePreview(getProductImage(product));
    setCompressedImage(null); // will be set if user picks a new image
    setImageSize(0);
    setShowEditDialog(true);
  };

  const openSaleDialog = (product: Product) => {
    setSelectedProduct(product);
    setSaleForm(prev => ({ ...prev, salePrice: '', salesChannelId: '', salePaymentId: '' }));
    setShowSaleDialog(true);
  };

  const flattenCategories = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
    let result: { id: string; name: string }[] = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: prefix + cat.name });
      if (cat.children?.length) {
        result = result.concat(flattenCategories(cat.children, prefix + cat.name + ' > '));
      }
    }
    return result;
  };

  const flatCategories = flattenCategories(categories);

  const getStatusBadge = (product: Product) => {
    if (product.status === 'sold') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Satıldı</Badge>;
    if (product.isListed) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs"><Megaphone className="w-3 h-3 mr-1" />İlanda</Badge>;
    return <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Stokta</Badge>;
  };

  const profit = selectedProduct?.sale ? selectedProduct.sale.salePrice - selectedProduct.purchasePrice - (selectedProduct.expenses?.reduce((s, e) => s + e.amount, 0) || 0) : 0;

  return (
    <div className="space-y-4">
      {/* Header with search and add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="in_stock">Stokta</SelectItem>
              <SelectItem value="listed">İlanda</SelectItem>
              <SelectItem value="sold">Satıldı</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto" onClick={resetProductForm}>
              <Plus className="w-4 h-4" /> Ürün Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Yeni Ürün Ekle</DialogTitle></DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <div><Label>Ürün Adı *</Label><Input value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} required /></div>
              <div><Label>Açıklama</Label><Textarea value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kategori</Label>
                  <Select value={productForm.categoryId} onValueChange={v => setProductForm(p => ({...p, categoryId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>{flatCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Alış Fiyatı *</Label><Input type="number" step="0.01" value={productForm.purchasePrice} onChange={e => setProductForm(p => ({...p, purchasePrice: e.target.value}))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Alış Tarihi *</Label><Input type="date" value={productForm.purchaseDate} onChange={e => setProductForm(p => ({...p, purchaseDate: e.target.value}))} required /></div>
                <div><Label>Ödeme Yöntemi *</Label>
                  <Select value={productForm.purchasePaymentId} onValueChange={v => setProductForm(p => ({...p, purchasePaymentId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Renk</Label><Input value={productForm.color} onChange={e => setProductForm(p => ({...p, color: e.target.value}))} /></div>
                <div><Label>Model</Label><Input value={productForm.model} onChange={e => setProductForm(p => ({...p, model: e.target.value}))} /></div>
                <div><Label>Beden</Label><Input value={productForm.size} onChange={e => setProductForm(p => ({...p, size: e.target.value}))} /></div>
              </div>
              <div><Label>Durum</Label><Input value={productForm.condition} onChange={e => setProductForm(p => ({...p, condition: e.target.value}))} placeholder="Yeni, İyi, Orta vb." /></div>
              <div>
                <Label>Resim</Label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-emerald-400 transition-colors">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Resim Seç</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          const compressed = await compressImage(f, { maxWidth: 600, maxHeight: 600, quality: 0.5 });
                          setCompressedImage(compressed);
                          setImagePreview(compressed);
                          setImageSize(getBase64SizeKB(compressed));
                        } catch {
                          toast({ title: 'Hata', description: 'Resim sıkıştırılamadı', variant: 'destructive' });
                        }
                      }
                    }} />
                  </label>
                  {imagePreview && (
                    <div className="flex items-center gap-2">
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" />
                      {imageSize > 0 && <span className="text-[10px] text-emerald-600 font-medium">{imageSize} KB</span>}
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Ürünü Ekle</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-40 bg-slate-200 rounded-lg mb-3" /><div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-4 bg-slate-200 rounded w-1/2" /></CardContent></Card>)}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-500 mb-1">Henüz ürün yok</h3>
            <p className="text-slate-400 text-sm">İlk ürününüzü ekleyerek başlayın</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 overflow-hidden">
              <div className="relative">
                {getProductImage(product) ? (
                  <img
                    src={getProductImage(product)!}
                    alt={product.name}
                    className={`w-full h-44 object-cover ${isOldSoldProduct(product) ? 'blur-[1px] opacity-70' : ''}`}
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                {isOldSoldProduct(product) && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Arşiv kalite
                  </div>
                )}
                <div className="absolute top-2 left-2">{getStatusBadge(product)}</div>
                <div className="absolute top-2 right-2">
                  <span className="text-xs font-mono bg-black/60 text-white px-2 py-0.5 rounded-full">#{product.productNumber}</span>
                </div>
                {product.isListed && (
                  <div className="absolute bottom-2 right-2">
                    <span className="flex items-center gap-1 bg-amber-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                      <Megaphone className="w-3 h-3" /> İlanda
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold text-slate-800 truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {product.category && <span>{product.category.name}</span>}
                  {product.color && <span>• {product.color}</span>}
                  {product.model && <span>• {product.model}</span>}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-lg font-bold text-slate-800">{product.purchasePrice.toFixed(2)} ₺</span>
                    <span className="text-xs text-slate-400 ml-1">alış</span>
                  </div>
                  {product.sale && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-600">{product.sale.salePrice.toFixed(2)} ₺</span>
                      <span className="text-xs text-slate-400 ml-1">satış</span>
                    </div>
                  )}
                </div>
                {product.sale && (
                  <div className={`text-xs font-semibold mt-1 ${product.sale.salePrice - product.purchasePrice >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {product.sale.salePrice - product.purchasePrice >= 0 ? '+' : ''}{(product.sale.salePrice - product.purchasePrice).toFixed(2)} ₺ kar
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex items-center gap-1">
                  {product.status !== 'sold' && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1" onClick={() => openSaleDialog(product)}>
                      <ShoppingBag className="w-3 h-3" /> Sat
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleToggleListed(product)}>
                    <Megaphone className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setSelectedProduct(product); setShowDetailDialog(true); }}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEditDialog(product)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 gap-1" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Satış Kaydet</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="mb-3 p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold">{selectedProduct.name}</p>
              <p className="text-sm text-slate-500">Alış: {selectedProduct.purchasePrice.toFixed(2)} ₺</p>
            </div>
          )}
          <form onSubmit={handleSellProduct} className="space-y-3">
            <div><Label>Satış Fiyatı *</Label><Input type="number" step="0.01" value={saleForm.salePrice} onChange={e => setSaleForm(f => ({...f, salePrice: e.target.value}))} required /></div>
            <div><Label>Satış Tarihi *</Label><Input type="date" value={saleForm.saleDate} onChange={e => setSaleForm(f => ({...f, saleDate: e.target.value}))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Satış Kanalı *</Label>
                <Select value={saleForm.salesChannelId} onValueChange={v => setSaleForm(f => ({...f, salesChannelId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{/* Fetched dynamically */}<SalesChannelOptions /></SelectContent>
                </Select>
              </div>
              <div><Label>Ödeme Yöntemi *</Label>
                <Select value={saleForm.salePaymentId} onValueChange={v => setSaleForm(f => ({...f, salePaymentId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Alıcı Bilgisi</Label><Input value={saleForm.buyerInfo} onChange={e => setSaleForm(f => ({...f, buyerInfo: e.target.value}))} /></div>
            <div><Label>Notlar</Label><Textarea value={saleForm.notes} onChange={e => setSaleForm(f => ({...f, notes: e.target.value}))} /></div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Satışı Kaydet</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ürün Detayı</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {getProductImage(selectedProduct) && (
                <img src={getProductImage(selectedProduct)!} alt={selectedProduct.name} className="w-full max-h-64 object-contain rounded-lg border" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">ID:</span> <span className="font-mono">#{selectedProduct.productNumber}</span></div>
                <div><span className="text-slate-500">Durum:</span> {getStatusBadge(selectedProduct)}</div>
                <div><span className="text-slate-500">Ad:</span> <span className="font-semibold">{selectedProduct.name}</span></div>
                <div><span className="text-slate-500">Kategori:</span> {selectedProduct.category?.name || '-'}</div>
                <div><span className="text-slate-500">Alış Fiyatı:</span> <span className="font-bold">{selectedProduct.purchasePrice.toFixed(2)} ₺</span></div>
                <div><span className="text-slate-500">Alış Tarihi:</span> {new Date(selectedProduct.purchaseDate).toLocaleDateString('tr-TR')}</div>
                <div><span className="text-slate-500">Renk:</span> {selectedProduct.color || '-'}</div>
                <div><span className="text-slate-500">Model:</span> {selectedProduct.model || '-'}</div>
                <div><span className="text-slate-500">Beden:</span> {selectedProduct.size || '-'}</div>
                <div><span className="text-slate-500">Kondisyon:</span> {selectedProduct.condition || '-'}</div>
                <div><span className="text-slate-500">Alış Ödeme:</span> {selectedProduct.purchasePayment?.name || '-'}</div>
                <div><span className="text-slate-500">İlanda:</span> {selectedProduct.isListed ? '✅ Evet' : '❌ Hayır'}</div>
              </div>
              {selectedProduct.description && (
                <div><span className="text-slate-500 text-sm">Açıklama:</span><p className="text-sm mt-1">{selectedProduct.description}</p></div>
              )}
              {selectedProduct.sale && (
                <>
                  <Separator />
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-emerald-800 mb-2">Satış Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-emerald-600">Satış Fiyatı:</span> <span className="font-bold">{selectedProduct.sale.salePrice.toFixed(2)} ₺</span></div>
                      <div><span className="text-emerald-600">Satış Tarihi:</span> {new Date(selectedProduct.sale.saleDate).toLocaleDateString('tr-TR')}</div>
                      <div><span className="text-emerald-600">Kanal:</span> {selectedProduct.sale.salesChannel?.name}</div>
                      <div><span className="text-emerald-600">Ödeme:</span> {selectedProduct.sale.salePayment?.name}</div>
                      <div className="col-span-2"><span className="text-emerald-600">Kar:</span> <span className={`font-bold text-lg ${profit >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(2)} ₺</span></div>
                    </div>
                  </div>
                </>
              )}
              {selectedProduct.expenses?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">Ürün Giderleri</h4>
                    {selectedProduct.expenses.map(exp => (
                      <div key={exp.id} className="flex justify-between text-sm py-1 border-b border-slate-100">
                        <span>{exp.description}</span>
                        <span className="font-semibold">{exp.amount.toFixed(2)} ₺</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                {selectedProduct.status !== 'sold' && <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowDetailDialog(false); openSaleDialog(selectedProduct); }}>Sat</Button>}
                <Button variant="outline" className="flex-1" onClick={() => { setShowDetailDialog(false); openEditDialog(selectedProduct); }}>Düzenle</Button>
                <Button variant="destructive" onClick={() => handleDeleteProduct(selectedProduct.id)}>Sil</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ürün Düzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-3">
            <input type="hidden" value={selectedProduct?.id} />
            <div><Label>Ürün Adı *</Label><Input value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} required /></div>
            <div><Label>Açıklama</Label><Textarea value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <Select value={productForm.categoryId} onValueChange={v => setProductForm(p => ({...p, categoryId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{flatCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Alış Fiyatı *</Label><Input type="number" step="0.01" value={productForm.purchasePrice} onChange={e => setProductForm(p => ({...p, purchasePrice: e.target.value}))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Alış Tarihi *</Label><Input type="date" value={productForm.purchaseDate} onChange={e => setProductForm(p => ({...p, purchaseDate: e.target.value}))} required /></div>
              <div><Label>Ödeme Yöntemi *</Label>
                <Select value={productForm.purchasePaymentId} onValueChange={v => setProductForm(p => ({...p, purchasePaymentId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Renk</Label><Input value={productForm.color} onChange={e => setProductForm(p => ({...p, color: e.target.value}))} /></div>
              <div><Label>Model</Label><Input value={productForm.model} onChange={e => setProductForm(p => ({...p, model: e.target.value}))} /></div>
              <div><Label>Beden</Label><Input value={productForm.size} onChange={e => setProductForm(p => ({...p, size: e.target.value}))} /></div>
            </div>
            <div><Label>Durum</Label><Input value={productForm.condition} onChange={e => setProductForm(p => ({...p, condition: e.target.value}))} /></div>
            <div>
              <Label>Resim</Label>
              <div className="mt-1 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-emerald-400 transition-colors">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Değiştir</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try {
                        const compressed = await compressImage(f, { maxWidth: 600, maxHeight: 600, quality: 0.5 });
                        setCompressedImage(compressed);
                        setImagePreview(compressed);
                        setImageSize(getBase64SizeKB(compressed));
                      } catch {
                        toast({ title: 'Hata', description: 'Resim sıkıştırılamadı', variant: 'destructive' });
                      }
                    }
                  }} />
                </label>
                {imagePreview && (
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" />
                    {imageSize > 0 && <span className="text-[10px] text-emerald-600 font-medium">{imageSize} KB</span>}
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Güncelle</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalesChannelOptions() {
  const [channels, setChannels] = useState<{id: string; name: string}[]>([]);
  useEffect(() => { fetch('/api/sales-channels').then(r => r.json()).then(setChannels).catch(() => {}); }, []);
  return <>{channels.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}</>;
}
