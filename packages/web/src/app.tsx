import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LoginPage } from "@/components/auth/login";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { DashboardPage } from "@/components/dashboard/page";
import { ThoughtsPage } from "@/components/thoughts/page";
import { DecisionsPage } from "@/components/decisions/page";
import { SessionsPage } from "@/components/sessions/page";
import { AnalyticsPage } from "@/components/analytics/page";
import { SettingsPage } from "@/components/settings/page";
import { HandoffsPage } from "@/components/handoffs/page";
import { CalendarPage } from "@/components/calendar/page";
import { QuickEntryPage } from "@/components/quick-entry/page";
import { ReviewsPage } from "@/components/decisions/reviews-page";
import { InsightsPage } from "@/components/insights/page";
import { GitHubPage } from "@/components/github/page";
import { TeamsPage } from "@/components/teams/page";
import { ProjectsPage } from "@/components/projects/page";
import { AskPage } from "@/components/ask/page";
import { PrivacyPolicyPage } from "@/components/legal/privacy-policy";
import { TermsOfServicePage } from "@/components/legal/terms-of-service";
import { LandingPage } from "@/components/marketing/landing-page";
import { DemoProvider } from "@/lib/demo-context";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DemoEntry } from "@/components/demo/demo-entry";
import { isMarketingSite } from "@/lib/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        if (error.name === "DemoBlockedError") {
          // Show a toast for demo-blocked mutations
          const el = document.createElement("div");
          el.className =
            "fixed bottom-4 right-4 z-50 rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg";
          el.textContent = error.message;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 3000);
        }
      },
    },
  },
});

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="flex h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 pb-18 md:p-6 md:pb-6">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="quick-entry" element={<QuickEntryPage />} />
            <Route path="thoughts" element={<ThoughtsPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="decisions/reviews" element={<ReviewsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="handoffs" element={<HandoffsPage />} />
            <Route path="ask" element={<AskPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="github" element={<GitHubPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
          </main>
        </div>
        <CommandPalette />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Helmet>
          <title>Brain Cloud — AI Memory for Developers</title>
          <meta name="description" content="Capture thoughts, log decisions, review outcomes, and improve over time. A structured learning loop for developers." />
          <meta property="og:title" content="Brain Cloud — AI Memory for Developers" />
          <meta property="og:description" content="Your second brain for developer decisions. Capture thoughts, log decisions, and learn from your work." />
        </Helmet>
        <BrowserRouter>
          <DemoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/demo" element={<DemoEntry />} />
              {isMarketingSite && (
                <Route path="/" element={<LandingPage />} />
              )}
              <Route element={<AuthGuard />}>
                <Route path="/*" element={<AppLayout />} />
              </Route>
            </Routes>
          </DemoProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
