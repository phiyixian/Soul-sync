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
  eyes: string;
  clothes: string;
};

export default function AvatarEditorPage() {
  const [selection, setSelection] = useState<AvatarSelection>({ hair: '', eyes: '', clothes: '' });
  const [hairAssets, setHairAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const [eyeAssets, setEyeAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const [clothesAssets, setClothesAssets] = useState<{id:string; name:string; imageUrl:string}[]>([]);
  const { firestore } = useFirebase();

  // Load assets from Firestore avatarAssets
  useEffect(() => {
    (async () => {
      const base = collection(firestore, 'avatarAssets');
      const [hairSnap, eyeSnap, clothesSnap] = await Promise.all([
        getDocs(query(base, where('type','==','hair'))),
        getDocs(query(base, where('type','==','eyes'))),
        getDocs(query(base, where('type','==','clothes'))),
      ]);
      let hair = hairSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
      let eyes = eyeSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
      let clothes = clothesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any)}));

      // Seed defaults if empty (PixelLab URLs + safe placeholders for clothes)
      if (hair.length === 0 || eyes.length === 0 || clothes.length === 0) {
        const seed: {id:string; type:'hair'|'eyes'|'clothes'|'body'; url:string; name:string;}[] = [];
        // Hair
        seed.push({ id: 'hair-bob-black', type: 'hair', url: 'https://api.pixellab.ai/mcp/isometric-tile/0014a05a-f2e9-4686-ac73-dbf45aba8ba0/download', name: 'Short Bob (Black)'});
        seed.push({ id: 'hair-wavy-brown-bow', type: 'hair', url: 'https://api.pixellab.ai/mcp/isometric-tile/a5c8fb59-dc52-42ab-8c0e-fae05ab3265c/download', name: 'Wavy Brown + Bow'});
        seed.push({ id: 'hair-twintails-pink', type: 'hair', url: 'https://api.pixellab.ai/mcp/isometric-tile/036ef47e-4667-4478-918e-8ad5765fb250/download', name: 'Pink Twin Tails'});
        seed.push({ id: 'hair-spiky-blue', type: 'hair', url: 'https://api.pixellab.ai/mcp/isometric-tile/b12a6472-dd83-47d2-aa50-9d6efb3b5107/download', name: 'Spiky Blue'});
        seed.push({ id: 'hair-afro-brown', type: 'hair', url: 'https://api.pixellab.ai/mcp/isometric-tile/9396517b-65c1-4c70-a292-64ab4a2d3bef/download', name: 'Curly Afro (Brown)'});
        // Eyes
        seed.push({ id: 'eyes-simple-black', type: 'eyes', url: 'https://api.pixellab.ai/mcp/isometric-tile/f8afd9eb-c291-4ef0-9161-d45b03252eb6/download', name: 'Simple Black' });
        seed.push({ id: 'eyes-starry-blue', type: 'eyes', url: 'https://api.pixellab.ai/mcp/isometric-tile/bd269f53-49c6-4818-b359-82df9f08445f/download', name: 'Starry Blue' });
        seed.push({ id: 'eyes-sleepy', type: 'eyes', url: 'https://api.pixellab.ai/mcp/isometric-tile/79a93b69-fd43-462a-ab08-30c9eca280f5/download', name: 'Sleepy' });
        seed.push({ id: 'eyes-cat-green', type: 'eyes', url: 'https://api.pixellab.ai/mcp/isometric-tile/6131f325-7fbf-45ac-9e66-2bb4a1e1f5c1/download', name: 'Cat Green' });
        seed.push({ id: 'eyes-heart-pink', type: 'eyes', url: 'https://api.pixellab.ai/mcp/isometric-tile/73e49178-5b9c-4498-a6c3-835204f0c112/download', name: 'Heart Pink' });
        // Clothes placeholders if none yet
        if (clothes.length === 0) {
          seed.push({ id: 'clothes-hoodie-pink', type: 'clothes', url: 'https://picsum.photos/seed/hoodie-pink/100/100', name: 'Hoodie Pink' });
          seed.push({ id: 'clothes-sailor', type: 'clothes', url: 'https://picsum.photos/seed/sailor/100/100', name: 'Sailor Uniform' });
          seed.push({ id: 'clothes-sweater-mint', type: 'clothes', url: 'https://picsum.photos/seed/sweater-mint/100/100', name: 'Sweater Mint' });
        }
        await seedAvatarAssets(firestore as any, seed);
        const [hairSnap2, eyeSnap2, clothesSnap2] = await Promise.all([
          getDocs(query(base, where('type','==','hair'))),
          getDocs(query(base, where('type','==','eyes'))),
          getDocs(query(base, where('type','==','clothes'))),
        ]);
        hair = hairSnap2.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
        eyes = eyeSnap2.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
        clothes = clothesSnap2.docs.map(d => ({ id: d.id, ...(d.data() as any)}));
      }
      setHairAssets(hair);
      setEyeAssets(eyes);
      setClothesAssets(clothes);
      setSelection({ hair: hair[0]?.id || '', eyes: eyes[0]?.id || '', clothes: clothes[0]?.id || '' });
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
    const options = category === 'hair' ? hairAssets : category === 'eyes' ? eyeAssets : clothesAssets;
    return options.find(o => o.id === selection[category])?.imageUrl;
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
        eyeType: selection.eyes,
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
      <div className="flex-1 bg-accent/30 p-4">
        <Card className="mx-auto w-fit bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative h-48 w-36">
              <Image
                src={getSelectedImageUrl('clothes') || ''}
                alt="Avatar clothes"
                fill
                className="pixelated object-contain"
                data-ai-hint="pixel art character"
              />
              <Image
                src={getSelectedImageUrl('eyes') || ''}
                alt="Avatar eyes"
                fill
                className="pixelated object-contain"
                data-ai-hint="pixel art eyes"
              />
              <Image
                src={getSelectedImageUrl('hair') || ''}
                alt="Avatar hair"
                fill
                className="pixelated object-contain"
                data-ai-hint="pixel art hair"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card p-4">
        <Tabs defaultValue="hair" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hair">Hair</TabsTrigger>
            <TabsTrigger value="eyes">Eyes</TabsTrigger>
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
                    className="pixelated object-cover"
                    data-ai-hint="pixel art hair"
                  />
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="eyes">
             <div className="grid grid-cols-4 gap-4">
              {eyeAssets.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect("eyes", option.id)}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    selection.eyes === option.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-transparent"
                  )}
                >
                  <Image
                    src={option.imageUrl}
                    alt={option.name}
                    fill
                    className="pixelated object-cover"
                    data-ai-hint="pixel art eyes"
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
