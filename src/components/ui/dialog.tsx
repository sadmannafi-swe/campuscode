import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useI18n } from "@/i18n";

export function Dialog({ open, onOpenChange, title, description, children, footer, dark, size = "md" }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode;
  children?: ReactNode; footer?: ReactNode; dark?: boolean; size?: "sm" | "md" | "lg";
}) {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-lg border p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-lift",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-6",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:zoom-in-95",
            size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
            dark ? "border-ink-600 bg-ink-800 text-paper" : "border-line bg-white text-ink",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-heading text-lg font-bold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className={cn("mt-1 text-sm", dark ? "text-paper/60" : "text-slate")}>{description}</DialogPrimitive.Description>
              ) : <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : ""}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant={dark ? "ghost-dark" : "ghost"} size="icon-sm" aria-label={t("common.close")}><X /></Button>
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, onConfirm, danger, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; body?: ReactNode;
  confirmLabel?: string; onConfirm: () => void; danger?: boolean; loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={body} size="sm"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button variant={danger ? "danger" : "ink"} onClick={onConfirm} loading={loading}>{confirmLabel ?? t("common.confirm")}</Button>
      </>} />
  );
}
