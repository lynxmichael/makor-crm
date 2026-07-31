import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

/**
 * Toaster aux couleurs MAKOR.
 *
 * La version shadcn d'origine lisait des variables (--popover, --radius) qui
 * n'existent pas dans ce système de design, et dépendait de next-themes sans
 * que son provider soit monté : les toasts s'affichaient sans style.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      duration={5000}
      icons={{
        success: <CircleCheckIcon className="size-4 text-signal" />,
        info: <InfoIcon className="size-4 text-wire" />,
        warning: <TriangleAlertIcon className="size-4 text-amber" />,
        error: <OctagonXIcon className="size-4 text-alert" />,
        loading: <Loader2Icon className="size-4 animate-spin text-slate" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface !border !border-line !text-ink !rounded-xl !shadow-lg !font-body !text-sm",
          description: "!text-slate",
          actionButton: "!bg-wire !text-white",
          cancelButton: "!bg-paper !text-slate",
          closeButton: "!bg-surface !border-line !text-slate",
        },
      }}
      {...props}
    />
  );
}
