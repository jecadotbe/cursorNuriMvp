import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, Users, GraduationCap, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useUser();

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: Users, label: "Village", href: "/village" },
    { icon: GraduationCap, label: "Learn", href: "/learn" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
      <nav className="flex justify-between items-center px-4 py-2">
        {items.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href}>
            <a
              className={cn(
                "flex flex-col items-center gap-1 p-2",
                location === href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </a>
          </Link>
        ))}
        <Link href="/profile">
          <a
            className={cn(
              "flex flex-col items-center gap-1 p-2",
              location === "/profile"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {user?.username[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">Lucia</span>
          </a>
        </Link>
      </nav>
    </div>
  );
}
