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
import { doc, getDocs, query, where, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    // Check if username already exists
    const usernameQuery = query(
      collection(firestore, 'userAccounts'),
      where('username', '==', username)
    );
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      toast({
        variant: 'destructive',
        title: 'Username taken',
        description: 'Please choose a different username.',
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        const userAccountData = {
          id: user.uid,
          username,
          email: user.email,
          dateJoined: new Date().toISOString(),
          partnerAccountId: null,
        };
        const userDocRef = doc(firestore, 'userAccounts', user.uid);
        setDocumentNonBlocking(userDocRef, userAccountData, { merge: true });
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
          <form className="space-y-4" onSubmit={handleRegister}>
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
