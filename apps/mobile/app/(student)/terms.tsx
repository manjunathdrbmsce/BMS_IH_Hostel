import React from 'react';
import { ProfileInfoPage } from '@/components/ProfileInfoPage';

export default function StudentTerms() {
  return (
    <ProfileInfoPage
      title="Terms & Conditions"
      icon="document-text-outline"
      profileRoute="/(student)/profile"
      sections={[
        {
          title: 'Usage',
          body: 'Use the hostel app only for official hostel workflows, requests, notices, and account information.',
        },
        {
          title: 'Responsibility',
          body: 'Keep your login details private and make sure requests or submissions made from your account are accurate.',
        },
      ]}
    />
  );
}
