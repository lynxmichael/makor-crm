import { Outlet } from "react-router-dom";

/** Écran nu : pages d'erreur, impressions, vues sans navigation. */
export function BlankLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <Outlet />
    </div>
  );
}
