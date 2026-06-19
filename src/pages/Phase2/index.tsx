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

  const getStepFromPath = () => {
    const path = window.location.pathname;
    if (path.includes('/features')) return 2;
    if (path.includes('/journey')) return 3;
    if (path.includes('/screens')) return 4;
    if (path.includes('/building')) return 5;
    if (path.includes('/review')) return 6;
    if (path.includes('/description')) return 7;
    if (path.includes('/explain')) return 8;
    if (path.includes('/demo')) return 9;
    if (path.includes('/complete')) return 10;
    return undefined;
  };

  return (
    <Phase2BuildWalkthrough 
      initialStep={getStepFromPath()} 
      onClose={() => navigateTo('/dashboard')} 
    />
  );
}
