import React from 'react';
import { ProfileInfoPage } from '@/components/ProfileInfoPage';

export default function StudentHelpSupport() {
  return (
    <ProfileInfoPage
      title="Help & Support"
      icon="help-circle-outline"
      profileRoute="/(student)/profile"
      sections={[
        {
          title: 'Hostel Office',
          body: 'For room, attendance, gate pass, mess, or complaint support, contact the hostel office during working hours.',
        },
        {
          title: 'Emergency',
          body: 'For urgent hostel safety concerns, contact your warden or security desk immediately.',
        },
      ]}
    />
  );
}
