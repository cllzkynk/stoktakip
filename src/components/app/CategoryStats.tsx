'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Folder, FolderOpen, TrendingUp, TrendingDown, Clock, ShoppingBag, Package, ArrowLeft } from 'lucide-react';

interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  children: CategoryNode[];
}

interface CategoryStats {
  productCount: number;
  totalSpent: number;
  totalRevenue: number;
  totalProfit: number;
  soldCount: number;
  inStockCount: number;
  avgSaleDays: number;
  channels: Record<string, { name: string; count: number; revenue: number }>;
  payments: Record<string, { name: string; count: number; revenue: number }>;
}

interface DetailedStats {
  category: CategoryNode;
  stats: {
    totalProducts: number;
    totalItemsPurchased: number;
    totalItemsSold: number;
    totalSpent: number;
    totalRevenue: number;
    totalProductExpenses: number;
    totalProfit: number;
    soldCount: number;
    inStockCount: number;
    listedCount: number;
    totalItemsInStock: number;
    avgSaleDays: number;
    channels: { name: string; count: number; revenue: number }[];
    payments: { name: string; count: number; revenue: number }[];
    purchasePayments: { name: string; spent: number; count: number }[];
    topProducts: { name: string; quantity: number; soldQuantity: number; spent: number; revenue: number; status: string }[];
    childCategories: { id: string; name: string }[];
  };
}

const fmt = (n: number) => (n || 0).toFixed(2) + ' €';

