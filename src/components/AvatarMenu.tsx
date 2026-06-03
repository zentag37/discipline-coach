import { User as UserIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TEAL = "#00d4a0";

async function signOutAndRedirect() {
  try { await supabase.auth.signOut(); } catch {}
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  window.location.href = "/login";
}

export function AvatarMenu({ initials }: { initials: string }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs hover:opacity-90 transition-opacity"
          style={{ background: "rgba(0,212,160,0.15)", color: TEAL }}
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 z-[100]"
        style={{ background: "#1a1f29", border: "1px solid rgba(255,255,255,0.08)", color: "#e6e8eb" }}
      >
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="cursor-pointer">
          <UserIcon size={14} className="mr-2" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="cursor-pointer">
          <SettingsIcon size={14} className="mr-2" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
        <DropdownMenuItem onClick={signOutAndRedirect} className="cursor-pointer" style={{ color: "#ef4444" }}>
          <LogOut size={14} className="mr-2" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
