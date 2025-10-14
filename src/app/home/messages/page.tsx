import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function MessagesPage() {
  const messages = [
    { from: "partner", text: "Thinking of you! 🥰" },
    { from: "me", text: "Aww, me too! What are you up to?" },
    { from: "partner", text: "Just chilling, about to eat. You?" },
  ];

  return (
    <div className="flex h-full flex-col p-4">
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Messages with your love</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto">
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-2 ${msg.from === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
        </CardContent>
        <Separator />
        <div className="p-4">
            <div className="flex w-full items-center space-x-2">
                <Input type="text" placeholder="Type a message..." className="flex-1" />
                <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
}
