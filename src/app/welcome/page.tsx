import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/icons/Logo";

export default function WelcomePage() {
  const welcomeImage = PlaceHolderImages.find((img) => img.id === "welcome-art");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <div className="flex flex-col items-center gap-8">
        <Logo className="h-12 w-auto" />
        
        {welcomeImage && (
          <div className="relative w-64 h-48 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={welcomeImage.imageUrl}
              alt={welcomeImage.description}
              fill
              className="object-cover pixelated"
              data-ai-hint={welcomeImage.imageHint}
              priority
            />
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Close the distance.
          </h1>
          <p className="text-muted-foreground">
            A cute, cozy space for you and your favorite person.
          </p>
        </div>
        
        <div className="flex w-full max-w-xs flex-col gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/login">I Have an Account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
