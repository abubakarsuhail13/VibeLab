import React from 'react';
import Phase2BuildWalkthrough from '../../components/Phase2BuildWalkthrough';

export default function Phase2Page({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  return (
    <Phase2BuildWalkthrough onClose={() => navigateTo('/dashboard')} />
  );
}
