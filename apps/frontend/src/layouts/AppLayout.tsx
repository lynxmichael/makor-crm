import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { TwoFactorBanner } from "@/components/shared/TwoFactorBanner";

export function AppLayout() {
  return (
    // `app-ambient` porte les deux dégradés radiaux du fond de la maquette.
    <div className="app-ambient relative flex min-h-screen bg-bg">
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
          <TwoFactorBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
