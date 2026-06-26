'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InventoryTab from '@/components/app/InventoryTab';
import StatisticsTab from '@/components/app/StatisticsTab';
import CategoriesTab from '@/components/app/CategoriesTab';
import SettingsTab from '@/components/app/SettingsTab';
import ExpensesTab from '@/components/app/ExpensesTab';
import SalesHistoryTab from '@/components/app/SalesHistoryTab';
import { Package, BarChart3, FolderOpen, Settings, Banknote, History, ArrowUp, ArrowDown } from 'lucide-react';

export default function StockTrackerApp() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [stats, setStats] = useState<{
    inStockCount: number;
    listedCount: number;
    soldCount: number;
  } | null>(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    // Seed default data on first load
    fetch('/api/seed', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/statistics')
      .then(r => r.json())
      .then(data => {
        setStats({
          inStockCount: data.inStockCount || 0,
          listedCount: data.listedCount || 0,
          soldCount: data.soldCount || 0,
        });
      })
      .catch(() => {});
  }, [refreshKey]);

  // Scroll visibility detection
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButtons(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header id="page-top" className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">Stok Takip</h1>
              <p className="text-xs text-slate-500">İkinci El Alım-Satım Muhasebe</p>
            </div>
          </div>
          {stats && (
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1">
                Stokta: {stats.inStockCount}
              </Badge>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2.5 py-1">
                İlanda: {stats.listedCount}
              </Badge>
              <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-200 text-xs px-2.5 py-1">
                Satıldı: {stats.soldCount}
              </Badge>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 pb-24 sm:pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tabs */}
          <div className="hidden sm:block mb-6">
            <TabsList className="bg-white shadow-sm border border-slate-200 p-1 h-auto flex-wrap gap-1">
              <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <Package className="w-4 h-4" />
                Stok
              </TabsTrigger>
              <TabsTrigger value="statistics" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <BarChart3 className="w-4 h-4" />
                İstatistik
              </TabsTrigger>
              <TabsTrigger value="sales" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <History className="w-4 h-4" />
                Satışlar
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <FolderOpen className="w-4 h-4" />
                Kategoriler
              </TabsTrigger>
              <TabsTrigger value="expenses" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <Banknote className="w-4 h-4" />
                Giderler
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-2 px-4">
                <Settings className="w-4 h-4" />
                Ayarlar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inventory">
            <InventoryTab refreshKey={refreshKey} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="statistics">
            <StatisticsTab refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="sales">
            <SalesHistoryTab refreshKey={refreshKey} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab refreshKey={refreshKey} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab refreshKey={refreshKey} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab refreshKey={refreshKey} onRefresh={refresh} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Scroll Buttons - Desktop: fixed right side, Mobile: above bottom nav */}
      {showScrollButtons && (
        <div className="fixed z-40 sm:right-6 sm:bottom-6 right-3 bottom-16 sm:bottom-6 flex flex-col gap-2">
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all"
            onClick={scrollToTop}
            title="Yukarı git"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all"
            onClick={scrollToBottom}
            title="Aşağı git"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-1 px-2">
          {[
            { value: 'inventory', icon: Package, label: 'Stok' },
            { value: 'statistics', icon: BarChart3, label: 'İstatistik' },
            { value: 'sales', icon: History, label: 'Satışlar' },
            { value: 'expenses', icon: Banknote, label: 'Giderler' },
            { value: 'settings', icon: Settings, label: 'Ayarlar' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
                activeTab === tab.value
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
