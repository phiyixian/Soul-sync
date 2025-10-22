"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs, query, where, doc, setDoc } from "firebase/firestore";
import { seedAvatarAssets } from "@/firebase";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirebase, useUser } from "@/firebase";

type AvatarSelection = {
  hair: string;
  faces: string;
  clothes: string;
};

export default function AvatarEditorPage() {
  const [selection, setSelection] = useState<AvatarSelection>({ hair: '', faces: '', clothes: '' });
  const [hairAssets, setHairAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const [faceAssets, setFaceAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const [clothesAssets, setClothesAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const { firestore } = useFirebase();

  // Load assets from Firestore avatarAssets
  useEffect(() => {
    (async () => {
      const base = collection(firestore, 'avatarAssets');
      const [hairSnap, faceSnap, clothesSnap] = await Promise.all([
        getDocs(query(base, where('type','==','hair'))),
        getDocs(query(base, where('type','==','faces'))),
        getDocs(query(base, where('type','==','clothes'))),
      ]);
      let hair = hairSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
      let faces = faceSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
      let clothes = clothesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));

      setHairAssets(hair);
      setFaceAssets(faces);
      setClothesAssets(clothes);
      setSelection({ hair: hair[0]?.id || '', faces: faces[0]?.id || '', clothes: clothes[0]?.id || '' });
    })();
  }, [firestore]);
  const { toast } = useToast();
  const { user } = useUser();
  const { firestore: fs2 } = useFirebase();

  const userAccountRef = useMemo(
    () => (user ? doc(fs2, 'userAccounts', user.uid) : null),
    [user, fs2]
  );
  const { data: userAccount } = useDoc(userAccountRef);
  const partnerId = userAccount?.partnerAccountId as string | undefined;

  const handleSelect = (category: keyof AvatarSelection, id: string) => {
    setSelection((prev) => ({ ...prev, [category]: id }));
  };

  const getSelectedImageUrl = (category: keyof AvatarSelection) => {
    const options = category === 'hair' ? hairAssets : category === 'faces' ? faceAssets : clothesAssets;
    return options.find(o => o.id === selection[category])?.imageUrl || '';
  };

  const handleSave = async () => {
    if (!user || !fs2 || !partnerId) {
      toast({
        variant: 'destructive',
        title: "Can't save avatar",
        description: 'Link with your partner first.',
      });
      return;
    }
    const avatarDocRef = doc(fs2, 'avatars', partnerId);
    await setDoc(
      avatarDocRef,
      {
        userAccountId: partnerId,
        hairStyle: selection.hair,
        faceType: selection.faces,
        clothing: selection.clothes,
        updatedBy: user.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    toast({ title: 'Saved!', description: "Your partner's avatar has been updated." });
  };
  
  return (
    <div className="flex h-full flex-col">
  <header className="flex items-center justify-between p-4">
    <Button variant="ghost" size="icon" asChild>
      <Link href="/home/profile"><ArrowLeft /></Link>
    </Button>
    <h1 className="text-lg font-bold">Create Your Partner's Avatar</h1>
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleSave}>
        Save <Check className="ml-2 h-4 w-4" />
      </Button>
      <Button variant="default" asChild>
        <Link href="/home">Done</Link>
      </Button>
    </div>
  </header>

  <div className="flex-2 bg-accent/30 p-5">
    <Card className="mx-auto w-fit bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        {/* Avatar container */}
        <div className="relative h-80 w-56">
  {/* Clothes: move further down & slightly smaller */}
  {getSelectedImageUrl('clothes') && (
    <Image
      src={getSelectedImageUrl('clothes')}
      alt="Avatar clothes"
      fill
      unoptimized
      className="pixelated object-contain z-10 translate-y-20 scale-85"
      data-ai-hint="pixel art clothes"
    />
  )}

  {/* Face: stays centered */}
  {getSelectedImageUrl('faces') && (
    <Image
      src={getSelectedImageUrl('faces')}
      alt="Avatar faces"
      fill
      unoptimized
      className="pixelated object-contain z-20 -translate-y-[80px]"
      data-ai-hint="pixel art faces"
    />
  )}

  {/* Hair: slightly higher and bigger */}
  {getSelectedImageUrl('hair') && (
    <Image
      src={getSelectedImageUrl('hair')}
      alt="Avatar hair"
      fill
      unoptimized
      className="pixelated object-contain z-30 -translate-y-[80px] scale-105"
      data-ai-hint="pixel art hair"
    />
  )}
</div>

      </CardContent>
    </Card>
  </div>



      <div className="bg-card p-4 h-full">
        <Tabs defaultValue="hair" className="w-full h">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hair">Hair</TabsTrigger>
            <TabsTrigger value="faces">Faces</TabsTrigger>
            <TabsTrigger value="clothes">Clothes</TabsTrigger>
          </TabsList>
          <TabsContent value="hair" className="mt-4">
            <div className="grid grid-cols-4 gap-4">
              {hairAssets.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect("hair", option.id)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    selection.hair === option.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-transparent"
                  )}
                >
                  <Image
                    src={option.imageUrl}
                    alt={option.name}
                    fill
                    unoptimized
                    className="pixelated object-cover"
                    data-ai-hint="pixel art hair"
                  />
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="faces">
             <div className="grid grid-cols-4 gap-4">
              {faceAssets.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect("faces", option.id)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    selection.faces === option.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-transparent"
                  )}
                >
                  <Image
                    src={option.imageUrl}
                    alt={option.name}
                    fill
                    unoptimized
                    className="pixelated object-cover"
                    data-ai-hint="pixel art faces"
                  />
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="clothes">
             <div className="grid grid-cols-4 gap-4">
              {clothesAssets.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect("clothes", option.id)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    selection.clothes === option.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-transparent"
                  )}
                >
                  <Image
                    src={option.imageUrl}
                    alt={option.name}
                    fill
                    unoptimized
                    className="pixelated object-cover"
                    data-ai-hint="pixel art clothes"
                  />
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
