'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/ui/stat-card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatStatus, statusColor } from '@/lib/utils';
import { GENDERS, BLOOD_GROUPS } from '@/lib/constants';
import {
  Plus, Search, GraduationCap, User, Phone, Mail, Calendar,
  ChevronRight, BedDouble, Users, Heart,
} from 'lucide-react';

interface StudentProfile {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  gender: string | null;
  department: string | null;
  course: string | null;
  year: number | null;
  semester: number | null;
  admissionDate: string | null;
  emergencyContact: string | null;
  permanentAddress: string | null;
  medicalConditions: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    mobile: string | null;
    usn: string | null;
    firstName: string;
    lastName: string;
    status: string;
  };
  guardians?: any[];
  currentAssignment?: any;
}

export default function StudentsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({
    userId: '', dateOfBirth: '', bloodGroup: '', gender: '', department: '', course: '', year: '', semester: '',
    admissionDate: '', emergencyContact: '', permanentAddress: '', medicalConditions: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (departmentFilter) params.set('department', departmentFilter);
      if (yearFilter) params.set('year', yearFilter);

      const res = await api.get<{ success: boolean; data: StudentProfile[]; meta: typeof meta }>(
        `/students/profiles?${params.toString()}`,
      );
      setStudents(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, yearFilter, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchStudents(1), 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleCreate = async () => {
    if (!form.userId) {
      addToast({ type: 'error', title: 'User ID is required' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/students/profiles', {
        userId: form.userId,
        dateOfBirth: form.dateOfBirth || undefined,
        bloodGroup: form.bloodGroup || undefined,
        gender: form.gender || undefined,
        department: form.department || undefined,
        course: form.course || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        semester: form.semester ? parseInt(form.semester) : undefined,
        admissionDate: form.admissionDate || undefined,
        emergencyContact: form.emergencyContact || undefined,
        permanentAddress: form.permanentAddress || undefined,
        medicalConditions: form.medicalConditions || undefined,
      });
      addToast({ type: 'success', title: 'Student profile created' });
      setShowCreateModal(false);
      setForm({ userId: '', dateOfBirth: '', bloodGroup: '', gender: '', department: '', course: '', year: '', semester: '', admissionDate: '', emergencyContact: '', permanentAddress: '', medicalConditions: '' });
      fetchStudents(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create profile';
      addToast({ type: 'error', title: msg });
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (student: StudentProfile) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.get<{ success: boolean; data: StudentProfile }>(
        `/students/profiles/${student.userId}`,
      );
      setSelectedStudent(res.data);
    } catch {
      addToast({ type: 'error', title: 'Failed to load student details' });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Student Management" subtitle="Student profiles, guardians, and academic info" />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Profiles" value={meta.total} icon={GraduationCap} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
          <StatCard title="Departments" value="—" subtitle="Across all programs" icon={Users} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="With Bed" value="—" subtitle="Currently assigned" icon={BedDouble} iconColor="text-blue-600" iconBg="bg-blue-50" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, USN, email..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <Input placeholder="Department" value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)} className="max-w-[160px]" />
            <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
              options={[
                { value: '', label: 'All Years' },
                { value: '1', label: '1st Year' },
                { value: '2', label: '2nd Year' },
                { value: '3', label: '3rd Year' },
                { value: '4', label: '4th Year' },
              ]} />
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Profile
            </Button>
          )}
        </div>

        {/* Students List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No student profiles"
            description="Create student profiles to manage hostel residents"
            actionLabel="Add Profile" onAction={() => setShowCreateModal(true)} />
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {students.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openDetail(s)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-gray-900">
                        {s.user.firstName} {s.user.lastName}
                      </h3>
                      {s.user.usn && <Badge variant="default">{s.user.usn}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[s.department, s.course, s.year ? `Year ${s.year}` : null].filter(Boolean).join(' · ') || s.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {s.gender && <span className="text-xs">{s.gender}</span>}
                    {s.bloodGroup && <Badge variant="default">{s.bloodGroup}</Badge>}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(s.user.status)}`}>
                    {formatStatus(s.user.status)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
            <div className="px-4 border-t border-gray-100">
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit}
                onPageChange={(p) => fetchStudents(p)} />
            </div>
          </Card>
        )}
      </div>

      {/* Create Profile Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Student Profile" size="lg">
        <div className="space-y-4">
          <Input label="User ID (UUID)" value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            placeholder="Paste student's user UUID" required />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date of Birth" type="date" value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            <Select label="Gender" value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[{ value: '', label: 'Select...' }, ...GENDERS]} />
            <Select label="Blood Group" value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              options={[{ value: '', label: 'Select...' }, ...BLOOD_GROUPS.map(bg => ({ value: bg, label: bg }))]} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Department" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Computer Science" />
            <Input label="Course" value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="B.E." />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Year" type="number" value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })} />
              <Input label="Sem" type="number" value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Admission Date" type="date" value={form.admissionDate}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
            <Input label="Emergency Contact" value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
            <textarea value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Full permanent address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
            <textarea value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Any known medical conditions or allergies" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>
              <Plus className="w-4 h-4 mr-1" /> Create Profile
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedStudent(null); }}
        title={selectedStudent ? `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}` : 'Student Profile'} size="lg">
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : selectedStudent && (
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="USN" value={selectedStudent.user.usn || '—'} />
              <Field label="Email" value={selectedStudent.user.email} />
              <Field label="Mobile" value={selectedStudent.user.mobile || '—'} />
              <Field label="Status" value={formatStatus(selectedStudent.user.status)} />
            </div>

            {/* Academic Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Academic Info
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Department" value={selectedStudent.department || '—'} />
                <Field label="Course" value={selectedStudent.course || '—'} />
                <Field label="Year" value={selectedStudent.year ? String(selectedStudent.year) : '—'} />
                <Field label="Semester" value={selectedStudent.semester ? String(selectedStudent.semester) : '—'} />
              </div>
            </div>

            {/* Personal Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4" /> Personal Info
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="DOB" value={selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : '—'} />
                <Field label="Gender" value={selectedStudent.gender || '—'} />
                <Field label="Blood Group" value={selectedStudent.bloodGroup || '—'} />
                <Field label="Emergency Contact" value={selectedStudent.emergencyContact || '—'} />
              </div>
            </div>

            {/* Current Bed */}
            {selectedStudent.currentAssignment && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4" /> Current Bed Assignment
                </h4>
                <p className="text-sm text-blue-700">
                  Bed {selectedStudent.currentAssignment.bedNo} · Room {selectedStudent.currentAssignment.roomNo}
                  · Floor {selectedStudent.currentAssignment.floor}
                  · {selectedStudent.currentAssignment.hostel?.name} ({selectedStudent.currentAssignment.hostel?.code})
                </p>
              </div>
            )}

            {/* Guardians */}
            {selectedStudent.guardians && selectedStudent.guardians.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Heart className="w-4 h-4" /> Guardians
                </h4>
                <div className="space-y-2">
                  {selectedStudent.guardians.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {g.guardian.firstName} {g.guardian.lastName}
                          {g.isPrimary && <Badge variant="success" className="ml-2">Primary</Badge>}
                        </p>
                        <p className="text-xs text-gray-500">{g.relation} · {g.guardian.email} · {g.guardian.mobile || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent.medicalConditions && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                <strong>Medical:</strong> {selectedStudent.medicalConditions}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}
