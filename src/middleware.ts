import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED - Authentication is currently disabled to fix redirect loop
  // Uncomment the code below once Google OAuth credentials are configured in Vercel
  
  /*
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  const isAuthPage = request.nextUrl.pathname.startsWith('/api/auth');
  
  // Allow auth pages and API auth callbacks
  if (isAuthPage) {
    return NextResponse.next();
  }
  
  // If not logged in and trying to access protected route, redirect to sign in
  if (!token) {
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  */
  
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