import React from 'react';
import MaintenanceBanner from '@site/src/components/MaintenanceBanner';

// Default implementation, that you can customize
export default function Root({children}) {
  return (
    <>
      <MaintenanceBanner />
      {children}
    </>
  );
}