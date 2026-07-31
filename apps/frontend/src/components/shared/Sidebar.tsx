import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import makorLogo from "@/assets/makor-logo.png";
import makorIcon from "@/assets/makor-icon.png";
import { cn } from "@/lib/utils";
import { navigationFor } from "@/config/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { overlayVariants, spring } from "@/lib/motion";

export function Sidebar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);

  return (
    <>
      {/* Poste fixe sur écran large */}
      <div className="hidden lg:block">
        <SidebarPanel />
      </div>

      {/* Tiroir sur mobile — le CDC (§8.4) demande une interface responsive */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={spring}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <SidebarPanel onNavigate={() => setMobileNav(false)} showClose />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarPanel({
  onNavigate,
  showClose,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  const role = useAuthStore((s) => s.user?.role?.name ?? null);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileNav = useUiStore((s) => s.setMobileNav);

  // Sur mobile le tiroir est toujours déployé : replier un panneau qu'on
  // vient d'ouvrir n'aurait pas de sens.
  const isCollapsed = collapsed && !showClose;
  const groups = navigationFor(role);

  return (
    <aside
      className={cn(
        "nav-shell flex h-screen shrink-0 flex-col text-white/90 transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex items-center justify-between px-4 py-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={isCollapsed ? makorIcon : makorLogo}
            alt="MAKOR"
            className={cn("w-auto select-none", isCollapsed ? "h-7" : "h-7")}
            draggable={false}
          />
          {!isCollapsed && (
            <span className="rounded-md border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold uppercase tracking-widest text-white/50">
              CRM
            </span>
          )}
        </div>

        {showClose ? (
          <button
            onClick={() => setMobileNav(false)}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className={cn(
              "rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white",
              isCollapsed && "mx-auto",
            )}
            aria-label={isCollapsed ? "Déployer le menu" : "Replier le menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            {!isCollapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onNavigate}
                  title={isCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-2.5 rounded-[11px] px-3 py-2 text-sm font-medium",
                      "transition-[background-color,color,transform] duration-200 hover:translate-x-[3px] motion-reduce:hover:translate-x-0",
                      isCollapsed && "justify-center px-0",
                      isActive ? "text-white" : "text-white/60 hover:bg-white/[0.07] hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-[11px] bg-gradient-to-r from-wire/20 to-wire/5 ring-1 ring-inset ring-wire/30"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon className="relative z-10 h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="relative z-10 truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
            Passerelle SMS/WhatsApp connectée
          </div>
        </div>
      )}
    </aside>
  );
}
