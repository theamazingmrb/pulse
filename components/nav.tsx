"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, BookOpen, CheckSquare, Compass, Play, Pause, Menu, X, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotify } from "@/lib/spotify-context";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/checkin", label: "Check-in", icon: Compass },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export default function Nav() {
  const path = usePathname();
  const { currentTrack, isPlaying, playerReady, playTrack, pause } = useSpotify();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Mobile top header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <span className="text-primary font-bold text-sm tracking-tight">Priority</span>
          <span className="text-foreground font-bold text-sm tracking-tight"> Compass</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Backdrop overlay (mobile only) */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-56 border-r border-border bg-card flex flex-col py-8 px-4 z-50",
          "transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <button
          className="md:hidden absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>

        <div className="mb-8 px-3">
          <span className="text-primary font-bold text-base tracking-tight">Priority</span>
          <span className="text-foreground font-bold text-base tracking-tight"> Compass</span>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                path === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          {user && (
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium truncate">{user.user_metadata?.name || user.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <LogOut size={14} className="mr-2" />
                Sign Out
              </Button>
            </div>
          )}
          {currentTrack && playerReady && (
            <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
              <div className="flex items-center gap-2">
                {currentTrack.album_art && (
                  <Image
                    src={currentTrack.album_art}
                    alt={currentTrack.name}
                    width={36}
                    height={36}
                    className="rounded flex-shrink-0"
                  />
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
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">Stay focused. Stay fluid.</p>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
