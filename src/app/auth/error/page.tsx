'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-sm text-red-700">
              {error === 'AccessDenied' 
                ? 'Your email address is not authorized to access this application. Please contact your administrator to request access.'
                : error === 'Configuration'
                ? 'There is a configuration problem with the authentication system. Please contact support.'
                : 'An unexpected error occurred. Please try signing in again.'}
            </p>
          </div>
          
          <Link href="/auth/signin">
            <Button className="w-full" variant="outline">
              Try Again
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div>Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}