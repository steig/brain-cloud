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
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Shield,
  Terminal,
  Server,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
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
    icon: Server,
    step: "1",
    title: "Deploy to Cloudflare",
    description:
      "Clone the repo, create a D1 database, and deploy. Free tier covers solo developers — no credit card needed.",
  },
  {
    icon: Terminal,
    step: "2",
    title: "Connect Your AI",
    description:
      "Add Brain Cloud as an MCP server in Claude, Cursor, Windsurf, or any MCP-compatible client. One config snippet, one API key.",
  },
  {
    icon: Brain,
    step: "3",
    title: "Your Brain Grows",
    description:
      "Work normally. Brain Cloud captures decisions, insights, and context in the background. Every session makes your AI smarter.",
  },
];


const FAQ_ITEMS = [
  {
    q: "What is an MCP server?",
    a: "MCP (Model Context Protocol) is an open standard that lets AI assistants connect to external tools and data sources. Brain Cloud is an MCP server that gives your AI persistent memory across sessions.",
  },
  {
    q: "Does Brain Cloud read my code?",
    a: "No. Brain Cloud only stores the thoughts, decisions, and session data that your AI explicitly sends through MCP tool calls. It never accesses your files, repos, or code directly.",
  },
  {
    q: "How much does Cloudflare cost?",
    a: "Nothing for personal use. Cloudflare's free tier includes 100,000 Worker requests/day, 5 GB D1 storage, and 10,000 Workers AI neurons/day. Brain Cloud doesn't add any limits on top — you get the full Cloudflare free tier.",
  },
  {
    q: "Which AI clients are supported?",
    a: "Brain Cloud works with any client that supports the Model Context Protocol (MCP), including Claude Code, Claude Desktop, Cursor, Windsurf, Continue.dev, and Zed. If your editor supports MCP, it works with Brain Cloud.",
  },
  {
    q: "Where is my data stored?",
    a: "On YOUR Cloudflare account. When you self-host, your data lives in your own D1 database. We never see it, touch it, or have access to it. You can also export everything as JSON or CSV at any time.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Add your domain to Cloudflare DNS, update the route in wrangler.toml, and redeploy. Your instance runs at whatever domain you choose.",
  },
  {
    q: "How do I update?",
    a: "Pull the latest changes, run migrations, rebuild, and redeploy. Four commands: git pull, pnpm install, wrangler d1 migrations apply, wrangler deploy.",
  },
  {
    q: "Do I need to set up OAuth?",
    a: "No. Without OAuth, Brain Cloud runs in API-key-only mode — great for single-user instances. Add GitHub or Google OAuth when you want browser-based login.",
  },
  {
    q: "Is there a managed hosting option?",
    a: "Not yet, but we're considering it. If you'd rather not manage your own instance, let us know. For now, self-hosting on your own Cloudflare account is the way to go — the interactive installer handles everything.",
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
    <nav className="sticky top-0 z-50 border-b border-amber-500/10 bg-[#0f0a05]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#" className="flex items-center gap-2">
          <BrainCloudLogo size={32} className="text-amber-400" />
          <span className="text-lg font-semibold text-white">Brain Cloud</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => smoothScroll(e, link.href)}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/steig/brain-cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <Button asChild size="sm" className="bg-amber-500 text-black font-semibold hover:bg-amber-400">
            <a href={`${APP_URL}login`}>Sign In</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-amber-500/10 bg-[#0f0a05] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  smoothScroll(e, link.href);
                  setMobileOpen(false);
                }}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/steig/brain-cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <Button asChild size="sm" className="mt-2 w-full bg-amber-500 text-black font-semibold hover:bg-amber-400">
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
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 md:pb-24 md:pt-28">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(245,158,11,0.08)_0%,transparent_70%)]" />
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-300">
          <Github className="h-4 w-4" />
          Free &amp; open source &middot; AGPL-3.0
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          The memory layer
          <br />
          <span className="text-amber-400">for MCP</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
          AI agents are stateless. Brain Cloud isn&apos;t. It captures what your AI learns —
          decisions, insights, patterns — and surfaces them when they matter. Self-host on
          Cloudflare Workers for free.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto bg-amber-600 text-white font-semibold hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]">
            <a href="/docs#self-host-quickstart">
              Deploy Your Own
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto border border-white/15 bg-transparent text-gray-200 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-white">
            <a href={`${APP_URL}demo`}>
              Try Demo
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          No cost &middot; No vendor lock-in &middot;{" "}
          <a
            href="https://github.com/steig/brain-cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline underline-offset-2 hover:text-amber-300"
          >
            View on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-amber-500/8 bg-amber-500/[0.02] px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Every new session
          <br />
          <span className="text-gray-500">starts from zero.</span>
        </h2>
        <p className="mt-6 text-lg text-gray-400">
          Your AI forgets everything between sessions. The decisions you made, the patterns you
          discovered, the gotchas you hit — gone. You end up re-explaining the same context over
          and over.
        </p>
        <p className="mt-4 text-lg font-medium text-white">
          Brain Cloud gives MCP agents persistent memory. Cognitive decay keeps it sharp —
          recent and frequently accessed knowledge surfaces first, stale context fades naturally.
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
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three steps to give your AI a permanent memory.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.step} className="relative text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                Step {step.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-gray-400">{step.description}</p>
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
      className="scroll-mt-16 border-t border-amber-500/8 bg-amber-500/[0.02] px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            35 MCP tools, one memory layer
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Works with Claude Code, Cursor, Windsurf, and any MCP client out of the box.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all hover:border-amber-500/35 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
            >
              <feature.icon className="mb-3 h-5 w-5 text-amber-400" />
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">
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
    <div className="border-b border-white/[0.06]">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-white hover:text-gray-300"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm leading-relaxed text-gray-400">{a}</div>
      )}
    </div>
  );
}

function FAQSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-16 border-t border-amber-500/8 bg-amber-500/[0.02] px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="border-t border-white/[0.06]">
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="scroll-mt-16 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your data. Your infrastructure.
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Self-hosted means we never see your data. Ever.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-6">
            <Shield className="mb-3 h-5 w-5 text-amber-300" />
            <h3 className="mb-2 font-semibold text-white">Your Cloudflare account</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Data lives in your own D1 database on your own Cloudflare account. No third-party storage, no intermediaries.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-6">
            <Github className="mb-3 h-5 w-5 text-amber-300" />
            <h3 className="mb-2 font-semibold text-white">Fully auditable</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Every line of code is on GitHub. Read the source, verify the behavior, fork and modify anything you want.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-6">
            <Download className="mb-3 h-5 w-5 text-amber-300" />
            <h3 className="mb-2 font-semibold text-white">Full data portability</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Export everything as JSON or CSV at any time. No lock-in, no restrictions, no vendor dependency.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-amber-500/8 bg-amber-500/[0.02] px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Free &amp; open source
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Deploy on your own Cloudflare account. Zero cost on the free tier.
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-500/20 bg-white/[0.03] p-8 shadow-[0_0_40px_rgba(245,158,11,0.05)]">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">Self-Hosted</div>
          <div className="mb-4 text-5xl font-extrabold text-white">$0</div>
          <ul className="mb-6 space-y-2 text-left text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-amber-400">&#10003;</span>
              Full MCP server + web dashboard
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-amber-400">&#10003;</span>
              100,000 requests/day (Workers free tier)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-amber-400">&#10003;</span>
              5 GB storage (D1 free tier)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-amber-400">&#10003;</span>
              AI coaching &amp; semantic search (requires Workers AI)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-amber-400">&#10003;</span>
              AGPL-3.0 — fork, modify, contribute
            </li>
          </ul>
          <Button asChild size="lg" className="w-full bg-amber-600 text-white font-semibold hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <a href="/docs#self-host-quickstart">
              Deploy Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Managed hosting coming soon for teams who prefer not to self-host.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-amber-500/8 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <BrainCloudLogo size={24} className="text-gray-500" />
          <span className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Brain Cloud &middot; AGPL-3.0
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="/docs"
            className="text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            Docs
          </a>
          <a
            href="/docs#self-host-overview"
            className="text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            Self-Host
          </a>
          <a
            href="/changelog"
            className="text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            Changelog
          </a>
          <a
            href="/privacy"
            className="text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            Privacy
          </a>
          <a
            href="https://github.com/steig/brain-cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            <Github className="h-4 w-4" />
            <span>Repo</span>
          </a>
          <a
            href="https://github.com/steig"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 transition-colors hover:text-amber-400"
          >
            @steig
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0a05] text-gray-200">
      <Helmet>
        <title>Brain Cloud — The Memory Layer for MCP</title>
        <meta name="description" content="Persistent memory for MCP agents. Your AI forgets everything between sessions — Brain Cloud fixes that. Self-host on Cloudflare Workers for free. Works with Claude, Cursor, Windsurf, and any MCP client." />
      </Helmet>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PrivacySection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
