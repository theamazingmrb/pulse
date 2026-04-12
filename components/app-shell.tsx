"use client";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/lib/sidebar-context";
import Nav from "./nav";
import { NotificationPrompt } from "./notification-prompt";

// Pages that should render without the nav sidebar
const NO_NAV_PATHS = ["/", "/signin", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const showNav = !NO_NAV_PATHS.includes(path);
  const { collapsed } = useSidebar();
  
  // Show notification prompt on check-in page for first-time users
  const showNotificationPrompt = path === "/checkin";

  return (
    <div className="flex min-h-screen">
      {showNav && <Nav />}
      <main
        className={
          showNav
            ? // App pages: sidebar offset on desktop, bottom-nav padding on mobile
              `flex-1 p-4 md:p-8 pb-28 md:pb-8 flex justify-center overflow-x-hidden transition-all duration-300 ${
                collapsed ? "md:ml-16" : "md:ml-56"
              }`
            : // Auth / landing pages: full width, no extra padding (each page controls its own layout)
              "flex-1"
        }
      >
        <div className={showNav ? "w-full max-w-4xl" : "w-full"}>
          {children}
        </div>
      </main>
      
      {/* Notification permission prompt */}
      {showNotificationPrompt && (
        <NotificationPrompt showOnFirstCheckin={true} />
      )}
    </div>
  );
}
