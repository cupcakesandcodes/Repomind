import React from 'react';
import Sidebar from '@/components/Sidebar';
import { UserButton } from '@clerk/nextjs';
import { FilterProvider } from '@/lib/filter-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100vh', width: '100vw', overflow: 'hidden', background: '#080909' }}>
        <Sidebar />
        <main style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 50 }}>
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
          </div>
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}
