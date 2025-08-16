'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState('');

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCredentialsError('');
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      
      if (result?.error) {
        setCredentialsError('Invalid email or password');
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      }
    } catch (error) {
      setCredentialsError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">OO Insights</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">EUCAN Marketing Intelligence Platform</p>
      </div>
      
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">
                {error === 'AccessDenied' 
                  ? 'Access denied. Your email is not authorized to access this application. Please contact your administrator.'
                  : 'An error occurred during sign in. Please try again.'}
              </p>
            </div>
          )}
          
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={() => signIn('google', { callbackUrl })}
                className="w-full"
                size="lg"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  ></path>
                </svg>
                Sign in with Google
              </Button>
            </TabsContent>
            
            <TabsContent value="email" className="space-y-4">
              <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
                {credentialsError && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-3">
                    <p className="text-sm text-red-700">{credentialsError}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in with Email'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            By signing in, you agree to our terms and conditions. Access is monitored and logged for security purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div>Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}