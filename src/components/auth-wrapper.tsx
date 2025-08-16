'use client';

import { useAuth } from '@/components/providers/firebase-auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // List of public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/error'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  useEffect(() => {
    // Redirect to sign-in if not authenticated and not on a public route
    if (loading) return;
    if (!user && !isPublicRoute) {
      router.push('/auth/signin');
    }
  }, [user, loading, router, pathname, isPublicRoute]);
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">OO Insights</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // For public routes (sign-in page), show without sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // If not authenticated and not on public route, show nothing (redirect will happen)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">OO Insights</h1>
          <p className="text-gray-600">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }
  
  // Authenticated users see the full app with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="w-full min-h-screen p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}