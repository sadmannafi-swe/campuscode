import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/** Renders trusted course/problem markdown. Raw HTML is not rendered (react-markdown default). */
export function Markdown({ children, dark, className }: { children: string; dark?: boolean; className?: string }) {
  return (
    <div className={cn("prose-cc", dark && "prose-dark", className)}>
      <ReactMarkdown
        components={{
          a: ({ href, children: c }) => <a href={href} target="_blank" rel="noopener noreferrer">{c}</a>,
          table: ({ children: c }) => <div className="overflow-x-auto"><table>{c}</table></div>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
