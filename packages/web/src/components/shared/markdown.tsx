import { memo, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark-dimmed.css";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";
import { remarkSmartLinks } from "@/lib/remark-smart-links";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy code"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ language, children }: { language?: string; children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const getCode = () => preRef.current?.querySelector("code")?.textContent ?? "";

  return (
    <div className="group relative rounded-md border border-border bg-muted overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground font-mono">{language || "text"}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={getCode()} />
        </span>
      </div>
      <pre
        ref={preRef}
        className="overflow-x-auto max-h-96 overflow-y-auto p-3 !m-0 !bg-transparent !border-0"
      >
        {children}
      </pre>
    </div>
  );
}

interface MarkdownProps {
  content: string;
  className?: string;
  /** Compact mode: smaller text, tighter spacing */
  compact?: boolean;
  /** Prose size: 'sm' (default), 'base' for docs/long-form content */
  size?: "sm" | "base";
  /** GitHub repo URL for smart linking (#123 → issues) */
  repoUrl?: string;
  /** Max height with overflow scroll */
  maxHeight?: string;
}

export const Markdown = memo(function Markdown({
  content,
  className,
  compact = false,
  size = "sm",
  repoUrl,
  maxHeight,
}: MarkdownProps) {
  if (!content) return null;

  const remarkPlugins: Parameters<typeof ReactMarkdown>[0]["remarkPlugins"] = [remarkGfm];
  if (repoUrl) {
    remarkPlugins.push([remarkSmartLinks, { repoUrl }]);
  }

  return (
    <div
      className={cn(
        "prose max-w-none",
        size === "sm" && "prose-sm",
        size === "base" && "prose-base",
        compact && "prose-compact",
        className,
      )}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          pre(props) {
            const preProps = props as { children?: React.ReactNode; className?: string };
            const child = preProps.children as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }> | undefined;

            if (child && typeof child === "object" && "props" in child) {
              const codeClassName = child.props.className || "";
              const langMatch = /language-(\w+)/.exec(codeClassName);
              const lang = langMatch?.[1];
              const codeStr = String(child.props.children ?? "").replace(/\n$/, "");

              if (lang === "mermaid") {
                return <MermaidBlock code={codeStr} />;
              }

              return (
                <CodeBlock language={lang}>
                  {child}
                </CodeBlock>
              );
            }

            return <pre>{preProps.children}</pre>;
          },
          code(props) {
            const codeProps = props as {
              className?: string;
              children?: React.ReactNode;
            };
            // Inline code only — block code handled by pre above
            return (
              <code className={codeProps.className}>
                {codeProps.children}
              </code>
            );
          },
          a(props) {
            const aProps = props as {
              href?: string;
              children?: React.ReactNode;
            };
            return (
              <a target="_blank" rel="noopener noreferrer" href={aProps.href}>
                {aProps.children}
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
