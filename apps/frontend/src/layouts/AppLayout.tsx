import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { PageTransition } from "@/components/shared/PageTransition";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />

        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
