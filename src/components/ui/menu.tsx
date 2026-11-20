import type { ReactNode } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export function Menu({ trigger, children, align = "end", dark }: { trigger: ReactNode; children: ReactNode; align?: "start" | "end"; dark?: boolean }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content align={align} sideOffset={6}
          className={cn("z-50 min-w-[200px] rounded-md border p-1 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0",
            dark ? "border-ink-600 bg-ink-800 text-paper" : "border-line bg-white text-ink")}>
          {children}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function MenuItem({ children, onSelect, danger, disabled, dark }: { children: ReactNode; onSelect?: () => void; danger?: boolean; disabled?: boolean; dark?: boolean }) {
  return (
    <DM.Item onSelect={onSelect} disabled={disabled}
      className={cn("flex cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-2 text-sm outline-none [&_svg]:size-4",
        dark ? "data-[highlighted]:bg-ink-700" : "data-[highlighted]:bg-paper",
        danger && "text-error", disabled && "pointer-events-none opacity-50")}>
      {children}
    </DM.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="eyebrow px-2.5 py-1.5">{children}</DM.Label>;
}

export function MenuSeparator({ dark }: { dark?: boolean }) {
  return <DM.Separator className={cn("my-1 h-px", dark ? "bg-ink-600" : "bg-line")} />;
}
