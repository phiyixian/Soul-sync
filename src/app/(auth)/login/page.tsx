'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/Logo';
import { useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    try {
      initiateEmailSignIn(auth, email, password);
      router.push('/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get the access token from the credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      console.log('Google Sign-In result:', {
        user: user.uid,
        credential: !!credential,
        accessToken: !!accessToken,
        accessTokenLength: accessToken?.length
      });

      if (accessToken) {
        // Store calendar configuration in user's account
        const userAccountRef = doc(firestore, 'userAccounts', user.uid);
        
        // First, check if the user document exists
        try {
          const userDoc = await getDoc(userAccountRef);
          
          if (userDoc.exists()) {
            // User exists, update calendar config
            console.log('User document exists, updating calendar config');
            await updateDoc(userAccountRef, {
              calendarConfig: {
                enabled: true,
                syncEnabled: true,
                shareWithPartner: true,
                accessToken: accessToken,
              }
            });
          } else {
            // User doesn't exist, create the document
            console.log('User document does not exist, creating it');
            const userAccountData = {
              id: user.uid,
              username: user.displayName || user.email?.split('@')[0] || 'user',
              email: user.email,
              dateJoined: new Date().toISOString(),
              partnerAccountId: null,
              credits: 500,
              profile: { gender: 'other', partnerPreference: 'other' },
              calendarConfig: {
                enabled: true,
                syncEnabled: true,
                shareWithPartner: true,
                accessToken: accessToken,
              },
            };
            
            await setDoc(userAccountRef, userAccountData);
            console.log('User document created with calendar config');
          }
        } catch (error) {
          console.error('Error handling user document:', error);
          // Fallback: try to create the document
          try {
            const userAccountData = {
              id: user.uid,
              username: user.displayName || user.email?.split('@')[0] || 'user',
              email: user.email,
              dateJoined: new Date().toISOString(),
              partnerAccountId: null,
              credits: 500,
              profile: { gender: 'other', partnerPreference: 'other' },
              calendarConfig: {
                enabled: true,
                syncEnabled: true,
                shareWithPartner: true,
                accessToken: accessToken,
              },
            };
            
            await setDoc(userAccountRef, userAccountData);
            console.log('User document created as fallback');
          } catch (fallbackError) {
            console.error('Fallback creation failed:', fallbackError);
          }
        }
        
        console.log('Google Calendar access granted and stored');
      } else {
        console.error('No access token received from Google Sign-In');
      }
      
      toast({
        title: 'Welcome!',
        description: `Signed in as ${user.displayName || user.email}`,
      });
      
      router.push('/home');
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message,
      });
    }
  };

  return (
    <>
      <Link href="/welcome" className="mb-8 flex justify-center">
        <Logo className="h-10 w-auto" />
      </Link>
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full mb-4 cute-button"
          >
            <Chrome className="mr-2 h-4 w-4 text-blue-500" />
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form className="space-y-4 mt-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cute-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cute-input"
              />
            </div>
            <Button type="submit" className="w-full cute-button">
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="underline font-medium text-primary"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
