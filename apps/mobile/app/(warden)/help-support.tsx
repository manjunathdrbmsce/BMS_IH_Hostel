import React from 'react';
import { ProfileInfoPage } from '@/components/ProfileInfoPage';

export default function WardenHelpSupport() {
  return (
    <ProfileInfoPage
      title="Help & Support"
      icon="help-circle-outline"
      profileRoute="/(warden)/profile"
      sections={[
        {
          title: 'Admin Support',
          body: 'For dashboard, student, device, leave, gate pass, or roll call issues, contact the hostel system administrator.',
        },
        {
          title: 'Operational Help',
          body: 'If a workflow is blocked, verify connectivity and retry before escalating to technical support.',
        },
      ]}
    />
  );
}
