'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ATTENDANCE_STATUSES, PRESENCE_STATUSES } from '@/lib/constants';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================================
// Types
// ============================================================================

interface PresenceData {
    inHostel: number;
    outCampus: number;
    onLeave: number;
    total: number;
}

interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    status: string;
    firstIn: string | null;
    lastOut: string | null;
    source: string;
    student: {
        id: string;
        firstName: string;
        lastName: string;
        usn: string | null;
        bedAssignments?: Array<{
            bed: { room: { roomNo: string; hostel: { name: string } } };
        }>;
    };
}

interface SessionData {
    id: string;
    hostelId: string;
    title: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    presentCount: number;
    totalStudents: number;
    hostel: { name: string };
}

interface HostelOption {
    id: string;
    name: string;
    code: string;
}

interface DeviceInfo {
    id: string;
    fingerprint: string;
    deviceName: string | null;
    platform: string | null;
    isActive: boolean;
    registeredAt: string;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AttendancePage() {
    const { user } = useAuth();
    const roles = (user?.roles || []).map((r: any) => r.name || r);
    const isStudent = roles.includes('STUDENT');
    const isAdmin = roles.some((r: string) =>
        ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'].includes(r),
    );

    const tabs = isStudent
        ? [
            { key: 'my', label: 'My Attendance' },
            { key: 'scan', label: 'Scan QR' },
            { key: 'device', label: 'My Device' },
        ]
        : [
            { key: 'presence', label: 'Presence Board' },
            { key: 'daily', label: 'Daily Records' },
            { key: 'rollcall', label: 'Roll-Call' },
        ];

    const [activeTab, setActiveTab] = useState(tabs[0].key);

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Attendance Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isStudent ? 'Track your attendance, scan QR codes, and manage devices' : 'Anti-proxy attendance tracking with real-time monitoring'}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit backdrop-blur-sm border border-slate-200/60">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.key
                            ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-100'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {activeTab === 'presence' && <PresenceBoardTab />}
                {activeTab === 'daily' && <DailyRecordsTab />}
                {activeTab === 'rollcall' && <RollCallTab />}
                {activeTab === 'my' && <MyAttendanceTab userId={user?.id} />}
                {activeTab === 'scan' && <ScanQRTab userId={user?.id} />}
                {activeTab === 'device' && <DeviceManagementTab />}
            </div>
        </div>
    );
}

// ============================================================================
// Presence Board Tab (Gap 7: Student Drill-Down Added)
// ============================================================================

