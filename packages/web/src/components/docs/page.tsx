import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, Menu, X, ArrowUp } from "lucide-react";
import { BrainCloudLogo } from "@/components/brand/logo";
import { Footer } from "@/components/homepage/footer";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { docs } from "@/data/docs";

const ALL_SECTIONS = docs.flatMap((cat) => cat.sections);

/* ── Category icons (emoji as lightweight icons) ── */
const CATEGORY_ICON: Record<string, string> = {
  Guide: "📖",
  "Core Concepts": "🧠",
  "Tools Reference": "🔧",
};

/* ── Sidebar TOC ── */
function TOCContent({
  activeId,
  onSelect,
  onNavigate,
}: {
  activeId: string;
  onSelect?: () => void;
  onNavigate?: (id: string) => void;
}) {
  return (
    <nav aria-label="Table of contents" className="space-y-5 text-[13px]">
      {docs.map((category) => (
        <div key={category.title}>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            <span>{CATEGORY_ICON[category.title] ?? "📄"}</span>
            {category.title}
          </h3>
          <ul className="space-y-px border-l border-border/50 ml-1">
            {category.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate?.(section.id);
                    onSelect?.();
                  }}
                  aria-current={activeId === section.id ? "true" : undefined}
                  className={cn(
                    "block py-1 pl-3 -ml-px border-l-2 transition-colors",
                    activeId === section.id
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingTo = useRef(false);

  // IntersectionObserver for active section tracking
  useEffect(() => {
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

    const timer = setTimeout(() => {
      for (const section of ALL_SECTIONS) {
        const el = sectionRefs.current.get(section.id);
        if (el) observer.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Show "back to top" after scrolling down
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      isScrollingTo.current = true;
      setActiveId(id);
      history.replaceState(null, "", `#${id}`);
      el.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        isScrollingTo.current = false;
      }, 1000);
    }
  }, []);

  const registerRef = useCallback(
    (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(el.id, el);
    },
    []
  );

  // Find the current category for the active section
  const activeCategory = docs.find((cat) =>
    cat.sections.some((s) => s.id === activeId)
  );
  const activeSection = ALL_SECTIONS.find((s) => s.id === activeId);

  return (
    <>
      <Helmet>
        <title>Documentation — Brain Cloud</title>
        <meta
          name="description"
          content="Learn how to use Brain Cloud — persistent AI memory for developers. Complete MCP tools reference, installation guide, and workflow documentation."
        />
        <meta property="og:title" content="Documentation — Brain Cloud" />
        <meta
          property="og:description"
          content="Complete MCP tools reference, installation guide, and workflow documentation for Brain Cloud."
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background">
        {/* ── Header ── */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-foreground hover:text-foreground/80"
              >
                <BrainCloudLogo size={22} variant="full" />
              </Link>
              <span className="hidden text-border sm:inline">/</span>
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                Docs
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="md:hidden h-8 gap-1.5 text-xs"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Menu className="h-3.5 w-3.5" />
                )}
                Menu
              </Button>
              <Link
                to="/"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                Home
              </Link>
            </div>
          </div>
        </header>

        {/* ── Breadcrumb bar (desktop) ── */}
        {activeCategory && activeSection && (
          <div className="hidden border-b border-border/30 bg-muted/30 md:block">
            <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground lg:px-6">
              <span>Docs</span>
              <ChevronRight className="h-3 w-3" />
              <span>{activeCategory.title}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">
                {activeSection.title}
              </span>
            </div>
          </div>
        )}

        {/* ── Mobile TOC overlay ── */}
        {mobileOpen && (
          <div className="fixed inset-0 z-20 md:hidden">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-[57px] bottom-0 w-72 overflow-y-auto border-r bg-background p-5 shadow-lg">
              <TOCContent
                activeId={activeId}
                onSelect={() => setMobileOpen(false)}
                onNavigate={scrollToSection}
              />
            </div>
          </div>
        )}

        {/* ── Main layout ── */}
        <div className="mx-auto flex w-full max-w-7xl flex-1">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-60 shrink-0 border-r border-border/30">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-5 pr-3">
              <TOCContent activeId={activeId} onNavigate={scrollToSection} />
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1 px-5 py-10 md:px-10 lg:px-16">
            <div className="mx-auto max-w-2xl">
              {/* Hero */}
              <div className="mb-12">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Brain Cloud Docs
                </h1>
                <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                  Give your AI a memory. Set up in 2 minutes, then just work
                  normally.
                </p>
              </div>

              {/* Sections grouped by category */}
              {docs.map((category) => (
                <div key={category.title} className="mb-16">
                  {/* Category header */}
                  <div className="mb-8 flex items-center gap-2.5">
                    <span className="text-lg">
                      {CATEGORY_ICON[category.title] ?? "📄"}
                    </span>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {category.title}
                    </h2>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

                  {category.sections.map((section, i) => (
                    <section
                      key={section.id}
                      id={section.id}
                      ref={registerRef}
                      className={cn(
                        "scroll-mt-24",
                        i < category.sections.length - 1 &&
                          "mb-12 pb-12 border-b border-border/30"
                      )}
                    >
                      <Markdown content={section.content} size="base" />
                    </section>
                  ))}
                </div>
              ))}
            </div>
          </main>
        </div>

        {/* ── Back to top FAB ── */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className={cn(
            "fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md transition-all hover:bg-muted",
            showBackToTop
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0 pointer-events-none"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>

        <Footer />
      </div>
    </>
  );
}
