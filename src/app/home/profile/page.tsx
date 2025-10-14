import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Heart, Edit, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary">
          <AvatarImage src="https://picsum.photos/seed/my-avatar/200/200" data-ai-hint="pixel art avatar" />
          <AvatarFallback>YOU</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Cutiepie</h1>
          <p className="text-muted-foreground">Linked with: MyLove</p>
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
          <Button variant="ghost" className="w-full justify-start gap-3" asChild>
            <Link href="/home/avatar-editor">
                <Edit className="h-5 w-5" />
                Edit Partner's Avatar
            </Link>
          </Button>
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full justify-start gap-3 text-primary hover:text-primary">
            <Heart className="h-5 w-5" />
            Link with Partner
          </Button>
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive" asChild>
            <Link href="/welcome">
              <LogOut className="h-5 w-5" />
              Log Out
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>About SoulSync</CardTitle>
            <CardDescription>Version 1.0.0</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Made with love for you and yours.</p>
        </CardContent>
      </Card>
    </div>
  );
}
