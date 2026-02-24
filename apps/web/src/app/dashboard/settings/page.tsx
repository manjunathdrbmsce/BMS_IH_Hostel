'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatStatus, statusColor, roleColor } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Save,
  Key,
  Bell,
  Palette,
  Monitor,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    mobile: user?.mobile || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      await api.patch('/auth/me', profileForm);
      addToast({ type: 'success', title: 'Profile updated' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({ type: 'error', title: 'Passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      addToast({ type: 'error', title: 'Password must be at least 8 characters' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      addToast({ type: 'success', title: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Password change failed' });
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Topbar title="Settings" subtitle="Manage your account preferences" />

      <div className="p-6 animate-in">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* User Card */}
            <Card className="p-5 text-center">
              <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" className="mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                {user.roles.map((r) => (
                  <span
                    key={r.name}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor(r.name)}`}
                  >
                    {r.displayName}
                  </span>
                ))}
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-3 ${statusColor(user.status)}`}>
                {formatStatus(user.status)}
              </span>
            </Card>

            {/* Nav */}
            <Card className="py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                    activeTab === tab.key
                      ? 'text-indigo-600 bg-indigo-50 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'profile' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        leftIcon={<User className="w-4 h-4" />}
                      />
                      <Input
                        label="Last Name"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Email"
                      value={user.email}
                      disabled
                      leftIcon={<Mail className="w-4 h-4" />}
                      hint="Email cannot be changed"
                    />
                    <Input
                      label="Mobile Number"
                      value={profileForm.mobile}
                      onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                      leftIcon={<Phone className="w-4 h-4" />}
                      placeholder="+91 98765 43210"
                    />
                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={handleProfileSave} loading={savingProfile}>
                        <Save className="w-4 h-4 mr-1" /> Save Changes
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role Information</CardTitle>
                  </CardHeader>
                  <div className="space-y-3 mt-2">
                    {user.roles.map((role) => (
                      <div key={role.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium text-gray-900">{role.displayName}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor(role.name)}`}>
                          {role.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <div className="space-y-4 mt-2">
                  <Input
                    label="Current Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    leftIcon={<Lock className="w-4 h-4" />}
                    placeholder="Enter current password"
                  />
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    leftIcon={<Key className="w-4 h-4" />}
                    placeholder="Enter new password"
                    hint="At least 8 characters with uppercase, lowercase, number and special character"
                  />
                  <Input
                    label="Confirm New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    leftIcon={<Key className="w-4 h-4" />}
                    placeholder="Confirm new password"
                    error={
                      passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                        ? 'Passwords do not match'
                        : undefined
                    }
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPassword ? 'Hide' : 'Show'} passwords
                    </button>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handlePasswordChange} loading={savingPassword}>
                      <Lock className="w-4 h-4 mr-1" /> Change Password
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <div className="space-y-4 mt-2">
                  <NotificationToggle
                    label="Email Notifications"
                    description="Receive email alerts for important events"
                    defaultChecked
                  />
                  <NotificationToggle
                    label="Login Alerts"
                    description="Get notified of new login activity"
                    defaultChecked
                  />
                  <NotificationToggle
                    label="System Updates"
                    description="Receive system maintenance notifications"
                  />
                  <NotificationToggle
                    label="Weekly Reports"
                    description="Get weekly occupancy and activity reports"
                    defaultChecked
                  />
                  <p className="text-xs text-gray-400 pt-4 border-t">
                    Notification settings will be available in a future update.
                  </p>
                </div>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <div className="space-y-4 mt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Theme</p>
                        <p className="text-xs text-gray-500">Choose your preferred color theme</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {['Light', 'Dark', 'System'].map((theme) => (
                        <button
                          key={theme}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            theme === 'Light'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 pt-4 border-t">
                    Dark mode and custom themes will be available in a future update.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
