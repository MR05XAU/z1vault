import { NavLink } from "react-router-dom";
import { Home, BookOpen, Sparkles, BookMarked, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const baseItems = [
  { to: "/vault", label: "Vault", icon: Home },
  { to: "/library", label: "Book", icon: BookOpen },
  { to: "/tutor", label: "Tutor", icon: Sparkles },
  { to: "/notebook", label: "Notes", icon: BookMarked },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
];

export function BottomNav() {
  const { isAdmin } = useAuth();
  const items = isAdmin ? [...baseItems, { to: "/admin", label: "Admin", icon: ShieldCheck }] : baseItems;
  return (
    <nav className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-around shadow-lift">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl press min-w-[52px]",
              isActive
                ? "text-gold-bright"
                : "text-muted-foreground hover:text-foreground/80"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isActive && "bg-gold/15 shadow-glow"
                )}
              >
                <Icon className="size-[18px]" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}