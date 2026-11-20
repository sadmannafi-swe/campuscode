import { BookOpen, Code2, Home, ListChecks, User } from "lucide-react";
import type { MessageKey } from "@/i18n/en";

export const NAV_ITEMS: { to: string; key: MessageKey; icon: typeof Home; match: (p: string) => boolean }[] = [
  { to: "/", key: "nav.home", icon: Home, match: (p) => p === "/" },
  { to: "/learn", key: "nav.learn", icon: BookOpen, match: (p) => p.startsWith("/learn") || p.startsWith("/practice") },
  { to: "/ide", key: "nav.ide", icon: Code2, match: (p) => p.startsWith("/ide") },
  { to: "/problems", key: "nav.problems", icon: ListChecks, match: (p) => p.startsWith("/problems") || p.startsWith("/submissions") },
  { to: "/profile", key: "nav.profile", icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/snippets") },
];
