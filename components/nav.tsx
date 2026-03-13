"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, CheckSquare, Compass, Play, Pause, LogOut, User, Music, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotify } from "@/lib/spotify-context";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/checkin", label: "Check-in", icon: Compass },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/playlist", label: "Playlist", icon: Music },
];

export default function Nav() {
  const path = usePathname();
  const { currentTrack, isPlaying, playerReady, playTrack, pause } = useSpotify();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-border bg-card py-8 z-50 transition-all duration-300",
        collapsed ? "w-16 px-2" : "w-56 px-4"
      )}>
        {/* Logo / Toggle */}
        <div className="mb-8 px-3 flex items-center justify-between">
          {!collapsed && (
            <div>
              <span className="text-primary font-bold text-base tracking-tight">Priority</span>
              <span className="text-foreground font-bold text-base tracking-tight"> Compass</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                path === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} />
              {!collapsed && label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          {user && !collapsed && (
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium truncate">{user.user_metadata?.name || user.email}</span>
              </div>
              <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-xs">
                <LogOut size={14} className="mr-2" />
                Sign Out
              </Button>
            </div>
          )}
          {currentTrack && playerReady && !collapsed && (
            <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
              <div className="flex items-center gap-2">
                {currentTrack.album_art && (
                  <Image src={currentTrack.album_art} alt={currentTrack.name} width={36} height={36} className="rounded flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{currentTrack.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
                <button
                  onClick={isPlaying ? pause : () => playTrack(currentTrack)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>
          )}
          {!collapsed && (
            <div className="flex items-center justify-between px-2">
              <p className="text-xs text-muted-foreground">Stay focused. Stay fluid.</p>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-card flex items-stretch">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              path === href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={path === href ? 2.5 : 1.75} />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
