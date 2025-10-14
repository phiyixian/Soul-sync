'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Heart, Edit, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirebase, useUser } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { LinkPartnerDialog } from '@/components/LinkPartnerDialog';
import { useMemoFirebase } from '@/firebase/provider';

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const [isLinkPartnerDialogOpen, setIsLinkPartnerDialogOpen] =
    useState(false);

  const userAccountRef = useMemoFirebase(
    () => (user ? doc(firestore, 'userAccounts', user.uid) : null),
    [user, firestore]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerAccountRef = useMemoFirebase(
    () =>
      userAccount && userAccount.partnerAccountId
        ? doc(firestore, 'userAccounts', userAccount.partnerAccountId)
        : null,
    [firestore, userAccount]
  );
  const { data: partnerAccount } = useDoc(partnerAccountRef);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleUnlink = async () => {
    if (!user || !firestore || !userAccount?.partnerAccountId) return;
    const batch = writeBatch(firestore);
    const meRef = doc(firestore, 'userAccounts', user.uid);
    const partnerRef = doc(firestore, 'userAccounts', userAccount.partnerAccountId);
    batch.update(meRef, { partnerAccountId: null, partnerUsername: null });
    batch.update(partnerRef, { partnerAccountId: null, partnerUsername: null });
    await batch.commit();
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary">
          <AvatarImage
            src={`https://picsum.photos/seed/${user?.uid}/200/200`}
            data-ai-hint="pixel art avatar"
          />
          <AvatarFallback>
            {userAccount?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{userAccount?.username}</h1>
          <p className="text-muted-foreground">
            {partnerAccount
              ? `Linked with: ${partnerAccount.username}`
              : 'Not linked with a partner'}
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <User className="h-5 w-5" />
            Edit My Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            asChild
          >
            <Link href="/home/avatar-editor">
              <Edit className="h-5 w-5" />
              Edit Partner's Avatar
            </Link>
          </Button>
          <Separator className="my-2" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-primary hover:text-primary"
            onClick={() => setIsLinkPartnerDialogOpen(true)}
            disabled={!!userAccount?.partnerAccountId}
          >
            <Heart className="h-5 w-5" />
            {userAccount?.partnerAccountId ? 'Linked!' : 'Link with Partner'}
          </Button>
          {userAccount?.partnerAccountId && (
            <Button variant="destructive" className="w-full" onClick={handleUnlink}>Unlink Partner</Button>
          )}
          <Separator className="my-2" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About SoulSync</CardTitle>
          <CardDescription>Version 1.0.0</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Made with love for you and yours.
          </p>
        </CardContent>
      </Card>
      <LinkPartnerDialog
        isOpen={isLinkPartnerDialogOpen}
        onOpenChange={setIsLinkPartnerDialogOpen}
      />
    </div>
  );
}
