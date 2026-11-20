import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, dark, ...p }: ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { dark?: boolean }) {
  return <TabsPrimitive.List className={cn("inline-flex h-10 items-center gap-1 rounded p-1", dark ? "bg-ink-700" : "bg-paper border border-line", className)} {...p} />;
}
export function TabsTrigger({ className, dark, ...p }: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { dark?: boolean }) {
  return <TabsPrimitive.Trigger className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded px-3 text-sm font-semibold transition-colors [&_svg]:size-4",
    dark ? "text-paper/60 data-[state=active]:bg-ink data-[state=active]:text-paper" : "text-slate data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-card", className)} {...p} />;
}
export const TabsContent = TabsPrimitive.Content;