function CategoryRow({ node, stats, level, onOpen, openedId }: {
  node: CategoryNode;
  stats?: CategoryStats;
  level: number;
  onOpen: (id: string) => void;
  openedId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children?.length > 0;
  const s = stats;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors group cursor-pointer ${openedId === node.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}
        style={{ paddingLeft: `${level * 20 + 10}px` }}
        onClick={() => onOpen(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 hover:bg-slate-200 rounded"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        {openedId === node.id ? (
          <FolderOpen className="w-4 h-4 text-emerald-500" />
        ) : (
          <Folder className="w-4 h-4 text-amber-500" />
        )}
        <span className="font-medium text-sm flex-1">{node.name}</span>
        {s && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{s.productCount} ürün</Badge>
            <span className={`font-semibold ${s.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {s.totalProfit >= 0 ? '+' : ''}{fmt(s.totalProfit)}
            </span>
          </div>
        )}
      </div>
      {hasChildren && expanded && node.children.map(child => (
        <CategoryRow key={child.id} node={child} stats={stats} level={level + 1} onOpen={onOpen} openedId={openedId} />
      ))}
    </div>
  );
}

export default function CategoryStats({ refreshKey }: { refreshKey: number }) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [statsByCategory, setStatsByCategory] = useState<Record<string, CategoryStats>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTree = useCallback(() => {
    fetch('/api/statistics/by-category')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setTree(data.tree || []);
          setStatsByCategory(data.statsByCategory || {});
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { fetchTree(); }, [refreshKey, fetchTree]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/statistics/by-category?categoryId=${selectedId}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setDetail(data);
        else setDetail(null);
      })
      .catch(() => setDetail(null));
  }, [selectedId, refreshKey]);

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-slate-400 text-sm">Yükleniyor...</CardContent></Card>
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-red-400 text-sm">Kategori istatistikleri yüklenemedi</CardContent></Card>
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Folder className="w-12 h-12 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Henüz kategori yok</p>
          <p className="text-slate-400 text-xs mt-1">Kategoriler sekmesinden ekleyin</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Category Tree */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-500" />
            Kategori Bazlı İstatistikler
          </CardTitle>
          <p className="text-xs text-slate-400">Bir kategoriye tıkla → detaylı analiz</p>
        </CardHeader>
        <CardContent className="space-y-1 max-h-96 overflow-y-auto">
          {tree.map(node => (
            <CategoryRow
              key={node.id}
              node={node}
              stats={statsByCategory[node.id]}
              level={0}
              onOpen={(id) => setSelectedId(id === selectedId ? null : id)}
              openedId={selectedId || undefined}
            />
          ))}
        </CardContent>
      </Card>

      {/* Detailed Stats Panel */}
      {detail && (
        <Card className="border-emerald-200 shadow-lg">
          <CardHeader className="pb-2 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedId(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <FolderOpen className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base">{detail.category.name}</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>Kapat</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Top Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                <Package className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-[10px] text-blue-500">Toplam Ürün Kaydı</p>
                <p className="text-base font-bold text-blue-700">{detail.stats.totalProducts}</p>
                <p className="text-[10px] text-blue-400 mt-0.5">{detail.stats.totalItemsPurchased} adet toplam</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg text-center">
                <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-[10px] text-emerald-500">Gelir</p>
                <p className="text-base font-bold text-emerald-700">{fmt(detail.stats.totalRevenue)}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">{detail.stats.totalItemsSold} adet satıldı</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg text-center">
                <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-[10px] text-red-500">Gider</p>
                <p className="text-base font-bold text-red-600">{fmt(detail.stats.totalSpent + detail.stats.totalProductExpenses)}</p>
              </div>
              <div className={`p-2.5 rounded-lg text-center ${detail.stats.totalProfit >= 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                <Wallet className={`w-4 h-4 mx-auto mb-1 ${detail.stats.totalProfit >= 0 ? 'text-teal-500' : 'text-red-500'}`} />
                <p className={`text-[10px] ${detail.stats.totalProfit >= 0 ? 'text-teal-500' : 'text-red-500'}`}>Kar</p>
                <p className={`text-base font-bold ${detail.stats.totalProfit >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                  {detail.stats.totalProfit >= 0 ? '+' : ''}{fmt(detail.stats.totalProfit)}
                </p>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded text-center">
                <p className="text-[10px] text-slate-500">Stokta</p>
                <p className="text-sm font-bold text-slate-700">{detail.stats.inStockCount}</p>
                <p className="text-[10px] text-slate-400">{detail.stats.totalItemsInStock} adet</p>
              </div>
              <div className="p-2 bg-amber-50 rounded text-center">
                <p className="text-[10px] text-amber-500">İlanda</p>
                <p className="text-sm font-bold text-amber-700">{detail.stats.listedCount}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded text-center">
                <p className="text-[10px] text-emerald-500">Satıldı</p>
                <p className="text-sm font-bold text-emerald-700">{detail.stats.soldCount}</p>
              </div>
            </div>

            {/* Avg Sale Time */}
            {detail.stats.avgSaleDays > 0 && (
              <div className="p-3 bg-violet-50 rounded-lg flex items-center gap-3">
                <Clock className="w-5 h-5 text-violet-500" />
                <div>
                  <p className="text-xs text-violet-500">Ortalama Satış Süresi</p>
                  <p className="text-lg font-bold text-violet-700">
                    {detail.stats.avgSaleDays < 1
                      ? `${Math.round(detail.stats.avgSaleDays * 24)} saat`
                      : `${detail.stats.avgSaleDays.toFixed(1)} gün`}
                  </p>
                  <p className="text-[10px] text-violet-400">alıştan satışa kadar geçen süre</p>
                </div>
              </div>
            )}

            {/* Sales Channels */}
            {detail.stats.channels.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-indigo-500" /> Satış Kanalları</h4>
                <div className="space-y-1.5">
                  {detail.stats.channels.map((ch, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="font-medium">{ch.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{ch.count} adet</Badge>
                      </div>
                      <span className="font-semibold text-emerald-600">{fmt(ch.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sale Payment Methods */}
            {detail.stats.payments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-500" /> Satış Ödeme Yöntemleri</h4>
                <div className="space-y-1.5">
                  {detail.stats.payments.map((pm, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium">{pm.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{pm.count} adet</Badge>
                      </div>
                      <span className="font-semibold text-emerald-600">{fmt(pm.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Payment Methods */}
            {detail.stats.purchasePayments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-red-500" /> Alış Ödeme Yöntemleri (nereden alındı)</h4>
                <div className="space-y-1.5">
                  {detail.stats.purchasePayments.map((pm, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="font-medium">{pm.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{pm.count} alım</Badge>
                      </div>
                      <span className="font-semibold text-red-500">{fmt(pm.spent)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Products in this category */}
            {detail.stats.topProducts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Satılan Ürünler (bu kategoride)</h4>
                <div className="space-y-1">
                  {detail.stats.topProducts.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                      <span className="text-xs text-slate-400 w-4">#{i + 1}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{p.soldQuantity} satıldı</Badge>
                      {p.quantity !== p.soldQuantity && (
                        <Badge variant="secondary" className="text-[10px]">/ {p.quantity} stok</Badge>
                      )}
                      <span className="font-semibold text-emerald-600">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subcategories */}
            {detail.stats.childCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Alt Kategoriler</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.stats.childCategories.map(child => (
                    <Button
                      key={child.id}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setSelectedId(child.id)}
                    >
                      <Folder className="w-3 h-3 mr-1 text-amber-500" />
                      {child.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Wallet({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
