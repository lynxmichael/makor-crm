import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { QueryProvider } from "@/providers/QueryProvider";
import App from "./App";
import "./index.css";

// La session vit dans le store Zustand persisté (`store/auth.store.ts`), qui
// se réhydrate seul : il n'y a plus de fournisseur d'authentification à
// monter ici.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>,
);
