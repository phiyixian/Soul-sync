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
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, getDocs, query, where, collection, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { Chrome } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [myGender, setMyGender] = useState<'female' | 'male' | 'nonbinary' | 'trans' | 'other'>('other');
  const [partnerGender, setPartnerGender] = useState<'female' | 'male' | 'nonbinary' | 'trans' | 'other'>('other');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        // Now that user is authenticated, perform username uniqueness check
        const usernameQuery = query(
          collection(firestore, 'userAccounts'),
          where('username', '==', username)
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          // Optionally roll back the just-created auth user for stricter UX
          try { await deleteUser(user); } catch {}
          toast({
            variant: 'destructive',
            title: 'Username taken',
            description: 'Please choose a different username.',
          });
          return;
        }

        const usernameLower = username.trim().toLowerCase();
        const emailLower = (user.email || '').toLowerCase();

        const userAccountData = {
          id: user.uid,
          username,
          usernameLower,
          email: user.email,
          emailLower,
          dateJoined: new Date().toISOString(),
          partnerAccountId: null,
          credits: 500,
          profile: { gender: myGender, partnerPreference: partnerGender },
        };
        const userDocRef = doc(firestore, 'userAccounts', user.uid);
        setDocumentNonBlocking(userDocRef, userAccountData, { merge: true });

        // Create lookup docs for fast, secure partner search
        await Promise.all([
          setDoc(doc(firestore, 'usernames', usernameLower), { userAccountId: user.uid, username }),
          emailLower ? setDoc(doc(firestore, 'emails', emailLower), { userAccountId: user.uid, email: user.email }) : Promise.resolve(),
        ]);
        router.push('/home/avatar-editor');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message,
      });
    }
  };

  const handleGoogleSignUp = async () => {
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
      
      // Check if user already exists
      const userDocRef = doc(firestore, 'userAccounts', user.uid);
      const userDoc = await getDocs(query(collection(firestore, 'userAccounts'), where('id', '==', user.uid)));
      
      if (userDoc.empty) {
        // New user - create account
        const usernameLower = (user.displayName || user.email || 'user').trim().toLowerCase();
        const emailLower = (user.email || '').toLowerCase();

        const userAccountData = {
          id: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'user',
          usernameLower,
          email: user.email,
          emailLower,
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
        
        setDocumentNonBlocking(userDocRef, userAccountData, { merge: true });

        // Create lookup docs
        await Promise.all([
          setDoc(doc(firestore, 'usernames', usernameLower), { userAccountId: user.uid, username: userAccountData.username }),
          emailLower ? setDoc(doc(firestore, 'emails', emailLower), { userAccountId: user.uid, email: user.email }) : Promise.resolve(),
        ]);
        
        toast({
          title: 'Welcome to SoulSync!',
          description: 'Your Google Calendar is now connected.',
        });
        
        router.push('/home/avatar-editor');
      } else {
        // Existing user - update calendar config with new access token
        if (accessToken) {
          await updateDoc(userDocRef, {
            calendarConfig: {
              enabled: true,
              syncEnabled: true,
              shareWithPartner: true,
              accessToken: accessToken,
            }
          });
        }
        
        toast({
          title: 'Welcome back!',
          description: `Signed in as ${user.displayName || user.email}`,
        });
        
        router.push('/home');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-Up Failed',
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
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>
            Let&apos;s get you and your partner connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign-Up Button */}
          <Button
            onClick={handleGoogleSignUp}
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
                Or create account with email
              </span>
            </div>
          </div>

          <form className="space-y-4 mt-4" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="username">Your Username</Label>
              <Input
                id="username"
                placeholder="cutiepie"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="myGender">Your Gender (optional)</Label>
                <select id="myGender" className="w-full border rounded px-3 py-2" value={myGender} onChange={(e) => setMyGender(e.target.value as any)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="trans">Trans</option>
                  <option value="other">Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerGender">Partner Gender (optional)</Label>
                <select id="partnerGender" className="w-full border rounded px-3 py-2" value={partnerGender} onChange={(e) => setPartnerGender(e.target.value as any)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="trans">Trans</option>
                  <option value="other">No preference</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline font-medium text-primary">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
