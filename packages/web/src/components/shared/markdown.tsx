import { memo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (ref.current) ref.current.textContent = code;
      });
  }, [code]);

  return <div ref={ref} className="my-4 flex justify-center" />;
}

interface MarkdownProps {
  content: string;
  className?: string;
  /** Compact mode: smaller text, tighter spacing */
  compact?: boolean;
  /** Prose size: 'sm' (default), 'base' for docs/long-form content */
  size?: "sm" | "base";
}

export const Markdown = memo(function Markdown({
  content,
  className,
  compact = false,
  size = "sm",
}: MarkdownProps) {
  if (!content) return null;

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        size === "sm" && "prose-sm",
        size === "base" && [
          "prose-base prose-p:leading-7 prose-p:my-5",
          "prose-headings:mt-10 prose-headings:mb-4",
          // Lists: indented, spaced, with visible markers
          "prose-ul:my-5 prose-ul:pl-6 prose-ol:my-5 prose-ol:pl-6 prose-li:my-1.5",
          // Blockquotes: accent border, background tint
          "prose-blockquote:my-6 prose-blockquote:pl-5 prose-blockquote:py-1 prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-md prose-blockquote:italic",
          "prose-pre:my-6",
          "prose-hr:my-10",
        ].join(" "),
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-normal",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-img:rounded-md",
        // Tables: borders, padding, striped header
        "prose-table:text-sm prose-table:my-6 prose-table:border prose-table:border-border prose-table:rounded-md prose-table:overflow-hidden",
        "prose-th:text-left prose-th:font-medium prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:border-b prose-th:border-border",
        "prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border/50",
        compact && "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const lang = match?.[1];
            const codeStr = String(children).replace(/\n$/, "");

            if (lang === "mermaid") {
              return <MermaidBlock code={codeStr} />;
            }

            // Inline code (no language class)
            if (!lang) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }

            // Code block
            return (
              <pre className="overflow-x-auto">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Open links in new tab
          a({ children, ...props }) {
            return (
              <a target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
