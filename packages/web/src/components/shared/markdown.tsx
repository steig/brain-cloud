import { memo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

function getMermaidTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "neutral";
}

mermaid.initialize({
  startOnLoad: false,
  theme: getMermaidTheme(),
  securityLevel: "loose",
  themeVariables: {
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "14px",
  },
});

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Re-init with correct theme before rendering
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
      securityLevel: "loose",
      themeVariables: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "14px",
      },
    });
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

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center rounded-lg border border-border/40 bg-card/50 p-4 overflow-x-auto"
    />
  );
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
        "prose max-w-none",
        size === "sm" && "prose-sm",
        size === "base" && "prose-base",
        compact && "prose-compact",
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
