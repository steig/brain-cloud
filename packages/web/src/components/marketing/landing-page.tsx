import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { BrainCloudLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/config";
import {
  Search,
  Sparkles,
  GitFork,
  Users,
  Github,
  Download,
  Brain,
  Cloud,
  Zap,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  {
    icon: Search,
    title: "Search & Recall",
    description:
      "Instantly find past decisions, context, and insights across all your AI sessions. Never lose a breakthrough idea again.",
  },
  {
    icon: Sparkles,
    title: "AI Coaching",
    description:
      "Get personalized coaching insights generated from your work patterns, decision quality, and productivity trends.",
  },
  {
    icon: GitFork,
    title: "Decision Tracking",
    description:
      "Record decisions with full context — options considered, rationale, and outcomes. Review them later to learn what worked.",
  },
  {
    icon: Users,
    title: "Teams",
    description:
      "Share knowledge across your team. Hand off context between sessions, projects, and people without losing signal.",
  },
  {
    icon: Github,
    title: "GitHub Integration",
    description:
      "Connect your repositories and import activity. Link commits, PRs, and issues to your decisions and insights.",
  },
  {
    icon: Download,
    title: "Data Export",
    description:
      "Own your data completely. Export everything as JSON or CSV at any time. No lock-in, no restrictions.",
  },
];

const STEPS = [
  {
    icon: Cloud,
    step: "1",
    title: "Install the MCP Server",
    description:
      "Add Brain Cloud to your Claude setup with a single config change. Works with Claude Code, Claude Desktop, and any MCP-compatible client.",
  },
  {
    icon: Zap,
    step: "2",
    title: "Work Normally",
    description:
      "Keep using Claude exactly as you do today. Brain Cloud captures thoughts, decisions, and insights in the background.",
  },
  {
    icon: Brain,
    step: "3",
    title: "Your Brain Remembers",
    description:
      "Search past context, review decisions, get coaching insights, and share knowledge — all from your dashboard.",
  },
];


const FAQ_ITEMS = [
  {
    q: "What is an MCP server?",
    a: "MCP (Model Context Protocol) is an open standard that lets AI assistants connect to external tools and data sources. Brain Cloud is an MCP server that gives Claude persistent memory across sessions.",
  },
  {
    q: "Does Brain Cloud read my code?",
    a: "No. Brain Cloud only stores the thoughts, decisions, and session data that Claude explicitly sends through MCP tool calls. It never accesses your files, repos, or code directly.",
  },
  {
    q: "Which AI clients are supported?",
    a: "Brain Cloud works with any MCP-compatible client, including Claude Code (CLI), Claude Desktop, and other tools that support the MCP standard.",
  },
  {
    q: "Where is my data stored?",
    a: "Your data is stored securely in our cloud infrastructure. You can export all your data at any time as JSON or CSV, and delete your account and all associated data whenever you want.",
  },
  {
    q: "Can I self-host Brain Cloud?",
    a: "The MCP server is open source and can be pointed at any compatible backend. Self-hosting documentation is on the roadmap.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. The free tier includes everything you need to get started with persistent AI memory, including search, recall, and basic analytics.",
  },
  {
    q: "How does team sharing work?",
    a: "Teams can share handoffs, decisions, and insights across members. Each person controls what they share — nothing is shared automatically without explicit action.",
  },
  {
    q: "What happens if I stop using Brain Cloud?",
    a: "Your data stays available for export. We don't delete accounts without notice. You own your data and can take it with you.",
  },
];


function smoothScroll(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (href.startsWith("#")) {
    e.preventDefault();
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  }
}

function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#" className="flex items-center gap-2">
          <BrainCloudLogo size={32} className="text-foreground" />
          <span className="text-lg font-semibold">Brain Cloud</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => smoothScroll(e, link.href)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Button asChild size="sm">
            <a href={`${APP_URL}login`}>Sign In</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  smoothScroll(e, link.href);
                  setMobileOpen(false);
                }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button asChild size="sm" className="mt-2 w-full">
              <a href={`${APP_URL}login`}>Sign In</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="px-4 pb-16 pt-20 sm:px-6 md:pb-24 md:pt-28">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          Persistent memory for AI-assisted development
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your AI remembers
          <br />
          <span className="text-muted-foreground">everything you&apos;ve learned</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Brain Cloud gives Claude persistent memory across sessions. Every insight, decision, and
          context is captured, searchable, and shared — so you never start from scratch.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={`${APP_URL}login`}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href={`${APP_URL}demo`}>
              Try Demo
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your AI sessions generate insights.
          <br />
          <span className="text-muted-foreground">They disappear.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Every time you start a new Claude session, you lose the context from the last one. The
          decisions you made, the patterns you discovered, the lessons you learned — all gone. You
          end up re-explaining the same things over and over.
        </p>
        <p className="mt-4 text-lg font-medium">
          Brain Cloud fixes this. Your AI gets a persistent memory that grows with every session.
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three steps to give your AI a permanent memory.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.step} className="relative text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">
                Step {step.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-16 border-t border-border bg-muted/30 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your AI brain needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete knowledge layer for AI-assisted development.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
            >
              <feature.icon className="mb-3 h-6 w-6 text-muted-foreground" />
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-foreground/80"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm leading-relaxed text-muted-foreground">{a}</div>
      )}
    </div>
  );
}

function FAQSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-16 border-t border-border bg-muted/30 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="border-t border-border">
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Pricing
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Brain Cloud is free while in beta. Pricing plans coming soon.
        </p>
        <Button asChild size="lg" className="mt-8">
          <a href={`${APP_URL}login`}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <BrainCloudLogo size={24} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Brain Cloud. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="/changelog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Changelog
          </a>
          <a
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </a>
          <a
            href="https://github.com/stellar-gen/brain-cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Brain Cloud — AI Memory for Developers</title>
        <meta name="description" content="Your second brain for developer decisions. Capture thoughts, log decisions, review outcomes, and improve over time." />
      </Helmet>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
