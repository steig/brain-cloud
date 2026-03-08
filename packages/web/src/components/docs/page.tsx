import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Menu, X } from "lucide-react";
import { BrainCloudLogo } from "@/components/brand/logo";
import { Footer } from "@/components/homepage/footer";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { docs } from "@/data/docs";

const ALL_SECTIONS = docs.flatMap((cat) => cat.sections);

function handleTocClick(e: React.MouseEvent<HTMLAnchorElement>, onSelect?: () => void) {
  const href = e.currentTarget.getAttribute("href");
  if (href?.startsWith("#")) {
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
  onSelect?.();
}

function TOCContent({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect?: () => void;
}) {
  return (
    <nav aria-label="Table of contents" className="space-y-4 text-sm">
      {docs.map((category) => (
        <div key={category.title}>
          <h3 className="mb-1 font-semibold text-foreground">
            {category.title}
          </h3>
          <ul className="space-y-0.5">
            {category.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleTocClick(e, onSelect)}
                  aria-current={activeId === section.id ? "true" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1 transition-colors hover:text-foreground",
                    activeId === section.id
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsPage() {
  const location = useLocation();
  const [activeId, setActiveId] = useState(() => {
    const hash = location.hash.replace("#", "");
    return hash || ALL_SECTIONS[0]?.id || "";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingTo = useRef(false);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const sections = ALL_SECTIONS;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            history.replaceState(null, "", `#${entry.target.id}`);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    // Small delay to ensure refs are populated
    const timer = setTimeout(() => {
      for (const section of sections) {
        const el = sectionRefs.current.get(section.id);
        if (el) observer.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Scroll to hash on mount
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      const timer = setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          isScrollingTo.current = true;
          el.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => {
            isScrollingTo.current = false;
          }, 1000);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  // Close mobile TOC on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const registerRef = useCallback(
    (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(el.id, el);
    },
    []
  );

  return (
    <>
      <Helmet>
        <title>Documentation — Brain Cloud</title>
        <meta
          name="description"
          content="Learn how to use Brain Cloud — persistent AI memory for developers. Complete MCP tools reference, installation guide, and workflow documentation."
        />
        <meta property="og:title" content="Documentation — Brain Cloud" />
        <meta property="og:description" content="Complete MCP tools reference, installation guide, and workflow documentation for Brain Cloud." />
      </Helmet>

      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-foreground hover:text-foreground/80"
            >
              <BrainCloudLogo size={24} variant="full" />
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
                <span className="ml-1">On this page</span>
              </Button>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile TOC overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-20 md:hidden">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-[57px] bottom-0 w-72 overflow-y-auto border-r bg-background p-4">
              <TOCContent
                activeId={activeId}
                onSelect={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="mx-auto flex w-full max-w-6xl flex-1">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto p-4 pr-2">
              <TOCContent activeId={activeId} />
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1 px-4 py-8 md:px-8 md:py-10">
            <div className="mx-auto max-w-3xl">
              <h1 className="mb-2 text-3xl font-bold tracking-tight">Brain Cloud Docs</h1>
              <p className="mb-10 text-lg text-muted-foreground">Give your AI a memory. Set up in 2 minutes, then just work normally.</p>
              {docs.map((category) =>
                category.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    ref={registerRef}
                    className="scroll-mt-20 pb-12"
                  >
                    <Markdown content={section.content} />
                  </section>
                ))
              )}
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
}
