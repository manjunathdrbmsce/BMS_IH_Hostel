'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MEAL_TYPES, MESS_TYPES, DAYS_OF_WEEK, MENU_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { Plus, UtensilsCrossed } from 'lucide-react';

const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  ARCHIVED: 'info',
};

export default function MenusPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [messTypeFilter, setMessTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    hostelId: '', name: '', messType: 'VEG', effectiveFrom: '', effectiveTo: '', notes: '',
    items: [] as { day: string; mealType: string; items: string; specialNote?: string }[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (messTypeFilter) params.set('messType', messTypeFilter);
      const res = await api.get<any>(`/mess/menus?${params}`);
      setMenus(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, statusFilter, messTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addMenuItem = () => {
    setForm({
      ...form,
      items: [...form.items, { day: 'MONDAY', mealType: 'BREAKFAST', items: '', specialNote: '' }],
    });
  };

  const updateMenuItem = (idx: number, field: string, value: string) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    setForm({ ...form, items });
  };

  const removeMenuItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleCreate = async () => {
    try {
      await api.post<any>('/mess/menus', form);
      setShowCreate(false);
      setForm({ hostelId: '', name: '', messType: 'VEG', effectiveFrom: '', effectiveTo: '', notes: '', items: [] });
      fetchData();
      addToast({ type: 'success', title: 'Menu created successfully' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to create menu' });
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen">
      <Topbar title="Mess Menus" subtitle="Create and manage weekly mess menus">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Menu</Button>
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Statuses</option>
              {MENU_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={messTypeFilter} onChange={(e) => { setMessTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Types</option>
              {MESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </Card>

        {/* Menu List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : menus.length === 0 ? (
          <EmptyState title="No menus" description="Create your first weekly mess menu" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {menus.map((m: any) => (
                <div key={m.id} onClick={() => router.push(`/dashboard/mess/menus/${m.id}`)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.hostel?.name} · {m.messType} · {m._count?.items || 0} items · {fmtDate(m.effectiveFrom)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusBadge[m.status] || 'default'}>
                      {MENU_STATUSES.find(s => s.value === m.status)?.label || m.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Weekly Menu" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input placeholder="Hostel ID" value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} />
          <Input placeholder="Menu Name (e.g. Spring 2026 Week Menu)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.messType} onChange={(e) => setForm({ ...form, messType: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            {MESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Effective From</label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Effective To (optional)</label><Input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} /></div>
          </div>
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" rows={2} />

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Menu Items</h4>
              <Button onClick={addMenuItem} size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <select value={item.day} onChange={(e) => updateMenuItem(idx, 'day', e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm">
                      {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <select value={item.mealType} onChange={(e) => updateMenuItem(idx, 'mealType', e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm">
                      {MEAL_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button onClick={() => removeMenuItem(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                  <Input placeholder="Dishes (e.g. Idli, Sambar, Chutney, Coffee)" value={item.items} onChange={(e) => updateMenuItem(idx, 'items', e.target.value)} />
                  <Input placeholder="Special note (optional)" value={item.specialNote || ''} onChange={(e) => updateMenuItem(idx, 'specialNote', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} className="w-full">Create Menu</Button>
        </div>
      </Modal>
    </div>
  );
}
