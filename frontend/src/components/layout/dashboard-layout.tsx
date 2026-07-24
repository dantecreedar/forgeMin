'use client';

import { Sidebar } from './sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
