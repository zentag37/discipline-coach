import { User as UserIcon, RefreshCcw, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const TEAL = "#ef4444";

async function clearAndRedirect() {
  try { await supabase.auth.signOut(); } catch {}
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  window.location.href = "/login";
}

export function SidebarUserMenu({ initials, firstName }: { initials: string; firstName: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 flex-1 min-w-0 rounded-md p-1 -m-1 hover:bg-white/5 transition-colors text-left">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", color: TEAL }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate" style={{ color: "#e6e8eb" }}>{firstName}</div>
              <div className="text-[10px]" style={{ color: "#6b7280" }}>Account menu</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-48 z-[100]"
          style={{ background: "#1a1f29", border: "1px solid rgba(255,255,255,0.08)", color: "#e6e8eb" }}
        >
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="cursor-pointer">
            <UserIcon size={14} className="mr-2" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={clearAndRedirect} className="cursor-pointer">
            <RefreshCcw size={14} className="mr-2" /> Switch account
          </DropdownMenuItem>
          <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.08)" }} />
          <DropdownMenuItem onClick={clearAndRedirect} className="cursor-pointer" style={{ color: "#ef4444" }}>
            <LogOut size={14} className="mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button onClick={clearAndRedirect} className="text-[10px] hover:underline" style={{ color: "#6b7280" }}>
        Sign out
      </button>
    </div>
  );
}