function PresenceBoardTab() {
    const [data, setData] = useState<PresenceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [drillDown, setDrillDown] = useState<string | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        api.get<any>('/attendance/presence')
            .then((res) => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const showStudents = async (status: string) => {
        if (drillDown === status) {
            setDrillDown(null);
            return;
        }
        setDrillDown(status);
        setLoadingStudents(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const params = status === 'total'
                ? `date=${today}`
                : `date=${today}&status=${status === 'inHostel' ? 'PRESENT' : status === 'outCampus' ? 'ABSENT' : 'ON_LEAVE'}`;
            const res = await api.get<any>(`/attendance/daily?${params}&limit=100`);
            setStudents(res.data || []);
        } catch { setStudents([]); }
        setLoadingStudents(false);
    };

    if (loading) return <LoadingSkeleton />;

    const cards = [
        { key: 'inHostel', label: 'In Hostel', value: data?.inHostel || 0, color: 'from-emerald-500 to-green-600', icon: '🏠', bg: 'bg-emerald-50', text: 'text-emerald-700' },
        { key: 'outCampus', label: 'Out Campus', value: data?.outCampus || 0, color: 'from-orange-500 to-amber-600', icon: '🚶', bg: 'bg-orange-50', text: 'text-orange-700' },
        { key: 'onLeave', label: 'On Leave', value: data?.onLeave || 0, color: 'from-blue-500 to-indigo-600', icon: '✈️', bg: 'bg-blue-50', text: 'text-blue-700' },
        { key: 'total', label: 'Total Students', value: data?.total || 0, color: 'from-violet-500 to-purple-600', icon: '👥', bg: 'bg-violet-50', text: 'text-violet-700' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card) => (
                    <button
                        key={card.key}
                        onClick={() => showStudents(card.key)}
                        className={`relative overflow-hidden rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all duration-300 group text-left w-full ${drillDown === card.key ? 'ring-2 ring-indigo-400 border-indigo-300' : 'border-slate-200/60'
                            }`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
                        <div className="p-6 relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.bg} text-lg`}>
                                    {card.icon}
                                </span>
                                {data && data.total > 0 && card.key !== 'total' && (
                                    <span className={`text-xs font-semibold ${card.text} px-2.5 py-1 rounded-full ${card.bg}`}>
                                        {Math.round((card.value / data.total) * 100)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                            <p className="text-sm text-slate-500 mt-1">{card.label}</p>
                            <p className="text-xs text-indigo-400 mt-2">Click to drill down →</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Gap 7: Student drill-down panel */}
            {drillDown && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">
                            {cards.find(c => c.key === drillDown)?.label} — Student List
                        </h3>
                        <button onClick={() => setDrillDown(null)} className="text-xs text-slate-400 hover:text-slate-600">✕ Close</button>
                    </div>
                    {loadingStudents ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse">Loading students...</div>
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No students found</div>
                    ) : (
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                            {students.map((r: any) => (
                                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/30">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{r.student.firstName} {r.student.lastName}</p>
                                        <p className="text-xs text-slate-400">{r.student.usn || '—'} • {r.student.bedAssignments?.[0]?.bed?.room?.roomNo || '—'}</p>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {r.firstIn ? new Date(r.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Donut Chart */}
            {data && data.total > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Presence Distribution</h3>
                    <div className="flex items-center justify-center gap-12">
                        <div className="relative w-48 h-48">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                {(() => {
                                    const total = data.total || 1;
                                    const segments = [
                                        { pct: (data.inHostel / total) * 100, color: '#22c55e' },
                                        { pct: (data.outCampus / total) * 100, color: '#f97316' },
                                        { pct: (data.onLeave / total) * 100, color: '#3b82f6' },
                                    ];
                                    let offset = 0;
                                    return segments.map((seg, i) => {
                                        const el = (
                                            <circle key={i} cx="18" cy="18" r="15.9155" fill="none" stroke={seg.color}
                                                strokeWidth="3.5" strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                                                strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />
                                        );
                                        offset += seg.pct;
                                        return el;
                                    });
                                })()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-slate-800">{data.total}</span>
                                <span className="text-xs text-slate-400">Total</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {PRESENCE_STATUSES.map((s) => (
                                <div key={s.value} className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="text-sm text-slate-600 w-24">{s.label}</span>
                                    <span className="text-sm font-semibold text-slate-800">
                                        {s.value === 'IN_HOSTEL' ? data.inHostel : s.value === 'OUT_CAMPUS' ? data.outCampus : data.onLeave}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Daily Records Tab
// ============================================================================

function DailyRecordsTab() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });

    const fetchData = useCallback(async (pageNum = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ date, page: String(pageNum), limit: '25' });
            if (search) params.set('search', search);
            const res = await api.get<any>(`/attendance/daily?${params}`);
            setRecords(res.data || []);
            setMeta(res.meta || { page: pageNum, total: 0, totalPages: 0 });
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [date, search]);

    useEffect(() => { fetchData(1); }, [date, search]);

    const statusBadge = (status: string) => {
        const s = ATTENDANCE_STATUSES.find((a) => a.value === status);
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${s?.color || '#9ca3af'}15`, color: s?.color || '#6b7280', border: `1px solid ${s?.color || '#9ca3af'}30` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s?.color }} />
                {s?.label || status}
            </span>
        );
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all" />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <input type="text" placeholder="Search by name or USN..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all" />
                </div>
                <span className="text-xs text-slate-400 ml-auto">{meta.total} records</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {loading ? <LoadingSkeleton /> : records.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <span className="text-5xl block mb-3">📋</span>
                        <p className="font-medium">No records for this date</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                {['Student', 'USN', 'Room', 'Status', 'First In', 'Last Out', 'Source'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map((r) => (
                                <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-slate-800">{r.student.firstName} {r.student.lastName}</td>
                                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{r.student.usn || '—'}</td>
                                    <td className="px-5 py-3.5 text-slate-500">{r.student.bedAssignments?.[0]?.bed?.room?.roomNo || '—'}</td>
                                    <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                                    <td className="px-5 py-3.5 text-slate-500">{r.firstIn ? new Date(r.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                    <td className="px-5 py-3.5 text-slate-500">{r.lastOut ? new Date(r.lastOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                    <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">{formatSource(r.source)}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-400">Page {meta.page} of {meta.totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={meta.page <= 1} onClick={() => fetchData(meta.page - 1)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">Previous</button>
                            <button disabled={meta.page >= meta.totalPages} onClick={() => fetchData(meta.page + 1)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Roll-Call Tab (Gap 2: Actual QR Image, Gap 10: Hostel Dropdown)
// ============================================================================

function RollCallTab() {
    const [session, setSession] = useState<SessionData | null>(null);
    const [qrToken, setQrToken] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [duration, setDuration] = useState(5);
    const [liveData, setLiveData] = useState<any>(null);
    const [hostels, setHostels] = useState<HostelOption[]>([]);
    const [selectedHostel, setSelectedHostel] = useState('');

    // Gap 10: Fetch hostels for dropdown
    useEffect(() => {
        api.get<any>('/hostels?limit=100')
            .then((res) => {
                const list = res.data || [];
                setHostels(list);
                if (list.length > 0) setSelectedHostel(list[0].id);
            })
            .catch(console.error);
    }, []);

    // QR rotation poll
    useEffect(() => {
        if (!session || session.status !== 'ACTIVE') return;
        const fetchQR = async () => {
            try {
                const res = await api.get<any>(`/attendance/session/${session.id}/qr`);
                setQrToken(res.data.token);
                setCountdown(res.data.secondsRemaining);
            } catch { /* session may have expired */ }
        };
        fetchQR();
        const interval = setInterval(fetchQR, 5000);
        return () => clearInterval(interval);
    }, [session]);

    // Live data poll
    useEffect(() => {
        if (!session) return;
        const fetchLive = async () => {
            try {
                const res = await api.get<any>(`/attendance/session/${session.id}/live`);
                setLiveData(res.data);
                if (res.data.isExpired) setSession((s) => s ? { ...s, status: 'EXPIRED' } : null);
            } catch { }
        };
        fetchLive();
        const interval = setInterval(fetchLive, 3000);
        return () => clearInterval(interval);
    }, [session]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const startSession = async () => {
        if (!selectedHostel) { setError('Please select a hostel'); return; }
        setCreating(true);
        setError('');
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error('GPS not available'));
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
            });
            const res = await api.post<any>('/attendance/session', {
                hostelId: selectedHostel,
                gpsLat: pos.coords.latitude,
                gpsLng: pos.coords.longitude,
                durationMin: duration,
                title: `Roll-Call ${new Date().toLocaleDateString('en-IN')}`,
            });
            setSession(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to start session');
        }
        setCreating(false);
    };

    const cancelSession = async () => {
        if (!session) return;
        try {
            await api.post(`/attendance/session/${session.id}/cancel`);
            setSession((s) => s ? { ...s, status: 'CANCELLED' } : null);
        } catch (err: any) { setError(err?.message || 'Failed to cancel'); }
    };

    // No active session — show start form
    if (!session) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-4xl">📱</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Start Roll-Call Session</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Display a rotating QR code for students to scan. GPS + device verification ensures anti-proxy attendance.
                        </p>
                    </div>

                    {/* Gap 10: Hostel Dropdown */}
                    <div className="flex items-center justify-center gap-3">
                        <label className="text-sm text-slate-600">Hostel:</label>
                        <select value={selectedHostel} onChange={(e) => setSelectedHostel(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none min-w-[200px]">
                            {hostels.map((h) => (
                                <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <label className="text-sm text-slate-600">Duration:</label>
                        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                            {[3, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
                        </select>
                    </div>

                    <button onClick={startSession} disabled={creating}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60">
                        {creating ? 'Starting...' : '🚀 Start Roll-Call'}
                    </button>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
            </div>
        );
    }

    // Active session — show QR + live count
    const isActive = session.status === 'ACTIVE';
    const pct = session.totalStudents > 0 ? Math.round((liveData?.presentCount || session.presentCount) / session.totalStudents * 100) : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="font-semibold text-slate-800">{session.title} — {isActive ? 'Active' : session.status}</span>
                </div>
                {isActive && (
                    <button onClick={cancelSession} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        Cancel Session
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gap 2: Actual QR Code Image */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 text-center space-y-4">
                    {isActive && qrToken ? (
                        <>
                            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-indigo-100">
                                <QRCodeSVG
                                    value={JSON.stringify({ sessionId: session.id, token: qrToken })}
                                    size={200}
                                    level="M"
                                    bgColor="#ffffff"
                                    fgColor="#1e1b4b"
                                    includeMargin={false}
                                />
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-12 h-12 relative">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray={`${(countdown / 30) * 100} 100`} className="transition-all duration-1000" />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">{countdown}</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400">Token rotates every 30s</p>
                                    <p className="text-sm font-mono font-bold text-indigo-600">{qrToken}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Display this QR on projector for students to scan</p>
                        </>
                    ) : (
                        <div className="py-12">
                            <span className="text-6xl">⏰</span>
                            <p className="text-lg font-semibold text-slate-600 mt-4">Session {session.status.toLowerCase()}</p>
                        </div>
                    )}
                </div>

                {/* Live Count */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">Live Attendance</h3>
                    <div className="text-center space-y-2">
                        <p className="text-5xl font-bold text-indigo-600">
                            {liveData?.presentCount ?? session.presentCount}
                            <span className="text-2xl text-slate-400">/{session.totalStudents}</span>
                        </p>
                        <p className="text-sm text-slate-500">students present</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>{pct}% present</span>
                            <span>{session.totalStudents - (liveData?.presentCount || session.presentCount)} remaining</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    {liveData?.attendance?.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent</p>
                            {liveData.attendance.slice(0, 8).map((a: any) => (
                                <div key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                                    <span className="text-slate-700">{a.student.firstName} {a.student.lastName}</span>
                                    <span className="text-xs text-emerald-600 font-medium">✅ Present</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
    );
}

// ============================================================================
// Gap 1: Scan QR Tab (Student scans warden's QR to mark attendance)
// ============================================================================

function ScanQRTab({ userId }: { userId?: string }) {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [manualToken, setManualToken] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [activeSessions, setActiveSessions] = useState<Array<{ id: string; title: string; hostel: { name: string }; expiresAt: string }>>([]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const scannerRef = useRef<any>(null);

    // Fetch active sessions for manual dropdown (human-readable names)
    useEffect(() => {
        setLoadingSessions(true);
        api.get<any>('/attendance/sessions/active')
            .then((res) => {
                const sessions = res.data || [];
                setActiveSessions(sessions);
                if (sessions.length > 0) setSelectedSession(sessions[0].id);
            })
            .catch(() => setActiveSessions([]))
            .finally(() => setLoadingSessions(false));
    }, []);

    const startScanner = async () => {
        setScanning(true);
        setError('');
        setResult(null);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    try {
                        const data = JSON.parse(decodedText);
                        if (data.sessionId && data.token) {
                            await scanner.stop();
                            setScanning(false);
                            await submitAttendance(data.sessionId, data.token);
                        }
                    } catch {
                        // Not a valid QR, keep scanning
                    }
                },
                () => { /* ignore errors during scanning */ }
            );
        } catch (err: any) {
            setError('Camera access denied or not available. Use manual entry below.');
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                scannerRef.current = null;
            }
        } catch { }
        setScanning(false);
    };

    const submitAttendance = async (sessionId: string, token: string) => {
        setSubmitting(true);
        setError('');
        try {
            // Get GPS
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error('GPS not available'));
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
            });

            // Get device fingerprint (simple browser-based)
            const fp = await generateFingerprint();

            const res = await api.post<any>('/attendance/mark', {
                sessionId,
                sessionToken: token,
                deviceFingerprint: fp,
                gpsLat: pos.coords.latitude,
                gpsLng: pos.coords.longitude,
            });

            setResult({ success: true, message: 'Attendance marked successfully! ✅' });
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to mark attendance';
            setResult({ success: false, message: msg });
        }
        setSubmitting(false);
    };

    const handleManualSubmit = async () => {
        if (!selectedSession || !manualToken) {
            setError('Please select a session and enter the token');
            return;
        }
        await submitAttendance(selectedSession, manualToken);
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <span className="text-4xl">📷</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Scan Attendance QR</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Point your camera at the QR code displayed by your warden to mark your attendance.
                    </p>
                </div>

                {/* Scanner Area */}
                <div id="qr-reader" className={`mx-auto rounded-xl overflow-hidden ${scanning ? 'w-[300px] h-[300px]' : 'w-0 h-0'}`} />

                {!scanning && !result && (
                    <button onClick={startScanner}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200">
                        📸 Open Camera & Scan
                    </button>
                )}

                {scanning && (
                    <button onClick={stopScanner}
                        className="w-full py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all">
                        ✕ Stop Scanner
                    </button>
                )}

                {/* Result */}
                {result && (
                    <div className={`p-4 rounded-xl ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-sm font-semibold ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                            {result.message}
                        </p>
                    </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* Manual Entry Fallback — uses dropdown with session names, NOT raw IDs */}
            {!result && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-600">Manual Entry (if camera unavailable)</h4>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Active Session</label>
                        {loadingSessions ? (
                            <p className="text-xs text-slate-400 animate-pulse">Loading sessions...</p>
                        ) : activeSessions.length === 0 ? (
                            <p className="text-xs text-orange-500">⚠️ No active sessions available. Ask your warden to start a roll-call.</p>
                        ) : (
                            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                                {activeSessions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title} — {s.hostel?.name || 'Unknown Hostel'} (expires {new Date(s.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Token (from warden&apos;s screen)</label>
                        <input type="text" placeholder="Enter the token shown on warden's screen" value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                    </div>
                    <button onClick={handleManualSubmit} disabled={submitting || activeSessions.length === 0}
                        className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {submitting ? 'Submitting...' : 'Submit Attendance'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Gap 6: Device Management Tab
// ============================================================================

function DeviceManagementTab() {
    const [device, setDevice] = useState<DeviceInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [registering, setRegistering] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [reason, setReason] = useState('');

    useEffect(() => {
        api.get<any>('/attendance/device/my')
            .then((res) => setDevice(res.data))
            .catch(() => setDevice(null))
            .finally(() => setLoading(false));
    }, []);

    const registerDevice = async () => {
        setRegistering(true);
        setError('');
        try {
            const fp = await generateFingerprint();
            const res = await api.post<any>('/attendance/device/register', {
                fingerprint: fp,
                deviceName: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown Device',
                platform: navigator.platform,
            });
            setDevice(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to register device');
        }
        setRegistering(false);
    };

    const requestChange = async () => {
        if (!reason.trim()) { setError('Please provide a reason'); return; }
        setRequesting(true);
        setError('');
        try {
            const fp = await generateFingerprint();
            await api.post('/attendance/device/request-change', {
                newFingerprint: fp,
                newDeviceName: navigator.userAgent.split('(')[1]?.split(')')[0] || 'New Device',
                newPlatform: navigator.platform,
                reason: reason.trim(),
            });
            setError('');
            setReason('');
            alert('Device change request submitted! Your warden will review it.');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to request device change');
        }
        setRequesting(false);
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-3xl">📱</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Device Management</h3>
                        <p className="text-sm text-slate-500">Your attendance device binding</p>
                    </div>
                </div>

                {device ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-sm font-semibold text-emerald-700">Active Device</span>
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{device.deviceName || 'Unknown Device'}</p>
                            <p className="text-xs text-slate-500 mt-1">Platform: {device.platform || '—'}</p>
                            <p className="text-xs text-slate-500">Registered: {new Date(device.registeredAt).toLocaleDateString('en-IN')}</p>
                            <p className="text-xs text-emerald-500 mt-1">✅ Device verified and bound</p>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <h4 className="text-sm font-semibold text-slate-600">Changed your phone?</h4>
                            <textarea placeholder="Reason for device change (e.g., lost phone, new phone)..."
                                value={reason} onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none h-20" />
                            <button onClick={requestChange} disabled={requesting}
                                className="w-full py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                                {requesting ? 'Submitting...' : '🔄 Request Device Change'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <p className="text-sm text-yellow-700 font-medium">⚠️ No device registered</p>
                            <p className="text-xs text-yellow-600 mt-1">Register this device to mark QR attendance. First registration is automatic.</p>
                        </div>
                        <button onClick={registerDevice} disabled={registering}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60">
                            {registering ? 'Registering...' : '📱 Register This Device'}
                        </button>
                    </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        </div>
    );
}

// ============================================================================
// My Attendance Tab (Gap 9: Gate History Timeline Added)
// ============================================================================

function MyAttendanceTab({ userId }: { userId?: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        const [year, m] = month.split('-').map(Number);
        const from = `${year}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(year, m, 0).getDate();
        const to = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;

        api.get<any>(`/attendance/my?from=${from}&to=${to}`)
            .then((res) => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, month]);

    if (loading) return <LoadingSkeleton />;
    if (!data) return <div className="text-center py-16 text-slate-400">No data available</div>;

    const stats = data.stats;
    const [year, m] = month.split('-').map(Number);
    const firstDay = new Date(year, m - 1, 1).getDay();
    const daysInMonth = new Date(year, m, 0).getDate();
    const recordMap = new Map((data.records || []).map((r: any) => [r.date?.split('T')[0], r]));

    const statusColor = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-500';
            case 'ABSENT': return 'bg-red-500';
            case 'ON_LEAVE': return 'bg-blue-500';
            case 'LATE': return 'bg-yellow-500';
            default: return 'bg-slate-200';
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Present', value: stats.present, color: 'text-emerald-600' },
                    { label: 'Absent', value: stats.absent, color: 'text-red-600' },
                    { label: 'On Leave', value: stats.onLeave, color: 'text-blue-600' },
                    { label: 'Late', value: stats.late, color: 'text-yellow-600' },
                    { label: 'Attendance', value: `${stats.attendancePercentage}%`, color: stats.isBelow75 ? 'text-red-600' : 'text-emerald-600' },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-4 text-center shadow-sm">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Attendance Percentage Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Attendance Percentage</span>
                    <span className={`text-lg font-bold ${stats.isBelow75 ? 'text-red-600' : 'text-emerald-600'}`}>{stats.attendancePercentage}%</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all duration-700 ${stats.isBelow75 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                        style={{ width: `${stats.attendancePercentage}%` }} />
                    <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-slate-400" />
                    <span className="absolute -top-5 left-[75%] -translate-x-1/2 text-[10px] text-slate-400">75%</span>
                </div>
                {stats.isBelow75 && <p className="text-xs text-red-500 mt-2 font-medium">⚠️ Below 75% minimum requirement.</p>}
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Calendar</h3>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record: any = recordMap.get(dateStr);
                        const status = record?.status;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                            <div key={day} className={`aspect-square flex items-center justify-center rounded-lg text-sm relative ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                                title={`${dateStr}: ${status || 'No record'}${record?.firstIn ? ` • In: ${new Date(record.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}${record?.lastOut ? ` • Out: ${new Date(record.lastOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${status ? `${statusColor(status)} text-white` : 'text-slate-400 bg-slate-50'}`}>{day}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100">
                    {ATTENDANCE_STATUSES.map((s) => (
                        <div key={s.value} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                            <span className="text-xs text-slate-500">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Gap 9: Gate History Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Gate Activity</h3>
                {data.records?.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {data.records.filter((r: any) => r.firstIn || r.lastOut).slice(0, 15).map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                                <div className="w-12 text-center">
                                    <p className="text-lg font-bold text-slate-700">{new Date(r.date).getDate()}</p>
                                    <p className="text-[10px] text-slate-400 uppercase">{new Date(r.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-3">
                                    {r.firstIn && (
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                                            🟢 In {new Date(r.firstIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {r.lastOut && (
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-50 text-orange-700">
                                            🔴 Out {new Date(r.lastOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">{formatSource(r.source)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No gate activity recorded this month</p>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Utilities
// ============================================================================

/** Map raw source enum to human-readable label */
function formatSource(source: string): string {
    const map: Record<string, string> = {
        'GATE': '🚪 Gate Entry',
        'QR_SCAN': '📱 QR Scan',
        'SYSTEM': '⚙️ System',
        'MANUAL': '✍️ Manual',
    };
    return map[source] || source;
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-24 bg-slate-100 rounded-xl" />
                <div className="h-24 bg-slate-100 rounded-xl" />
                <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
        </div>
    );
}

/** Simple browser fingerprint for device binding */
async function generateFingerprint(): Promise<string> {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth?.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString(),
        navigator.platform,
    ].filter(Boolean).join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(components);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
