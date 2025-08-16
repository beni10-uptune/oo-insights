import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
  
  // For protected routes, the client-side AuthWrapper will handle redirects
  // The middleware just passes through and lets the client handle auth
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