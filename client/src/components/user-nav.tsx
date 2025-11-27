import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import { Link } from "wouter";
import type { User as UserType } from "@shared/schema";

interface UserNavProps {
  user: UserType | undefined;
}

export function UserNav({ user }: UserNavProps) {
  if (!user) return null;

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.email?.[0]?.toUpperCase() || "U";

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email || "Kullanıcı";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full"
          data-testid="button-user-menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.profileImageUrl || undefined}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="text-user-name">
              {displayName}
            </p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/ayarlar">
          <DropdownMenuItem className="cursor-pointer" data-testid="link-settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Ayarlar</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <a href="/api/logout">
          <DropdownMenuItem className="cursor-pointer text-destructive" data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Çıkış Yap</span>
          </DropdownMenuItem>
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
