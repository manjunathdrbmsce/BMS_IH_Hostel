'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MEAL_TYPES } from '@/lib/constants';
import { StatCard } from '@/components/ui/stat-card';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  UtensilsCrossed, Users, Star, CalendarOff, Clock,
} from 'lucide-react';

export default function MessOverviewPage() {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, liveRes] = await Promise.all([
        api.get<any>('/mess/stats'),
        hasRole('SUPER_ADMIN', 'MESS_MANAGER', 'MESS_STAFF')
          ? api.get<any>('/mess/scans/live')
          : Promise.resolve(null),
      ]);
      setStats(statsRes.data);
      if (liveRes) setLive(liveRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [hasRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mealIcon = (meal: string) => {
    switch (meal) {
      case 'BREAKFAST': return '🌅';
      case 'LUNCH': return '☀️';
      case 'SNACKS': return '🍪';
      case 'DINNER': return '🌙';
      default: return '🍽️';
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Mess Management" subtitle="Overview of meal operations, scanning, and feedback" />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Meals Served" value={stats.totalMealsServed} icon={UtensilsCrossed} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
              <StatCard title="Guest Meals" value={stats.guestMeals} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Avg Rating" value={stats.feedback?.avgRating ?? '—'} icon={Star} iconColor="text-amber-600" iconBg="bg-amber-50" />
              <StatCard title="Pending Rebates" value={stats.pendingRebates} icon={CalendarOff} iconColor="text-red-600" iconBg="bg-red-50" />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Meal Counts */}
          {live && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Live Meal Counts — {live.date}
                </CardTitle>
              </CardHeader>
              <div className="p-6 pt-0">
                {live.currentMeal && (
                  <div className="mb-4">
                    <Badge variant="success">Current: {live.currentMeal}</Badge>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {MEAL_TYPES.map((mt) => {
                    const counts = live.counts?.[mt.value] || { students: 0, guests: 0 };
                    const isActive = live.currentMeal === mt.value;
                    return (
                      <div
                        key={mt.value}
                        className={`rounded-xl p-4 border ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{mealIcon(mt.value)}</span>
                          <span className="font-semibold text-sm text-gray-700">{mt.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{counts.students}</div>
                        <div className="text-xs text-gray-500">
                          students · {counts.guests} guest{counts.guests !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Meals by Type (period) */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Meals by Type ({stats.period?.from} — {stats.period?.to})</CardTitle>
              </CardHeader>
              <div className="p-6 pt-0">
                <div className="space-y-3">
                  {stats.byMealType?.map((mt: any) => {
                    const pct = stats.totalMealsServed > 0
                      ? Math.round((mt.count / stats.totalMealsServed) * 100)
                      : 0;
                    return (
                      <div key={mt.mealType}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {mealIcon(mt.mealType)} {MEAL_TYPES.find(m => m.value === mt.mealType)?.label || mt.mealType}
                          </span>
                          <span className="text-gray-500">{mt.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {stats.feedback && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span>{stats.feedback.totalFeedback} feedback submissions</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
