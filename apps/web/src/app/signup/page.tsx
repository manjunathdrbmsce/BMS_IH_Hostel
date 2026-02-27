'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  IdCard,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    usn: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          router.replace('/dashboard');
        }
      } catch {
        // ignore
      }
    }
  }, [router]);

  const passwordChecks = {
    minLength: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[@$!%*?&#]/.test(form.password),
  };
  const passwordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('Please agree to the terms and conditions');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrong) {
      setError('Password does not meet the requirements');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: unknown };
      }>('/auth/signup', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        mobile: form.mobile,
        usn: form.usn || undefined,
        password: form.password,
      }, { noAuth: true });

      // Auto-login
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      router.push('/dashboard/registration');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Registration failed. Please try again.');
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordCheck = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
      {label}
    </div>
  );

  return (
    <main className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BMS Hostel</h1>
              <p className="text-xs text-emerald-200">Management System</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Student<br />Registration Portal
            </h2>
            <p className="text-emerald-200 text-lg mb-8 leading-relaxed">
              Create your account to apply for hostel accommodation at BMS Educational Trust. Complete the registration form and submit your hostel admission application online.
            </p>

            <div className="space-y-4">
              <StepCard step={1} title="Create Account" desc="Sign up with your details" active />
              <StepCard step={2} title="Fill Application" desc="Complete the 6-step hostel admission form" />
              <StepCard step={3} title="Get Allotted" desc="Receive your hostel and room assignment" />
            </div>
          </div>

          <p className="text-emerald-300 text-sm">
            &copy; {new Date().getFullYear()} BMS Educational Trust. Hostel Admission Portal
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">BMS Hostel</h1>
              <p className="text-xs text-gray-500">Student Registration</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              </div>
              <p className="text-gray-500 text-sm">Register to apply for hostel accommodation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                      placeholder="First name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                    placeholder="your.name@bms.edu"
                    required
                  />
                </div>
              </div>

              {/* Mobile + USN Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USN <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.usn}
                      onChange={(e) => setForm({ ...form, usn: e.target.value.toUpperCase() })}
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                      placeholder="1BM22CS001"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <PasswordCheck ok={passwordChecks.minLength} label="8+ characters" />
                    <PasswordCheck ok={passwordChecks.uppercase} label="Uppercase (A-Z)" />
                    <PasswordCheck ok={passwordChecks.lowercase} label="Lowercase (a-z)" />
                    <PasswordCheck ok={passwordChecks.number} label="Number (0-9)" />
                    <PasswordCheck ok={passwordChecks.special} label="Special (@$!%*?&#)" />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition ${
                      form.confirmPassword && form.confirmPassword !== form.password
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}
                    placeholder="Re-enter your password"
                    required
                  />
                </div>
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-600">
                  I agree to the{' '}
                  <span className="text-emerald-600 font-medium">Terms & Conditions</span> and{' '}
                  <span className="text-emerald-600 font-medium">Privacy Policy</span> of BMS Hostel Management System
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !agreed}
                className="relative w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm group"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create Account & Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="flex items-center justify-center gap-1 mt-6 pt-6 border-t border-gray-100">
              <span className="text-sm text-gray-500">Already have an account?</span>
              <Link href="/login" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                Sign In
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Your data is protected with enterprise-grade encryption</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function StepCard({ step, title, desc, active }: { step: number; title: string; desc: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 ${active ? 'bg-white/15 border border-white/20' : 'bg-white/5 border border-white/5'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${active ? 'bg-white text-emerald-700' : 'bg-white/10 text-emerald-200'}`}>
        {step}
      </div>
      <div>
        <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-emerald-200'}`}>{title}</p>
        <p className="text-xs text-emerald-300">{desc}</p>
      </div>
    </div>
  );
}
