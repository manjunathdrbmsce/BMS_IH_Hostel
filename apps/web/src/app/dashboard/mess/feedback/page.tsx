'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MEAL_TYPES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';

export default function FeedbackPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, m] = month.split('-');
      const params = new URLSearchParams({ year, month: m });
      const res = await api.get<any>(`/mess/reports/feedback?${params}`);
      setReport(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
    ));
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Feedback" subtitle="Meal feedback analytics and reviews" />

      <div className="p-6 space-y-6 animate-in">
        <Card>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-500">Month:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Card key={i}><Skeleton className="h-40" /></Card>)}
          </div>
        ) : !report ? (
          <EmptyState title="No feedback data" description="No feedback found for the selected month" />
        ) : (
          <>
            {/* Rating by Meal Type */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {report.byMealType?.map((m: any) => (
                <Card key={m.mealType}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 mb-2">{MEAL_TYPES.find(t => t.value === m.mealType)?.label || m.mealType}</p>
                    <div className="flex justify-center mb-1">{renderStars(Math.round(m.avgRating))}</div>
                    <p className="text-2xl font-bold text-gray-900">{Number(m.avgRating).toFixed(1)}</p>
                    <p className="text-xs text-gray-400">{m.count} reviews</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Rating Distribution</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {report.ratingDistribution?.sort((a: any, b: any) => b.rating - a.rating).map((d: any) => {
                  const maxCount = Math.max(...(report.ratingDistribution?.map((r: any) => r.count) || [1]));
                  const pct = Math.round((d.count / maxCount) * 100);
                  return (
                    <div key={d.rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-20 shrink-0">
                        {renderStars(d.rating)}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-xs font-medium text-white">{d.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Recent Comments</CardTitle>
              </CardHeader>
              {report.recentComments?.length === 0 ? (
                <p className="text-sm text-gray-400">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {report.recentComments?.map((c: any, i: number) => (
                    <div key={i} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{c.student?.firstName} {c.student?.lastName}</span>
                          <Badge variant="info">{c.mealType}</Badge>
                          <div className="flex">{renderStars(c.rating)}</div>
                        </div>
                        <p className="text-sm text-gray-600">{c.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
