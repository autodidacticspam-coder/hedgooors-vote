"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/app/actions/auth";
import {
  Settings,
  LogOut,
  EyeOff,
  Sparkles,
  Users,
  List,
  History,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

interface NavbarProps {
  user: { email?: string } | null;
  profile: Profile | null;
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/polls", label: "Polls", icon: List },
    { href: "/my-polls", label: "My Polls", icon: History },
    { href: "/community", label: "Community", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isAdmin = profile?.is_admin || false;

  if (!user) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Hedgooors Vote
          </Link>
          <Link href="/">
            <Button>Sign In</Button>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/polls" className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Hedgooors Vote
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2",
                  pathname === item.href && "bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/polls">
              <Button
                variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2",
                  pathname.startsWith("/admin") && "bg-secondary"
                )}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {profile?.is_anonymous && (
            <Badge variant="outline" className="gap-1">
              <EyeOff className="w-3 h-3" />
              Anonymous
            </Badge>
          )}
          <span className="text-sm text-muted-foreground hidden md:block">
            {profile?.display_name || user.email?.split("@")[0]}
          </span>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
