"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statuses } from "@/lib/data";
import type { Status } from "@/lib/data";
import { Heart, Send, MessageCircle } from "lucide-react";
import { PixelHeartIcon } from "@/components/icons/PixelHeartIcon";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Kiss = {
  id: number;
};

export default function HomePage() {
  const [partnerStatus, setPartnerStatus] = useState<Status>(statuses[0]);
  const [myStatus, setMyStatus] = useState<Status["id"]>("idle");
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const { toast } = useToast();

  const handleStatusChange = (statusId: Status["id"]) => {
    setMyStatus(statusId);
    toast({
      title: "Status Updated!",
      description: `Your partner will now see you as: ${
        statuses.find((s) => s.id === statusId)?.label
      }`,
    });
  };

  const sendKiss = () => {
    const newKiss = { id: Date.now() };
    setKisses((prev) => [...prev, newKiss]);
    setTimeout(() => {
      setKisses((prev) => prev.filter((k) => k.id !== newKiss.id));
    }, 1500);

    toast({
      title: "💕 Smooch! 💕",
      description: "You sent a kiss to your partner!",
    });
  };

  const sendHug = () => {
     toast({
      title: "🤗 Hugs! 🤗",
      description: "You sent a hug to your partner!",
    });
  }

  return (
    <div className="relative flex h-full flex-col bg-accent/30 p-4">
      <header className="flex items-center justify-between rounded-lg bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-sm text-muted-foreground">My Status:</p>
          <Select onValueChange={handleStatusChange} defaultValue={myStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Set your status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">Partner's Room</p>
          <p className="text-xs text-muted-foreground">Is currently {partnerStatus.label}</p>
        </div>
      </header>

      <div className="relative flex-1 flex items-center justify-center my-4">
        <div className="relative w-[300px] h-[400px]">
          <Image
            src={partnerStatus.image.imageUrl}
            alt={partnerStatus.description}
            width={300}
            height={400}
            className="pixelated object-contain"
            data-ai-hint={partnerStatus.image.imageHint}
          />
           {kisses.map((kiss) => (
            <div key={kiss.id} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PixelHeartIcon className="w-16 h-16 text-primary/80 animate-heart-float" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 rounded-lg bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <Button variant="outline" size="lg" className="h-16 w-16 rounded-full flex-col gap-1" onClick={sendHug}>
            <Heart className="w-7 h-7" />
            <span className="text-xs">Hug</span>
        </Button>
        <Button variant="primary" size="lg" className="h-20 w-20 rounded-full flex-col gap-1 shadow-lg" onClick={sendKiss}>
            <PixelHeartIcon className="w-8 h-8"/>
            <span className="text-sm font-bold">Kiss</span>
        </Button>
        <Button variant="outline" size="lg" className="h-16 w-16 rounded-full flex-col gap-1">
            <MessageCircle className="w-7 h-7" />
            <span className="text-xs">Msg</span>
        </Button>
      </div>

    </div>
  );
}
