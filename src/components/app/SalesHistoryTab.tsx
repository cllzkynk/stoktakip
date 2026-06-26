'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Trash2, Eye, Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Sale {
  id: string;
  productId: string;
  salePrice: number;
  saleDate: string;
  salesChannelId: string;
  salePaymentId: string;
  buyerInfo?: string;
  notes?: string;
  product: { id: string; productNumber: number; name: string; purchasePrice: number; color?: string; model?: string; imageUrl?: string; imageData?: string; category?: { name: string } };
  salesChannel: { id: string; name: string };
  salePayment: { id: string; name: string };
}

interface Props { refreshKey: number; onRefresh: () => void; }

export default function SalesHistoryTab({ refreshKey, onRefresh }: Props) {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/sales-channels').then(r => r.json()).then(setChannels).catch(() => {});
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      setSales(await res.json());
    } catch { toast({ title: 'Hata', description: 'Satışlar yüklenemedi', variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { fetchSales(); }, [refreshKey]);

  const handleDeleteSale = async (id: string) => {
    if (!confirm('Bu satış kaydını silmek istediğinize emin misiniz? Ürün stoka geri dönecektir.')) return;
    try {
      const res = await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: 'Silindi', description: 'Satış kaydı silindi, ürün stoka döndü' });
      setShowDetail(false);
      fetchSales();
      onRefresh();
    } catch { toast({ title: 'Hata', description: 'Satış silinemedi', variant: 'destructive' }); }
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = !search || s.product.name.toLowerCase().includes(search.toLowerCase()) || s.product.productNumber.toString().includes(search);
    const matchesChannel = channelFilter === 'all' || s.salesChannelId === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.salePrice, 0);
  const totalProfit = filteredSales.reduce((s, sale) => s + (sale.salePrice - sale.product.purchasePrice), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><History className="w-5 h-5 text-emerald-600" /> Satış Geçmişi</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {channels.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <span className="text-xs text-emerald-600">Toplam Ciro</span>
            <p className="text-xl font-bold text-emerald-700">{totalRevenue.toFixed(2)} ₺</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${totalProfit >= 0 ? 'from-teal-50 to-teal-100/50 border-teal-200' : 'from-red-50 to-red-100/50 border-red-200'}`}>
          <CardContent className="p-4">
            <span className={`text-xs ${totalProfit >= 0 ? 'text-teal-600' : 'text-red-500'}`}>Toplam Kar</span>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} ₺</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-slate-200 rounded" /></CardContent></Card>)}</div>
      ) : filteredSales.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Henüz satış kaydı yok</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSales.map(sale => {
            const profit = sale.salePrice - sale.product.purchasePrice;
            return (
              <Card key={sale.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(sale.product.imageData || sale.product.imageUrl) ? (
                        <img src={sale.product.imageData || sale.product.imageUrl || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400">#{sale.product.productNumber}</span>
                        <span className="font-semibold text-sm truncate">{sale.product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge variant="secondary" className="text-xs">{sale.salesChannel.name}</Badge>
                        <span>{new Date(sale.saleDate).toLocaleDateString('tr-TR')}</span>
                        {sale.product.category && <span>• {sale.product.category.name}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div><span className="text-xs text-slate-400">Alış</span><p className="text-sm font-semibold text-slate-600">{sale.product.purchasePrice.toFixed(2)} ₺</p></div>
                        <div><span className="text-xs text-slate-400">Satış</span><p className="text-sm font-semibold text-emerald-600">{sale.salePrice.toFixed(2)} ₺</p></div>
                        <div><span className="text-xs text-slate-400">Kar</span><p className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(2)} ₺</p></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedSale(sale); setShowDetail(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDeleteSale(sale.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Satış Detayı</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Ürün:</span> <span className="font-semibold">{selectedSale.product.name}</span></div>
                <div><span className="text-slate-500">ID:</span> #{selectedSale.product.productNumber}</div>
                <div><span className="text-slate-500">Satış Fiyatı:</span> <span className="font-bold text-emerald-600">{selectedSale.salePrice.toFixed(2)} ₺</span></div>
                <div><span className="text-slate-500">Alış Fiyatı:</span> {selectedSale.product.purchasePrice.toFixed(2)} ₺</div>
                <div><span className="text-slate-500">Kanal:</span> {selectedSale.salesChannel.name}</div>
                <div><span className="text-slate-500">Ödeme:</span> {selectedSale.salePayment.name}</div>
                <div><span className="text-slate-500">Tarih:</span> {new Date(selectedSale.saleDate).toLocaleDateString('tr-TR')}</div>
                <div><span className="text-slate-500">Kar:</span> <span className={`font-bold ${selectedSale.salePrice - selectedSale.product.purchasePrice >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{(selectedSale.salePrice - selectedSale.product.purchasePrice).toFixed(2)} ₺</span></div>
              </div>
              {selectedSale.buyerInfo && <div><span className="text-slate-500 text-sm">Alıcı:</span> <span className="text-sm">{selectedSale.buyerInfo}</span></div>}
              {selectedSale.notes && <div><span className="text-slate-500 text-sm">Notlar:</span> <p className="text-sm">{selectedSale.notes}</p></div>}
              <Button variant="destructive" className="w-full" onClick={() => handleDeleteSale(selectedSale.id)}>Satışı Sil (Ürün Stoka Döner)</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
