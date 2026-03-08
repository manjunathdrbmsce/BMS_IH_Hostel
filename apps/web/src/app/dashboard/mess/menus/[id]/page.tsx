'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { MEAL_TYPES, DAYS_OF_WEEK, MENU_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, Archive, UtensilsCrossed } from 'lucide-react';

const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  ARCHIVED: 'info',
};

export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/mess/menus/${id}`);
      setMenu(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleActivate = async () => {
    try {
      await api.post<any>(`/mess/menus/${id}/activate`);
      fetchMenu();
      addToast({ type: 'success', title: 'Menu activated' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to activate' });
    }
  };

  const handleArchive = async () => {
    try {
      await api.post<any>(`/mess/menus/${id}/archive`);
      fetchMenu();
      addToast({ type: 'success', title: 'Menu archived' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to archive' });
    }
  };

  const mealIcon = (meal: string) => {
    switch (meal) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '☀️';
      case 'SNACKS': return '🍪';
      case 'DINNER': return '🌙';
      default: return '🍽️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Topbar title="Menu Details" subtitle="Loading..." />
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!menu) return null;

  // Group items by day
  const itemsByDay = new Map<string, any[]>();
  for (const day of DAYS_OF_WEEK) {
    itemsByDay.set(day.value, menu.items?.filter((i: any) => i.day === day.value) || []);
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen">
      <Topbar title={menu.name} subtitle={`${menu.hostel?.name} · ${menu.messType}`}>
        <div className="flex gap-2">
          {menu.status !== 'ACTIVE' && menu.status !== 'ARCHIVED' && (
            <Button onClick={handleActivate} variant="primary" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
            </Button>
          )}
          {menu.status !== 'ARCHIVED' && (
            <Button onClick={handleArchive} variant="outline" size="sm">
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          )}
        </div>
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Meta */}
        <Card>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge variant={statusBadge[menu.status] || 'default'}>
              {MENU_STATUSES.find(s => s.value === menu.status)?.label}
            </Badge>
            <span className="text-sm text-gray-500">Effective: {fmtDate(menu.effectiveFrom)} — {menu.effectiveTo ? fmtDate(menu.effectiveTo) : 'Ongoing'}</span>
            <span className="text-sm text-gray-500">Created by: {menu.createdBy?.firstName} {menu.createdBy?.lastName}</span>
          </div>
          {menu.notes && <p className="text-sm text-gray-600 mt-2">{menu.notes}</p>}
        </Card>

        {/* Week Grid */}
        {DAYS_OF_WEEK.map((day) => {
          const dayItems = itemsByDay.get(day.value) || [];
          if (dayItems.length === 0) return null;

          return (
            <Card key={day.value}>
              <CardHeader>
                <CardTitle>{day.label}</CardTitle>
              </CardHeader>
              <div className="p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {MEAL_TYPES.map((mt) => {
                    const item = dayItems.find((i: any) => i.mealType === mt.value);
                    if (!item) return (
                      <div key={mt.value} className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                        {mealIcon(mt.value)} {mt.label} — Not set
                      </div>
                    );
                    return (
                      <div key={mt.value} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{mealIcon(mt.value)}</span>
                          <span className="font-semibold text-sm text-gray-700">{mt.label}</span>
                        </div>
                        <p className="text-sm text-gray-900">{item.items}</p>
                        {item.specialNote && (
                          <p className="text-xs text-indigo-600 mt-1 italic">{item.specialNote}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
