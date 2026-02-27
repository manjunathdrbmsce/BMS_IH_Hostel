'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  REGISTRATION_STATUSES, ADMISSION_MODES, BLOOD_GROUPS, GENDERS,
  MESS_TYPES, WIZARD_STEPS,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  ClipboardList, Plus, Search, FileText, CheckCircle2, Clock, XCircle,
  AlertTriangle, ChevronRight, ChevronLeft, Send, Eye,
  UserCheck, Users2, MapPin, FileCheck, ShieldCheck,
  Camera, Upload, X, Loader2, DoorOpen, Wallet, Building2,
} from 'lucide-react';

// ── Status badge variants ────────────────────────────────────────────────
const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  DOCUMENTS_PENDING: 'danger',
  APPROVED: 'success',
  ALLOTTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'default',
  WAITLISTED: 'info',
};

// ── Step icons ──────────────────────────────────────────────────────────
const stepIcons = [UserCheck, FileText, Users2, MapPin, FileCheck, ShieldCheck];

// ── Form Shape ──────────────────────────────────────────────────────────
interface WizardData {
  personalDetails: {
    dateOfBirth: string; gender: string; bloodGroup: string;
    motherTongue: string; nationality: string; religion: string;
    category: string; pucPercentage: string; admissionMode: string;
    photoUrl: string;
  };
  academicDetails: {
    department: string; course: string; year: string; semester: string;
    admissionDate: string;
  };
  familyDetails: {
    fatherName: string; motherName: string;
    fatherOccupation: string; motherOccupation: string;
    fatherEmail: string; fatherMobile: string; fatherLandline: string;
    motherEmail: string; motherMobile: string; motherLandline: string;
  };
  addressGuardian: {
    permanentAddress: string; communicationAddress: string;
    emergencyContact: string; localGuardianName: string;
    localGuardianAddress: string; localGuardianMobile: string;
    localGuardianLandline: string; localGuardianEmail: string;
    medicalConditions: string;
  };
  documents: {
    passportNo: string; visaDetails: string; residentialPermit: string;
  };
  declarations: {
    hosteliteDeclarationAccepted: boolean; antiRaggingStudentAccepted: boolean;
    antiRaggingParentAccepted: boolean; hostelAgreementAccepted: boolean;
    raggingPreventionAccepted: boolean;
    hosteliteDeclarationDocUrl: string; antiRaggingStudentDocUrl: string;
    antiRaggingParentDocUrl: string; hostelAgreementDocUrl: string;
    raggingPreventionDocUrl: string;
  };
  registration: {
    hostelId: string; roomTypePreference: string;
    messType: string; previousHostelHistory: string;
  };
}

const defaultWizard: WizardData = {
  personalDetails: {
    dateOfBirth: '', gender: '', bloodGroup: '', motherTongue: '',
    nationality: 'Indian', religion: '', category: '', pucPercentage: '',
    admissionMode: '', photoUrl: '',
  },
  academicDetails: { department: '', course: '', year: '', semester: '', admissionDate: '' },
  familyDetails: {
    fatherName: '', motherName: '', fatherOccupation: '', motherOccupation: '',
    fatherEmail: '', fatherMobile: '', fatherLandline: '',
    motherEmail: '', motherMobile: '', motherLandline: '',
  },
  addressGuardian: {
    permanentAddress: '', communicationAddress: '', emergencyContact: '',
    localGuardianName: '', localGuardianAddress: '', localGuardianMobile: '',
    localGuardianLandline: '', localGuardianEmail: '', medicalConditions: '',
  },
  documents: { passportNo: '', visaDetails: '', residentialPermit: '' },
  declarations: {
    hosteliteDeclarationAccepted: false, antiRaggingStudentAccepted: false,
    antiRaggingParentAccepted: false, hostelAgreementAccepted: false,
    raggingPreventionAccepted: false,
    hosteliteDeclarationDocUrl: '', antiRaggingStudentDocUrl: '',
    antiRaggingParentDocUrl: '', hostelAgreementDocUrl: '',
    raggingPreventionDocUrl: '',
  },
  registration: { hostelId: '', roomTypePreference: '', messType: '', previousHostelHistory: '' },
};

