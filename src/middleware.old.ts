import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

interface TokenWithRole {
  role?: string;
  [key: string]: unknown;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const pathname = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/api/auth',
    '/auth',
    '/_next',
    '/favicon.ico',
  ];
  
  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // If not logged in and trying to access protected route, redirect to sign in
  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For pages, redirect to sign in
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Check for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if ((token as TokenWithRole).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};