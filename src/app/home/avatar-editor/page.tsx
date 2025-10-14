"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { avatarOptions, AvatarOption } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

type AvatarSelection = {
  hair: string;
  eyes: string;
  clothes: string;
};

export default function AvatarEditorPage() {
  const [selection, setSelection] = useState<AvatarSelection>({
    hair: avatarOptions.hair[0].id,
    eyes: avatarOptions.eyes[0].id,
    clothes: avatarOptions.clothes[0].id,
  });

  const handleSelect = (category: keyof AvatarSelection, id: string) => {
    setSelection((prev) => ({ ...prev, [category]: id }));
  };

  const getSelectedImage = (category: keyof AvatarSelection) => {
    const options = avatarOptions[category] as AvatarOption[];
    return options.find((opt) => opt.id === selection[category])?.image;
  };
  
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/home/profile"><ArrowLeft /></Link>
        </Button>
        <h1 className="text-lg font-bold">Create Your Partner's Avatar</h1>
        <Button variant="primary" asChild>
          <Link href="/home">Done <Check className="ml-2 h-4 w-4" /></Link>
        </Button>
      </header>
      <div className="flex-1 bg-accent/30 p-4">
        <Card className="mx-auto w-fit bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative h-48 w-36">
              <Image
                src={avatarOptions.clothes.find(c => c.id === selection.clothes)!.image.imageUrl}
                alt="Avatar clothes"
                fill
                className="pixelated object-contain"
                data-ai-hint="pixel art character"
              />
              <Image
                src={avatarOptions.eyes.find(e => e.id === selection.eyes)!.image.imageUrl}
                alt="Avatar eyes"
                fill
                className="pixelated object-contain"
                data-ai-hint="pixel art eyes"
              />
              <Image
                src={avatarOptions.hair.find(h => h.id === selection.hair)!.image.imageUrl}
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
              {avatarOptions.hair.map((option) => (
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
                    src={option.image.imageUrl}
                    alt={option.image.description}
                    fill
                    className="pixelated object-cover"
                    data-ai-hint={option.image.imageHint}
                  />
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="eyes">
             <div className="grid grid-cols-4 gap-4">
              {avatarOptions.eyes.map((option) => (
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
                    src={option.image.imageUrl}
                    alt={option.image.description}
                    fill
                    className="pixelated object-cover"
                    data-ai-hint={option.image.imageHint}
                  />
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="clothes">
             <div className="grid grid-cols-4 gap-4">
              {avatarOptions.clothes.map((option) => (
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
                    src={option.image.imageUrl}
                    alt={option.image.description}
                    fill
                    className="pixelated object-cover"
                    data-ai-hint={option.image.imageHint}
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
