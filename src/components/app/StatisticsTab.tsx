'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Megaphone, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalSpent: number;
  totalRevenue: number;
  totalProfit: number;
  totalWithdrawn: number;
  totalExtraSpending: number;
  totalAllWithdrawn: number;
  avgProfit: number;
  inStockCount: number;
  listedCount: number;
  soldCount: number;
  totalProducts: number;
  inStockValue: number;
  paymentMethodStats: { id: string; name: string; totalIn: number; totalOut: number; totalExpenses: number; totalSavings: number; totalExtraSpending: number; balance: number }[];
  salesChannelStats: { id: string; name: string; totalSales: number; totalRevenue: number }[];
  topColors: [string, number][];
  topCategories: { name: string; count: number; revenue: number }[];
  monthlyBreakdown: { month: string; purchases: number; sales: number }[];
}

interface Props { refreshKey: number; }

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];

export default function StatisticsTab({ refreshKey }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    fetch('/api/statistics')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  useEffect(() => { fetchStats(); }, [refreshKey, fetchStats]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-slate-200 rounded" /></CardContent></Card>)}
      </div>
    );
  }

  const fmt = (n: number) => n.toFixed(2) + ' ₺';

  const channelData = stats.salesChannelStats.map(ch => ({ name: ch.name, value: ch.totalRevenue }));
  const colorData = stats.topColors.map(([name, count]) => ({ name, value: count }));

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Toplam Gelir</span></div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-5 h-5 text-red-500" /><span className="text-xs text-red-500 font-medium">Toplam Gider</span></div>
            <p className="text-2xl font-bold text-red-600">{fmt(stats.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${stats.totalProfit >= 0 ? 'from-teal-50 to-teal-100/50 border-teal-200' : 'from-red-50 to-red-100/50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign className={`w-5 h-5 ${stats.totalProfit >= 0 ? 'text-teal-600' : 'text-red-500'}`} /><span className={`text-xs font-medium ${stats.totalProfit >= 0 ? 'text-teal-600' : 'text-red-500'}`}>Net Kar</span></div>
            <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{fmt(stats.totalProfit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><PiggyBank className="w-5 h-5 text-amber-600" /><span className="text-xs text-amber-600 font-medium">Çekilen (Birikimde)</span></div>
            <p className="text-2xl font-bold text-amber-700">{fmt(stats.totalWithdrawn)}</p>
            <p className="text-[10px] text-amber-500">Bende kalan</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawn Money Breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PiggyBank className="w-5 h-5 text-amber-500" /> Çekilen Para Detayı</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1"><PiggyBank className="w-4 h-4 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Birikimde</span></div>
              <p className="text-xl font-bold text-emerald-700">{fmt(stats.totalWithdrawn)}</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">Bende kalan para</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1"><Receipt className="w-4 h-4 text-red-500" /><span className="text-xs text-red-500 font-medium">Ek Harcama</span></div>
              <p className="text-xl font-bold text-red-600">{fmt(stats.totalExtraSpending)}</p>
              <p className="text-[10px] text-red-400 mt-0.5">Tamamen giden</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1"><TrendingDown className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-600 font-medium">Toplam Çekilen</span></div>
              <p className="text-xl font-bold text-amber-700">{fmt(stats.totalAllWithdrawn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-600" /></div>
            <div><p className="text-2xl font-bold">{stats.inStockCount}</p><p className="text-xs text-slate-500">Stokta</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Megaphone className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{stats.listedCount}</p><p className="text-xs text-slate-500">İlanda</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold">{stats.soldCount}</p><p className="text-xs text-slate-500">Satıldı</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center"><Wallet className="w-5 h-5 text-violet-600" /></div>
            <div><p className="text-2xl font-bold">{fmt(stats.inStockValue)}</p><p className="text-xs text-slate-500">Stok Değeri</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      {stats.monthlyBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Aylık Alış-Satış</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} ₺`} />
                <Bar dataKey="purchases" name="Alış" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="sales" name="Satış" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ödeme Yöntemi Muhasebesi</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.paymentMethodStats.map(pm => (
              <div key={pm.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{pm.name}</span>
                  <Badge variant={pm.balance >= 0 ? 'secondary' : 'destructive'} className="text-xs">
                    Bakiye: {pm.balance >= 0 ? '+' : ''}{pm.balance.toFixed(2)} ₺
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center"><span className="text-slate-500">Gelen</span><p className="font-semibold text-emerald-600">{pm.totalIn.toFixed(2)} ₺</p></div>
                  <div className="text-center"><span className="text-slate-500">Çıkan</span><p className="font-semibold text-red-500">{pm.totalOut.toFixed(2)} ₺</p></div>
                  <div className="text-center"><span className="text-emerald-600">Birikimde</span><p className="font-semibold text-emerald-700">{pm.totalSavings.toFixed(2)} ₺</p></div>
                  <div className="text-center"><span className="text-red-500">Ek Harcama</span><p className="font-semibold text-red-600">{pm.totalExtraSpending.toFixed(2)} ₺</p></div>
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-emerald-800">TOPLAM</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                  {(() => {
                    const totalBalance = stats.paymentMethodStats.reduce((s, pm) => s + pm.balance, 0);
                    return `Bakiye: ${totalBalance >= 0 ? '+' : ''}${totalBalance.toFixed(2)} ₺`;
                  })()}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center"><span className="text-emerald-600">Gelen</span><p className="font-bold text-emerald-700">{stats.paymentMethodStats.reduce((s,pm) => s + pm.totalIn, 0).toFixed(2)} ₺</p></div>
                <div className="text-center"><span className="text-emerald-600">Çıkan</span><p className="font-bold text-emerald-700">{stats.paymentMethodStats.reduce((s,pm) => s + pm.totalOut, 0).toFixed(2)} ₺</p></div>
                <div className="text-center"><span className="text-emerald-600">Birikimde</span><p className="font-bold text-emerald-700">{stats.paymentMethodStats.reduce((s,pm) => s + pm.totalSavings, 0).toFixed(2)} ₺</p></div>
                <div className="text-center"><span className="text-emerald-600">Ek Harcama</span><p className="font-bold text-emerald-700">{stats.paymentMethodStats.reduce((s,pm) => s + pm.totalExtraSpending, 0).toFixed(2)} ₺</p></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Channel Chart */}
        {channelData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Satış Kanalı Geliri</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {channelData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} ₺`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Colors */}
        {colorData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">En Çok Satan Renkler</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={colorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" name="Adet" fill="#8b5cf6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Categories */}
      {stats.topCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">En Çok Satan Kategoriler</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{cat.count} adet</span>
                    <span className="text-xs text-slate-500 ml-2">{cat.revenue.toFixed(2)} ₺</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average Stats */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ortalama Veriler</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Ortalama Kar / Ürün</p>
              <p className={`text-xl font-bold ${stats.avgProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(stats.avgProfit)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Ciro</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(stats.totalRevenue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
