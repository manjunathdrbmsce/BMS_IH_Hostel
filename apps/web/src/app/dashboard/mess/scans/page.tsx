'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MEAL_TYPES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';

export default function ScanLogPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mealFilter, setMealFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (mealFilter) params.set('mealType', mealFilter);
      if (dateFilter) {
        params.set('fromDate', dateFilter);
        params.set('toDate', dateFilter);
      }
      const res = await api.get<any>(`/mess/scans?${params}`);
      setScans(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, mealFilter, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

  return (
    <div className="min-h-screen">
      <Topbar title="Scan Log" subtitle="All meal scan records" />

      <div className="p-6 space-y-6 animate-in">
        <Card>
          <div className="flex flex-wrap gap-3">
            <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} className="w-44" />
            <select value={mealFilter} onChange={(e) => { setMealFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Meals</option>
              {MEAL_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </Card>

        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div></Card>
        ) : scans.length === 0 ? (
          <EmptyState title="No scans" description="No meal scans found for the selected filters" />
        ) : (
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-500">Student</th>
                  <th className="text-left p-3 font-medium text-gray-500">Hostel</th>
                  <th className="text-left p-3 font-medium text-gray-500">Date</th>
                  <th className="text-left p-3 font-medium text-gray-500">Meal</th>
                  <th className="text-left p-3 font-medium text-gray-500">Time</th>
                  <th className="text-left p-3 font-medium text-gray-500">Type</th>
                  <th className="text-left p-3 font-medium text-gray-500">Scanned By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scans.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{s.isGuest ? s.guestName : `${s.student?.firstName} ${s.student?.lastName}`}</div>
                      {!s.isGuest && s.student?.usn && <div className="text-xs text-gray-500">{s.student.usn}</div>}
                    </td>
                    <td className="p-3 text-gray-600">{s.hostel?.name}</td>
                    <td className="p-3 text-gray-600">{fmtDate(s.date)}</td>
                    <td className="p-3"><Badge variant="info">{s.mealType}</Badge></td>
                    <td className="p-3 text-gray-600">{fmtTime(s.scannedAt)}</td>
                    <td className="p-3">
                      {s.isGuest ? (
                        <Badge variant="default">Guest ({s.guestCount})</Badge>
                      ) : (
                        <Badge variant="success">Student</Badge>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{s.scannedBy?.firstName} {s.scannedBy?.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
