'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
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
      const res = await api.get<any>(`/mess/reports/consumption?${params}`);
      setReport(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    if (!report?.students?.length) return;
    const header = 'Student,USN,Hostel,Breakfast,Lunch,Snacks,Dinner,Total';
    const rows = report.students.map((s: any) =>
      `"${s.studentName}","${s.usn}","${s.hostelName}",${s.breakfast},${s.lunch},${s.snacks},${s.dinner},${s.total}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mess-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Reports" subtitle="Mess consumption reports and analytics" />

      <div className="p-6 space-y-6 animate-in">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-500">Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <Button variant="outline" onClick={exportCSV} disabled={!report?.students?.length}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card><Skeleton className="h-96" /></Card>
        ) : !report?.students?.length ? (
          <EmptyState title="No data" description="No consumption data found for the selected month" />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Meals', value: report.students.reduce((s: number, r: any) => s + r.total, 0) },
                { label: 'Breakfast', value: report.students.reduce((s: number, r: any) => s + r.breakfast, 0) },
                { label: 'Lunch', value: report.students.reduce((s: number, r: any) => s + r.lunch, 0) },
                { label: 'Snacks', value: report.students.reduce((s: number, r: any) => s + r.snacks, 0) },
                { label: 'Dinner', value: report.students.reduce((s: number, r: any) => s + r.dinner, 0) },
              ].map((stat) => (
                <Card key={stat.label}>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                </Card>
              ))}
            </div>

            {/* Consumption Table */}
            <Card padding={false}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Per-Student Consumption</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-500">#</th>
                      <th className="text-left p-3 font-medium text-gray-500">Student</th>
                      <th className="text-left p-3 font-medium text-gray-500">USN</th>
                      <th className="text-left p-3 font-medium text-gray-500">Hostel</th>
                      <th className="text-center p-3 font-medium text-gray-500">Breakfast</th>
                      <th className="text-center p-3 font-medium text-gray-500">Lunch</th>
                      <th className="text-center p-3 font-medium text-gray-500">Snacks</th>
                      <th className="text-center p-3 font-medium text-gray-500">Dinner</th>
                      <th className="text-center p-3 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.students.map((s: any, i: number) => (
                      <tr key={s.studentId} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{i + 1}</td>
                        <td className="p-3 font-medium text-gray-900">{s.studentName}</td>
                        <td className="p-3 text-gray-500">{s.usn}</td>
                        <td className="p-3 text-gray-500">{s.hostelName}</td>
                        <td className="p-3 text-center text-gray-700">{s.breakfast}</td>
                        <td className="p-3 text-center text-gray-700">{s.lunch}</td>
                        <td className="p-3 text-center text-gray-700">{s.snacks}</td>
                        <td className="p-3 text-center text-gray-700">{s.dinner}</td>
                        <td className="p-3 text-center font-semibold text-gray-900">{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