// ── Helper ──────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Main Page ───────────────────────────────────────────────────────────
export default function RegistrationPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  const isStudent = hasRole('STUDENT');
  const canManage = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'ACCOUNTS_OFFICER');
  const canAllot = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');
  const canRecordFee = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTS_OFFICER');

  // List
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardData>(defaultWizard);
  const [saving, setSaving] = useState(false);
  const [hostels, setHostels] = useState<any[]>([]);

  // Detail
  const [showDetail, setShowDetail] = useState<any>(null);

  // Photo upload
  const [photoUploading, setPhotoUploading] = useState(false);

  // Declaration document upload
  const [docUploading, setDocUploading] = useState<string | null>(null);

  // Allotment form
  const [allotHostelId, setAllotHostelId] = useState('');
  const [allotRooms, setAllotRooms] = useState<any[]>([]);
  const [allotRoomId, setAllotRoomId] = useState('');
  const [allotBedId, setAllotBedId] = useState('');
  const [allotHostelIdNo, setAllotHostelIdNo] = useState('');
  const [allotMessRollNo, setAllotMessRollNo] = useState('');
  const [allotting, setAllotting] = useState(false);
  const [showAllotForm, setShowAllotForm] = useState(false);

  // Fee recording form
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeType, setFeeType] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeReceipt, setFeeReceipt] = useState('');
  const [feeNotes, setFeeNotes] = useState('');
  const [recordingFee, setRecordingFee] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      if (isStudent && !canManage) {
        const res = await api.get<any>('/registration/my');
        setRegistrations(res.data || []);
        setTotalPages(1);
      } else {
        const [listRes, statsRes] = await Promise.all([
          api.get<any>(`/registration?${params}`),
          canManage ? api.get<any>('/registration/stats') : Promise.resolve(null),
        ]);
        setRegistrations(listRes.data || []);
        setTotalPages(listRes.meta?.totalPages || 1);
        if (statsRes) setStats(statsRes.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, statusFilter, isStudent, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get<any>('/hostels?limit=100').then((r) => setHostels(r.data || [])).catch(() => {});
  }, []);

  // ── Start New Registration ────────────────────────────────────────────
  const startNew = async () => {
    try {
      const year = new Date().getFullYear();
      const academicYear = `${year}-${year + 1}`;
      const res = await api.post<any>('/registration', { academicYear });
      setRegistrationId(res.data.id);
      setWizard(defaultWizard);
      setStep(0);
      setShowWizard(true);
    } catch (e: any) {
      addToast({ type: 'error', title: e.message || 'Failed to start registration' });
    }
  };

  // ── Resume Draft ──────────────────────────────────────────────────────
  const resumeDraft = async (reg: any) => {
    setRegistrationId(reg.id);
    // Pre-fill wizard from student profile + registration data
    const profile = reg.student?.studentProfile || {};
    setWizard({
      personalDetails: {
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        gender: profile.gender || '',
        bloodGroup: profile.bloodGroup || '',
        motherTongue: profile.motherTongue || '',
        nationality: profile.nationality || 'Indian',
        religion: profile.religion || '',
        category: profile.category || '',
        pucPercentage: profile.pucPercentage?.toString() || '',
        admissionMode: profile.admissionMode || '',
        photoUrl: profile.photoUrl || '',
      },
      academicDetails: {
        department: profile.department || '',
        course: profile.course || '',
        year: profile.year?.toString() || '',
        semester: profile.semester?.toString() || '',
        admissionDate: profile.admissionDate ? profile.admissionDate.split('T')[0] : '',
      },
      familyDetails: {
        fatherName: profile.fatherName || '',
        motherName: profile.motherName || '',
        fatherOccupation: profile.fatherOccupation || '',
        motherOccupation: profile.motherOccupation || '',
        fatherEmail: profile.fatherEmail || '',
        fatherMobile: profile.fatherMobile || '',
        fatherLandline: profile.fatherLandline || '',
        motherEmail: profile.motherEmail || '',
        motherMobile: profile.motherMobile || '',
        motherLandline: profile.motherLandline || '',
      },
      addressGuardian: {
        permanentAddress: profile.permanentAddress || '',
        communicationAddress: profile.communicationAddress || '',
        emergencyContact: profile.emergencyContact || '',
        localGuardianName: profile.localGuardianName || '',
        localGuardianAddress: profile.localGuardianAddress || '',
        localGuardianMobile: profile.localGuardianMobile || '',
        localGuardianLandline: profile.localGuardianLandline || '',
        localGuardianEmail: profile.localGuardianEmail || '',
        medicalConditions: profile.medicalConditions || '',
      },
      documents: {
        passportNo: profile.passportNo || '',
        visaDetails: profile.visaDetails || '',
        residentialPermit: profile.residentialPermit || '',
      },
      declarations: {
        hosteliteDeclarationAccepted: reg.hosteliteDeclarationAccepted || false,
        antiRaggingStudentAccepted: reg.antiRaggingStudentAccepted || false,
        antiRaggingParentAccepted: reg.antiRaggingParentAccepted || false,
        hostelAgreementAccepted: reg.hostelAgreementAccepted || false,
        raggingPreventionAccepted: reg.raggingPreventionAccepted || false,
        hosteliteDeclarationDocUrl: reg.hosteliteDeclarationDocUrl || '',
        antiRaggingStudentDocUrl: reg.antiRaggingStudentDocUrl || '',
        antiRaggingParentDocUrl: reg.antiRaggingParentDocUrl || '',
        hostelAgreementDocUrl: reg.hostelAgreementDocUrl || '',
        raggingPreventionDocUrl: reg.raggingPreventionDocUrl || '',
      },
      registration: {
        hostelId: reg.hostelId || '',
        roomTypePreference: reg.roomTypePreference || '',
        messType: reg.messType || '',
        previousHostelHistory: reg.previousHostelHistory || '',
      },
    });
    setStep(0);
    setShowWizard(true);
  };

  // ── Save Current Step ─────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!registrationId) return;
    setSaving(true);
    try {
      await api.patch<any>(`/registration/${registrationId}/draft`, wizard);
    } catch (e: any) {
      addToast({ type: 'error', title: e.message || 'Failed to save draft' });
    }
    setSaving(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const submitRegistration = async () => {
    if (!registrationId) return;
    const { declarations } = wizard;
    if (!declarations.hosteliteDeclarationAccepted || !declarations.antiRaggingStudentAccepted
        || !declarations.antiRaggingParentAccepted || !declarations.hostelAgreementAccepted
        || !declarations.raggingPreventionAccepted) {
      addToast({ type: 'error', title: 'Please accept all declarations before submitting.' });
      return;
    }
    setSaving(true);
    try {
      await api.post<any>(`/registration/${registrationId}/submit`, wizard);
      setShowWizard(false);
      fetchData();
    } catch (e: any) {
      addToast({ type: 'error', title: e.message || 'Submission failed' });
    }
    setSaving(false);
  };

  // ── View Detail ───────────────────────────────────────────────────────
  const viewDetail = async (id: string) => {
    try {
      const r = await api.get<any>(`/registration/${id}`);
      setShowDetail(r.data);
    } catch (e) { console.error(e); }
  };

  // ── Fetch Rooms for Allotment ──────────────────────────────────────────
  const fetchRoomsForAllot = async (hostelId: string) => {
    setAllotHostelId(hostelId);
    setAllotRoomId('');
    setAllotBedId('');
    if (!hostelId) { setAllotRooms([]); return; }
    try {
      const r = await api.get<any>(`/rooms?hostelId=${hostelId}&limit=200`);
      setAllotRooms(r.data || []);
    } catch { setAllotRooms([]); }
  };

  // ── Allot Registration ────────────────────────────────────────────────
  const handleAllot = async (regId: string) => {
    if (!allotHostelId || !allotBedId) {
      addToast({ type: 'error', title: 'Select hostel, room and bed' });
      return;
    }
    setAllotting(true);
    try {
      await api.post<any>(`/registration/${regId}/allot`, {
        hostelId: allotHostelId,
        bedId: allotBedId,
        hostelIdNo: allotHostelIdNo || undefined,
        messRollNo: allotMessRollNo || undefined,
      });
      addToast({ type: 'success', title: 'Room allotted successfully' });
      const r = await api.get<any>(`/registration/${regId}`);
      setShowDetail(r.data);
      setShowAllotForm(false);
      fetchData();
    } catch (e: any) {
      addToast({ type: 'error', title: e.message || 'Allotment failed' });
    }
    setAllotting(false);
  };

  // ── Record Fee ────────────────────────────────────────────────────────
  const handleRecordFee = async (regId: string) => {
    if (!feeType || !feeAmount) {
      addToast({ type: 'error', title: 'Fee type and amount are required' });
      return;
    }
    setRecordingFee(true);
    try {
      await api.post<any>(`/registration/${regId}/fee`, {
        registrationId: regId,
        feeType,
        amount: parseFloat(feeAmount),
        receiptNo: feeReceipt || undefined,
        notes: feeNotes || undefined,
      });
      addToast({ type: 'success', title: 'Fee recorded successfully' });
      const r = await api.get<any>(`/registration/${regId}`);
      setShowDetail(r.data);
      setShowFeeForm(false);
      setFeeType(''); setFeeAmount(''); setFeeReceipt(''); setFeeNotes('');
    } catch (e: any) {
      addToast({ type: 'error', title: e.message || 'Failed to record fee' });
    }
    setRecordingFee(false);
  };

  // ── Admin Actions ─────────────────────────────────────────────────────
  const handleReview = async (id: string, status: string) => {
    const notes = prompt(`Notes for ${status.toLowerCase()}:`);
    const body: any = { status, reviewNotes: notes || '' };
    if (status === 'REJECTED') {
      const reason = prompt('Rejection reason (required):');
      if (!reason) return;
      body.rejectionReason = reason;
    }
    try {
      await api.post<any>(`/registration/${id}/review`, body);
      const r = await api.get<any>(`/registration/${id}`);
      setShowDetail(r.data);
      fetchData();
    } catch (e: any) { addToast({ type: 'error', title: e.message }); }
  };

  // ── Step Navigation ───────────────────────────────────────────────────
  const goNext = async () => {
    await saveDraft();
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // ── Input helpers ─────────────────────────────────────────────────────
  const setField = (section: keyof WizardData, field: string, value: string | boolean) => {
    setWizard((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const renderInput = (label: string, section: keyof WizardData, field: string, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {opts?.required && <span className="text-red-500">*</span>}</label>
      <Input
        type={opts?.type || 'text'}
        placeholder={opts?.placeholder || label}
        value={(wizard[section] as any)[field] || ''}
        onChange={(e) => setField(section, field, e.target.value)}
      />
    </div>
  );

  const renderSelect = (label: string, section: keyof WizardData, field: string, options: readonly any[], opts?: { required?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {opts?.required && <span className="text-red-500">*</span>}</label>
      <select
        value={(wizard[section] as any)[field] || ''}
        onChange={(e) => setField(section, field, e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
      >
        <option value="">Select {label}</option>
        {options.map((o: any) => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );

  const renderTextarea = (label: string, section: keyof WizardData, field: string, opts?: { required?: boolean; rows?: number }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {opts?.required && <span className="text-red-500">*</span>}</label>
      <textarea
        value={(wizard[section] as any)[field] || ''}
        onChange={(e) => setField(section, field, e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
        rows={opts?.rows || 3}
        placeholder={label}
      />
    </div>
  );

  // ── Wizard Steps ──────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="col-span-full text-lg font-semibold text-gray-900">Personal Details</h3>
          {renderInput('Date of Birth', 'personalDetails', 'dateOfBirth', { type: 'date', required: true })}
          {renderSelect('Gender', 'personalDetails', 'gender', GENDERS, { required: true })}
          {renderSelect('Blood Group', 'personalDetails', 'bloodGroup', BLOOD_GROUPS, { required: true })}
          {renderInput('Mother Tongue', 'personalDetails', 'motherTongue', { required: true })}
          {renderInput('Nationality', 'personalDetails', 'nationality', { required: true })}
          {renderInput('Religion', 'personalDetails', 'religion')}
          {renderInput('Category (SC/ST/OBC/General)', 'personalDetails', 'category')}
          {renderInput('PUC / 12th Percentage', 'personalDetails', 'pucPercentage', { type: 'number' })}
          {renderSelect('Admission Mode', 'personalDetails', 'admissionMode', ADMISSION_MODES, { required: true })}

          {/* Photo Upload */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo</label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative w-28 h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {wizard.personalDetails.photoUrl ? (
                  <>
                    <img
                      src={wizard.personalDetails.photoUrl.startsWith('/uploads')
                        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${wizard.personalDetails.photoUrl}`
                        : wizard.personalDetails.photoUrl}
                      alt="Student photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setField('personalDetails', 'photoUrl', '')}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" />
                )}
              </div>
              {/* Upload Button */}
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  {photoUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> {wizard.personalDetails.photoUrl ? 'Change Photo' : 'Upload Photo'}</>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={photoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        addToast({ type: 'error', title: 'Photo must be under 2 MB' });
                        return;
                      }
                      setPhotoUploading(true);
                      try {
                        const res = await api.upload<{ data: { url: string } }>('/uploads/photo', file);
                        setField('personalDetails', 'photoUrl', res.data.url);
                      } catch (err: any) {
                        addToast({ type: 'error', title: err.message || 'Photo upload failed' });
                      }
                      setPhotoUploading(false);
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG or WebP. Max 2 MB. Passport-size recommended.</p>
              </div>
            </div>
          </div>

          <div className="col-span-full border-t pt-4 mt-2">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Hostel Preference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderSelect('Preferred Hostel', 'registration', 'hostelId', hostels.map((h: any) => ({ value: h.id, label: `${h.code} – ${h.name}` })))}
              {renderInput('Room Type Preference', 'registration', 'roomTypePreference', { placeholder: 'Single / Double / Triple' })}
              {renderSelect('Mess Type', 'registration', 'messType', MESS_TYPES)}
              {renderTextarea('Previous Hostel History', 'registration', 'previousHostelHistory', { rows: 2 })}
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="col-span-full text-lg font-semibold text-gray-900">Academic Details</h3>
          {renderInput('Department / Branch', 'academicDetails', 'department', { required: true })}
          {renderInput('Course (B.E. / B.Tech / M.Tech etc.)', 'academicDetails', 'course', { required: true })}
          {renderInput('Year', 'academicDetails', 'year', { type: 'number', required: true })}
          {renderInput('Semester', 'academicDetails', 'semester', { type: 'number', required: true })}
          {renderInput('Date of Admission', 'academicDetails', 'admissionDate', { type: 'date' })}
        </div>
      );
      case 2: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="col-span-full text-lg font-semibold text-gray-900">Family Details</h3>
          <div className="col-span-full bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">Father&apos;s Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Father's Name", 'familyDetails', 'fatherName', { required: true })}
              {renderInput("Father's Occupation", 'familyDetails', 'fatherOccupation', { required: true })}
              {renderInput("Father's Email", 'familyDetails', 'fatherEmail', { type: 'email' })}
              {renderInput("Father's Mobile", 'familyDetails', 'fatherMobile', { required: true })}
              {renderInput("Father's Landline", 'familyDetails', 'fatherLandline')}
            </div>
          </div>
          <div className="col-span-full bg-pink-50 rounded-lg p-4">
            <h4 className="font-semibold text-pink-800 mb-3">Mother&apos;s Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Mother's Name", 'familyDetails', 'motherName', { required: true })}
              {renderInput("Mother's Occupation", 'familyDetails', 'motherOccupation')}
              {renderInput("Mother's Email", 'familyDetails', 'motherEmail', { type: 'email' })}
              {renderInput("Mother's Mobile", 'familyDetails', 'motherMobile')}
              {renderInput("Mother's Landline", 'familyDetails', 'motherLandline')}
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Address & Guardian Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderTextarea('Permanent Address', 'addressGuardian', 'permanentAddress', { required: true })}
            {renderTextarea('Communication Address', 'addressGuardian', 'communicationAddress')}
          </div>
          {renderInput('Emergency Contact Number', 'addressGuardian', 'emergencyContact', { required: true })}
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Local Guardian (Bangalore)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput('Guardian Name', 'addressGuardian', 'localGuardianName', { required: true })}
              {renderTextarea('Guardian Address', 'addressGuardian', 'localGuardianAddress', { required: true })}
              {renderInput('Guardian Mobile', 'addressGuardian', 'localGuardianMobile', { required: true })}
              {renderInput('Guardian Landline', 'addressGuardian', 'localGuardianLandline')}
              {renderInput('Guardian Email', 'addressGuardian', 'localGuardianEmail', { type: 'email' })}
            </div>
          </div>
          {renderTextarea('Medical Conditions / Allergies', 'addressGuardian', 'medicalConditions', { rows: 2 })}
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Documents (International Students)</h3>
          <p className="text-sm text-gray-500">These fields are only required for international / NRI / PIO students.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Passport Number', 'documents', 'passportNo')}
            {renderInput('Visa Details', 'documents', 'visaDetails')}
            {renderInput('Residential Permit No.', 'documents', 'residentialPermit')}
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Declarations & Undertakings</h3>
          <p className="text-sm text-gray-500">Please read and accept all declarations to submit your application.</p>
          {renderDeclaration(
            'Hostelite Declaration',
            'I hereby declare that I shall abide by all the rules and regulations of the hostel as laid down by the BMS Educational Trust and its management.',
            'hosteliteDeclarationAccepted',
            'hosteliteDeclarationDocUrl',
          )}
          {renderDeclaration(
            'Anti-Ragging Affidavit (Student)',
            'I solemnly declare that I will not indulge in ragging of any kind. I understand that ragging is a criminal offence punishable under Indian Penal Code and the UGC regulations.',
            'antiRaggingStudentAccepted',
            'antiRaggingStudentDocUrl',
          )}
          {renderDeclaration(
            'Anti-Ragging Affidavit (Parent/Guardian)',
            'I, as parent/guardian, affirm that my ward shall not participate in any form of ragging. I accept responsibility for any violation and understand the consequences thereof.',
            'antiRaggingParentAccepted',
            'antiRaggingParentDocUrl',
          )}
          {renderDeclaration(
            'Hostel Agreement',
            'I agree to the terms and conditions of the hostel including fee structure, mess timings, discipline code, and occupancy rules. I understand that violation may lead to expulsion from the hostel.',
            'hostelAgreementAccepted',
            'hostelAgreementDocUrl',
          )}
          {renderDeclaration(
            'Ragging Prevention Undertaking',
            'I undertake to report any incident of ragging to the hostel authorities immediately. I understand that failure to report ragging is also an offence.',
            'raggingPreventionAccepted',
            'raggingPreventionDocUrl',
          )}
        </div>
      );
      default: return null;
    }
  };

  const renderDeclaration = (title: string, text: string, field: string, docField: string) => {
    const docUrl = (wizard.declarations as any)[docField] || '';
    const isUploading = docUploading === docField;
    return (
      <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{text}</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={(wizard.declarations as any)[field] || false}
            onChange={(e) => setField('declarations', field, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">I accept and agree to the above declaration</span>
        </label>

        {/* Signed / Scanned Document Upload */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Upload signed &amp; scanned document (PDF, JPG, PNG — max 5 MB)</p>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              {isUploading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-3 h-3" /> {docUrl ? 'Replace Document' : 'Upload Document'}</>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={!!docUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    addToast({ type: 'error', title: 'File must be under 5 MB' });
                    return;
                  }
                  setDocUploading(docField);
                  try {
                    const res = await api.upload<{ data: { url: string } }>('/uploads/document', file);
                    setField('declarations', docField, res.data.url);
                  } catch (err: any) {
                    addToast({ type: 'error', title: err.message || 'Document upload failed' });
                  }
                  setDocUploading(null);
                  e.target.value = '';
                }}
              />
            </label>
            {docUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={docUrl.startsWith('/uploads')
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${docUrl}`
                    : docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FileCheck className="w-3 h-3" /> View uploaded document
                </a>
                <button
                  type="button"
                  onClick={() => setField('declarations', docField, '')}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Header */}
      <Topbar
        title="Hostel Registration"
        subtitle={isStudent ? 'Apply for hostel admission' : 'Manage student hostel registrations'}
      >
        {isStudent && (
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> New Registration</Button>
        )}
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
      {/* Stats (admin) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading && canManage ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats && canManage ? (
          <>
            <StatCard title="Submitted" value={stats.submitted} icon={Send} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <StatCard title="Under Review" value={stats.underReview} icon={Clock} iconColor="text-yellow-600" iconBg="bg-yellow-50" />
            <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
            <StatCard title="Allotted" value={stats.allotted} icon={ClipboardList} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <StatCard title="Total" value={stats.total} icon={FileText} iconColor="text-gray-600" iconBg="bg-gray-50" />
          </>
        ) : null}
      </div>

      {/* Filters */}
      {canManage && (
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, USN, application no…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">All Statuses</option>
              {REGISTRATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No registrations"
          description={isStudent ? 'Start a new hostel registration to apply for accommodation.' : 'No registrations match the current filters.'}
        />
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {registrations.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  if (r.status === 'DRAFT' && (isStudent || canManage)) {
                    viewDetail(r.id).then(() => {}).catch(() => {});
                    resumeDraft(r);
                  } else {
                    viewDetail(r.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.applicationNo}</p>
                    <p className="text-xs text-gray-500">
                      {r.student?.firstName} {r.student?.lastName}
                      {r.student?.usn && ` \u2022 ${r.student.usn}`}
                      {r.hostel && ` \u2022 ${r.hostel.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusBadge[r.status] || 'default'}>{REGISTRATION_STATUSES.find(s => s.value === r.status)?.label || r.status}</Badge>
                  {r.status === 'DRAFT' && isStudent && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resumeDraft(r); }}>Continue</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {canManage && (
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}
      </div>

      {/* ── Wizard Modal ────────────────────────────────────────────────── */}
      <Modal
        open={showWizard}
        onClose={() => { saveDraft(); setShowWizard(false); }}
        title="Hostel Admission Form"
      >
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((label, i) => {
              const Icon = stepIcons[i];
              return (
                <button
                  key={i}
                  onClick={() => { saveDraft(); setStep(i); }}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition-colors ${
                    i === step ? 'text-blue-700 bg-blue-50' : i < step ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-tight font-medium hidden sm:block">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-sm text-gray-500">Step {step + 1} of {WIZARD_STEPS.length}: <span className="font-medium text-gray-800">{WIZARD_STEPS[step]}</span></div>

          {/* Step content */}
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={goBack} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
              </Button>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button onClick={goNext} disabled={saving}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submitRegistration} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4 mr-1" /> Submit Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Registration Details">
        {showDetail && (() => {
          const prof = showDetail.student?.studentProfile || {};
          const stu = showDetail.student || {};
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const photoSrc = prof.photoUrl
            ? (prof.photoUrl.startsWith('/uploads') ? `${apiBase}${prof.photoUrl}` : prof.photoUrl)
            : null;
          const DetailRow = ({ label, value }: { label: string; value: any }) => (
            <div>
              <span className="text-xs text-gray-500">{label}</span>
              <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
            </div>
          );
          const SectionHeader = ({ icon: Icon, title, bg, fg }: { icon: any; title: string; bg: string; fg: string }) => (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${fg}`} />
              <h4 className={`font-semibold text-sm ${fg}`}>{title}</h4>
            </div>
          );

          return (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* ── Application Header ──────────────────────────── */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {photoSrc ? (
                    <img src={photoSrc} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{stu.firstName} {stu.lastName}</h3>
                  <p className="text-sm text-gray-600">{stu.usn || 'USN not available'}</p>
                  <p className="text-xs text-gray-400">{showDetail.applicationNo} &bull; {showDetail.academicYear}</p>
                </div>
              </div>
              <Badge variant={statusBadge[showDetail.status] || 'default'}>
                {REGISTRATION_STATUSES.find(s => s.value === showDetail.status)?.label}
              </Badge>
            </div>

            {/* ── Section 1: Personal Details ─────────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={UserCheck} title="Personal Details" bg="bg-indigo-50" fg="text-indigo-700" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm px-1">
                <DetailRow label="Full Name" value={`${stu.firstName || ''} ${stu.lastName || ''}`.trim()} />
                <DetailRow label="Email" value={stu.email} />
                <DetailRow label="Mobile" value={stu.mobile} />
                <DetailRow label="Date of Birth" value={fmtDate(prof.dateOfBirth)} />
                <DetailRow label="Gender" value={prof.gender} />
                <DetailRow label="Blood Group" value={prof.bloodGroup} />
                <DetailRow label="Mother Tongue" value={prof.motherTongue} />
                <DetailRow label="Nationality" value={prof.nationality} />
                <DetailRow label="Religion" value={prof.religion} />
                <DetailRow label="Category" value={prof.category} />
                <DetailRow label="PUC / 12th %" value={prof.pucPercentage != null ? `${prof.pucPercentage}%` : '—'} />
                <DetailRow label="Admission Mode" value={prof.admissionMode} />
              </div>
            </div>

            {/* ── Section 2: Academic Details ─────────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={FileText} title="Academic Details" bg="bg-cyan-50" fg="text-cyan-700" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm px-1">
                <DetailRow label="Department / Branch" value={prof.department} />
                <DetailRow label="Course" value={prof.course} />
                <DetailRow label="Year" value={prof.year} />
                <DetailRow label="Semester" value={prof.semester} />
                <DetailRow label="Date of Admission" value={fmtDate(prof.admissionDate)} />
              </div>
            </div>

            {/* ── Section 3: Family Details ───────────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={Users2} title="Family Details" bg="bg-violet-50" fg="text-violet-700" />
              {/* Father */}
              <div className="bg-blue-50/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Father&apos;s Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <DetailRow label="Name" value={prof.fatherName} />
                  <DetailRow label="Occupation" value={prof.fatherOccupation} />
                  <DetailRow label="Email" value={prof.fatherEmail} />
                  <DetailRow label="Mobile" value={prof.fatherMobile} />
                  <DetailRow label="Landline" value={prof.fatherLandline} />
                </div>
              </div>
              {/* Mother */}
              <div className="bg-pink-50/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-pink-700 mb-2 uppercase tracking-wide">Mother&apos;s Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <DetailRow label="Name" value={prof.motherName} />
                  <DetailRow label="Occupation" value={prof.motherOccupation} />
                  <DetailRow label="Email" value={prof.motherEmail} />
                  <DetailRow label="Mobile" value={prof.motherMobile} />
                  <DetailRow label="Landline" value={prof.motherLandline} />
                </div>
              </div>
            </div>

            {/* ── Section 4: Address & Guardian ───────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={MapPin} title="Address & Guardian" bg="bg-amber-50" fg="text-amber-700" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm px-1">
                <div>
                  <span className="text-xs text-gray-500">Permanent Address</span>
                  <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{prof.permanentAddress || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Communication Address</span>
                  <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{prof.communicationAddress || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm px-1">
                <DetailRow label="Emergency Contact" value={prof.emergencyContact} />
                <DetailRow label="Medical Conditions" value={prof.medicalConditions} />
              </div>
              {/* Local Guardian */}
              <div className="bg-orange-50/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">Local Guardian (Bangalore)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <DetailRow label="Name" value={prof.localGuardianName} />
                  <DetailRow label="Mobile" value={prof.localGuardianMobile} />
                  <DetailRow label="Landline" value={prof.localGuardianLandline} />
                  <DetailRow label="Email" value={prof.localGuardianEmail} />
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">Address</span>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{prof.localGuardianAddress || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 5: Documents (NRI/International) ────── */}
            {(prof.passportNo || prof.visaDetails || prof.residentialPermit) && (
              <div className="space-y-3">
                <SectionHeader icon={FileCheck} title="Documents (International)" bg="bg-teal-50" fg="text-teal-700" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm px-1">
                  <DetailRow label="Passport Number" value={prof.passportNo} />
                  <DetailRow label="Visa Details" value={prof.visaDetails} />
                  <DetailRow label="Residential Permit" value={prof.residentialPermit} />
                </div>
              </div>
            )}

            {/* ── Hostel Preference ──────────────────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={ClipboardList} title="Hostel Preference" bg="bg-emerald-50" fg="text-emerald-700" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm px-1">
                <DetailRow label="Preferred Hostel" value={showDetail.hostel ? `${showDetail.hostel.code} – ${showDetail.hostel.name}` : null} />
                <DetailRow label="Room Type" value={showDetail.roomTypePreference} />
                <DetailRow label="Mess Type" value={showDetail.messType} />
              </div>
              {showDetail.previousHostelHistory && (
                <div className="px-1">
                  <span className="text-xs text-gray-500">Previous Hostel History</span>
                  <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{showDetail.previousHostelHistory}</p>
                </div>
              )}
            </div>

            {/* ── Office Use (Allotted) ──────────────────────── */}
            {showDetail.status === 'ALLOTTED' && (
              <div className="bg-green-50 rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-green-800">Office Use — Allotment Details</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DetailRow label="Hostel ID No." value={showDetail.hostelIdNo} />
                  <DetailRow label="Mess Roll No." value={showDetail.messRollNo} />
                  <DetailRow label="Date of Occupation" value={fmtDate(showDetail.dateOfOccupation)} />
                </div>
              </div>
            )}

            {/* ── Section 6: Declarations ─────────────────────── */}
            <div className="space-y-3">
              <SectionHeader icon={ShieldCheck} title="Declarations & Undertakings" bg="bg-rose-50" fg="text-rose-700" />
              <div className="space-y-2 px-1">
                {[
                  ['Hostelite Declaration', showDetail.hosteliteDeclarationAccepted, showDetail.hosteliteDeclarationDocUrl],
                  ['Anti-Ragging Affidavit (Student)', showDetail.antiRaggingStudentAccepted, showDetail.antiRaggingStudentDocUrl],
                  ['Anti-Ragging Affidavit (Parent)', showDetail.antiRaggingParentAccepted, showDetail.antiRaggingParentDocUrl],
                  ['Hostel Agreement', showDetail.hostelAgreementAccepted, showDetail.hostelAgreementDocUrl],
                  ['Ragging Prevention Undertaking', showDetail.raggingPreventionAccepted, showDetail.raggingPreventionDocUrl],
                ].map(([label, accepted, docUrl]) => (
                  <div key={label as string} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      {accepted ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      <span className="text-sm text-gray-800">{label as string}</span>
                    </div>
                    {docUrl && (
                      <a
                        href={(docUrl as string).startsWith('/uploads') ? `${apiBase}${docUrl}` : docUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Eye className="h-3 w-3" /> View Doc
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Fees ───────────────────────────────────────── */}
            {showDetail.fees?.length > 0 && (
              <div className="space-y-3">
                <SectionHeader icon={FileText} title="Fee Payments" bg="bg-lime-50" fg="text-lime-700" />
                <div className="space-y-1 px-1">
                  {showDetail.fees.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{f.feeType}</span>
                        {f.notes && <p className="text-xs text-gray-400">{f.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{f.amount}</p>
                        <p className="text-xs text-gray-400">{f.receiptNo || 'No receipt'} &bull; {fmtDate(f.paidAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Review Info ────────────────────────────────── */}
            {showDetail.reviewedBy && (
              <div className="text-sm bg-blue-50 rounded-lg p-3 space-y-1">
                <h4 className="font-semibold text-blue-800">Review Information</h4>
                <p className="text-gray-700">Reviewed by: <span className="font-medium">{showDetail.reviewedBy.firstName} {showDetail.reviewedBy.lastName}</span> on {fmtDate(showDetail.reviewedAt)}</p>
                {showDetail.reviewNotes && <p className="text-gray-600">Notes: {showDetail.reviewNotes}</p>}
                {showDetail.rejectionReason && <p className="text-red-600 font-medium">Rejection Reason: {showDetail.rejectionReason}</p>}
              </div>
            )}

            {/* ── Timestamps ─────────────────────────────────── */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 border-t pt-3">
              <span>Created: {fmtDate(showDetail.createdAt)}</span>
              {showDetail.submittedAt && <span>Submitted: {fmtDate(showDetail.submittedAt)}</span>}
              {showDetail.completedAt && <span>Completed: {fmtDate(showDetail.completedAt)}</span>}
            </div>

            {/* ── Admin Actions: Review ──────────────────────── */}
            {canManage && ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'].includes(showDetail.status) && (
              <div className="space-y-3 border-t pt-3">
                <h4 className="font-semibold text-sm text-gray-700">Review Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleReview(showDetail.id, 'APPROVED')} className="bg-green-600 hover:bg-green-700" size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button onClick={() => handleReview(showDetail.id, 'DOCUMENTS_PENDING')} variant="outline" size="sm">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Docs Pending
                  </Button>
                  <Button onClick={() => handleReview(showDetail.id, 'WAITLISTED')} variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-1" /> Waitlist
                  </Button>
                  <Button onClick={() => handleReview(showDetail.id, 'REJECTED')} variant="danger" size="sm">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            )}

            {/* ── Admin Actions: Allot Room (APPROVED only) ───── */}
            {canAllot && showDetail.status === 'APPROVED' && (
              <div className="space-y-3 border-t pt-3">
                {!showAllotForm ? (
                  <Button onClick={() => { setShowAllotForm(true); setAllotHostelId(showDetail.hostelId || ''); if (showDetail.hostelId) fetchRoomsForAllot(showDetail.hostelId); }} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                    <DoorOpen className="h-4 w-4 mr-1" /> Allot Room & Bed
                  </Button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-700" />
                        <h4 className="font-semibold text-sm text-emerald-800">Allot Room & Bed</h4>
                      </div>
                      <button onClick={() => setShowAllotForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Hostel */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hostel <span className="text-red-500">*</span></label>
                        <select
                          value={allotHostelId}
                          onChange={(e) => fetchRoomsForAllot(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none"
                        >
                          <option value="">Select Hostel</option>
                          {hostels.map((h: any) => <option key={h.id} value={h.id}>{h.code} – {h.name}</option>)}
                        </select>
                      </div>
                      {/* Room */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Room <span className="text-red-500">*</span></label>
                        <select
                          value={allotRoomId}
                          onChange={(e) => { setAllotRoomId(e.target.value); setAllotBedId(''); }}
                          disabled={!allotHostelId}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none disabled:opacity-50"
                        >
                          <option value="">Select Room</option>
                          {allotRooms.filter((r: any) => r.beds?.some((b: any) => b.status === 'VACANT')).map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.roomNo} (Floor {r.floor}{r.block ? `, Block ${r.block}` : ''}) — {r.beds?.filter((b: any) => b.status === 'VACANT').length} vacant
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Bed */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bed <span className="text-red-500">*</span></label>
                        <select
                          value={allotBedId}
                          onChange={(e) => setAllotBedId(e.target.value)}
                          disabled={!allotRoomId}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none disabled:opacity-50"
                        >
                          <option value="">Select Bed</option>
                          {allotRooms.find((r: any) => r.id === allotRoomId)?.beds?.filter((b: any) => b.status === 'VACANT').map((b: any) => (
                            <option key={b.id} value={b.id}>Bed {b.bedNo}</option>
                          ))}
                        </select>
                      </div>
                      {/* Hostel ID No */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hostel ID No.</label>
                        <Input value={allotHostelIdNo} onChange={(e) => setAllotHostelIdNo(e.target.value)} placeholder="e.g. IH-2026-0001" />
                      </div>
                      {/* Mess Roll No */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mess Roll No.</label>
                        <Input value={allotMessRollNo} onChange={(e) => setAllotMessRollNo(e.target.value)} placeholder="e.g. MR-0001" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => handleAllot(showDetail.id)} disabled={allotting || !allotBedId} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                        {allotting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Confirm Allotment
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAllotForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Admin Actions: Record Fee ───────────────────── */}
            {canRecordFee && !['DRAFT', 'CANCELLED', 'REJECTED'].includes(showDetail.status) && (
              <div className="space-y-3 border-t pt-3">
                {!showFeeForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowFeeForm(true)}>
                    <Wallet className="h-4 w-4 mr-1" /> Record Fee Payment
                  </Button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-amber-700" />
                        <h4 className="font-semibold text-sm text-amber-800">Record Fee Payment</h4>
                      </div>
                      <button onClick={() => setShowFeeForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fee Type <span className="text-red-500">*</span></label>
                        <select
                          value={feeType}
                          onChange={(e) => setFeeType(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-300 focus:ring-2 focus:ring-amber-100 outline-none"
                        >
                          <option value="">Select Fee Type</option>
                          <option value="HOSTEL_FEE">Hostel Fee</option>
                          <option value="MESS_FEE">Mess Fee</option>
                          <option value="CAUTION_DEPOSIT">Caution Deposit</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                        <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g. 45000" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Receipt No.</label>
                        <Input value={feeReceipt} onChange={(e) => setFeeReceipt(e.target.value)} placeholder="e.g. RCP-2026-0001" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <Input value={feeNotes} onChange={(e) => setFeeNotes(e.target.value)} placeholder="Optional notes" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => handleRecordFee(showDetail.id)} disabled={recordingFee || !feeType || !feeAmount} className="bg-amber-600 hover:bg-amber-700" size="sm">
                        {recordingFee ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
                        Save Fee
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowFeeForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}
      </Modal>
    </div>
  );
}
