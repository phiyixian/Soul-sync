import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shopItems } from "@/lib/data";
import { Gem } from "lucide-react";

export default function ShopPage() {
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Shop</h1>
          <p className="text-muted-foreground">Spoil your partner with cute gifts!</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2">
            <Gem className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg text-primary-foreground">500</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {shopItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="p-0">
                <div className="aspect-square bg-accent/50 w-full relative">
                    <Image 
                        src={item.image.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-4 pixelated"
                        data-ai-hint={item.image.imageHint}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 pb-2">
                <CardTitle className="text-base">{item.name}</CardTitle>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full">
                <Gem className="mr-2 h-4 w-4" />
                {item.price}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
