import React from 'react';
import { ProfileInfoPage } from '@/components/ProfileInfoPage';

export default function WardenTerms() {
  return (
    <ProfileInfoPage
      title="Terms & Conditions"
      icon="document-text-outline"
      profileRoute="/(warden)/profile"
      sections={[
        {
          title: 'Authorized Use',
          body: 'Use warden tools only for authorized hostel management, attendance, leave, gate, mess, and student administration.',
        },
        {
          title: 'Data Handling',
          body: 'Student and hostel records must be handled carefully and used only for official responsibilities.',
        },
      ]}
    />
  );
}
