import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";

export default function WelcomePage() {
  // Use a single, larger sprite to emphasize the cute long-distance vibe
  const largeSprite = "https://backblaze.pixellab.ai/file/pixellab-characters/96b81c43-7069-4815-899c-5fe6dab89911/a175e305-6ebf-4ee4-b812-f54a102e15f3/rotations/south.png";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-accent/20 p-8 text-center">
      <div className="flex flex-col items-center gap-8">
        <Logo className="h-12 w-auto" />

        <div className="relative w-[420px] h-[280px] rounded-3xl bg-card/80 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src={largeSprite} alt="cute pixel character" width={192} height={192} className="pixelated" />
          </div>
          {/* floating hearts */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-6 -translate-x-1/2 animate-bounce text-primary/80">💖</div>
            <div className="absolute left-[35%] top-10 animate-[bounce_2s_infinite_200ms] text-rose-400/80">💗</div>
            <div className="absolute left-[65%] top-12 animate-[bounce_2s_infinite_400ms] text-pink-500/80">💞</div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Soulsync — Close the Distance</h1>
          <p className="text-muted-foreground">Cute pixel vibes for long‑distance love.</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button size="lg" className="rounded-2xl" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" className="rounded-2xl" variant="secondary" asChild>
            <Link href="/login">I Have an Account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
