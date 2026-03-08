'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { MEAL_TYPES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, XCircle, Scan, Users, UserPlus, Loader2, UtensilsCrossed } from 'lucide-react';

const MEAL_WINDOWS: Record<string, { start: number; end: number }> = {
  BREAKFAST: { start: 7, end: 10 },
  LUNCH: { start: 12, end: 14 },
  SNACKS: { start: 16, end: 18 },
  DINNER: { start: 19, end: 22 },
};

function detectCurrentMeal(): string {
  const h = new Date().getHours();
  for (const [meal, { start, end }] of Object.entries(MEAL_WINDOWS)) {
    if (h >= start && h < end) return meal;
  }
  return 'BREAKFAST';
}

export default function ScanStationPage() {
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mealType, setMealType] = useState(detectCurrentMeal);
  const [isGuest, setIsGuest] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ success: boolean; message: string; name?: string } | null>(null);
  const [liveData, setLiveData] = useState<any>(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get<any>('/mess/scans/live');
      setLiveData(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchLive(); const i = setInterval(fetchLive, 15000); return () => clearInterval(i); }, [fetchLive]);
  useEffect(() => { inputRef.current?.focus(); }, [lastScan]);

  const handleStudentScan = async () => {
    if (!studentId.trim()) return;
    setScanning(true);
    try {
      const res = await api.post<any>('/mess/scan', { studentId: studentId.trim(), mealType });
      setLastScan({ success: true, message: 'Scan successful', name: `${res.data?.student?.firstName} ${res.data?.student?.lastName}` });
      addToast({ type: 'success', title: `Scan Recorded: ${res.data?.student?.firstName} — ${mealType}` });
      fetchLive();
    } catch (e: any) {
      setLastScan({ success: false, message: e?.response?.data?.message || 'Scan failed' });
      addToast({ type: 'error', title: e?.response?.data?.message || 'Scan failed' });
    }
    setStudentId('');
    setScanning(false);
    setTimeout(() => setLastScan(null), 4000);
  };

  const handleGuestScan = async () => {
    if (!guestName.trim()) return;
    setScanning(true);
    try {
      await api.post('/mess/scan/guest', { guestName: guestName.trim(), guestCount, mealType });
      setLastScan({ success: true, message: 'Guest registered', name: guestName });
      addToast({ type: 'success', title: `Guest Registered: ${guestName} (${guestCount})` });
      setGuestName('');
      setGuestCount(1);
      fetchLive();
    } catch (e: any) {
      setLastScan({ success: false, message: e?.response?.data?.message || 'Failed' });
      addToast({ type: 'error', title: e?.response?.data?.message || 'Failed' });
    }
    setScanning(false);
    setTimeout(() => setLastScan(null), 4000);
  };

  const currentMealLabel = MEAL_TYPES.find(m => m.value === mealType)?.label || mealType;

  return (
    <div className="min-h-screen">
      <Topbar title="Scan Station" subtitle="Scan student ID cards for meals" />

      <div className="p-6 space-y-6 animate-in">
        {/* Meal Selector */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Current Meal</h3>
              <p className="text-2xl font-bold text-gray-900">{currentMealLabel}</p>
            </div>
            <div className="flex gap-2">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mealType === m.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Scan Result Flash */}
        {lastScan && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all animate-in ${
            lastScan.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {lastScan.success ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
            <div>
              <p className={`text-lg font-semibold ${lastScan.success ? 'text-green-800' : 'text-red-800'}`}>{lastScan.message}</p>
              {lastScan.name && <p className="text-sm text-gray-600">{lastScan.name}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Scan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scan className="h-5 w-5" /> Student Scan</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Scan or enter Student ID..."
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudentScan()}
                  className="text-lg h-14"
                  autoFocus
                />
                <Button onClick={handleStudentScan} disabled={scanning || !studentId.trim()} className="h-14 px-8">
                  {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Scan'}
                </Button>
              </div>
              <p className="text-xs text-gray-400">Scan barcode or type the student ID and press Enter</p>
            </div>
          </Card>

          {/* Guest Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Guest Entry</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input placeholder="Guest Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Count:</label>
                <Input type="number" min={1} max={50} value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)} className="w-20" />
                <Button onClick={handleGuestScan} disabled={scanning || !guestName.trim()} className="ml-auto">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Guest'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Counts */}
        {liveData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Live Counts</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MEAL_TYPES.map(m => {
                const count = liveData.counts?.find((c: any) => c.mealType === m.value);
                const isCurrent = liveData.currentMeal === m.value;
                return (
                  <div key={m.value} className={`p-4 rounded-xl text-center ${isCurrent ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-50'}`}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{m.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{count?.students || 0}</p>
                    <p className="text-xs text-gray-400">{count?.guests || 0} guests</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
