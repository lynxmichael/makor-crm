import { NavLink } from "react-router-dom";

import makorLogo from "@/assets/makor-logo.png";
import { navigationForRole } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Barre latérale conditionnée par rôle.
 *
 * Les modules et leurs rôles autorisés viennent de `config/navigation.ts`,
 * transcription des `data-roles` de la maquette. L'apparence — dégradé,
 * liseré orange de l'élément actif, décalage au survol — vient des classes
 * `sidebar-surface` et `navitem` portées dans `index.css`.
 */
export function Sidebar() {
  const { role } = useAuth();

  if (!role) return null;

  const groups = navigationForRole(role);

  return (
    <aside
      className="sidebar-surface flex h-screen w-64 shrink-0 flex-col text-sidebar-text"
      aria-label="Navigation principale"
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <img
          src={makorLogo}
          alt="MAKOR Group Telecom"
          className="h-8 w-auto select-none"
          draggable={false}
        />
        <div>
          <p className="font-display text-sm font-extrabold tracking-[0.04em] text-white">
            MAKOR CRM
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            CRM Enterprise
          </p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto pb-6" aria-label="Modules">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="navgroup-label">{group.label}</p>
            {group.modules.map(({ id, path, label, icon: Icon, badge }) => (
              <NavLink key={id} to={path} end={path === "/"} className="navitem">
                <Icon aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-white/70">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[10px] leading-relaxed text-white/45">
          MAKOR CRM — v0.1
          <br />
          Usage interne
        </p>
      </div>
    </aside>
  );
}
