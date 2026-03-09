import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LoginPage } from "@/components/auth/login";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { PrivacyPolicyPage } from "@/components/legal/privacy-policy";
import { TermsOfServicePage } from "@/components/legal/terms-of-service";
import { LandingPage } from "@/components/marketing/landing-page";
import { DemoProvider } from "@/lib/demo-context";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DemoEntry } from "@/components/demo/demo-entry";
import { isMarketingSite } from "@/lib/config";
import { trackPageView } from "@/lib/analytics";
import { PageSkeleton } from "@/components/shared/page-skeleton";

// Lazy-loaded routes — keeps initial bundle small
const DashboardPage = lazy(() => import("./components/dashboard/page").then(m => ({ default: m.DashboardPage })));
const ThoughtsPage = lazy(() => import("./components/thoughts/page").then(m => ({ default: m.ThoughtsPage })));
const DecisionsPage = lazy(() => import("./components/decisions/page").then(m => ({ default: m.DecisionsPage })));
const ReviewsPage = lazy(() => import("./components/decisions/reviews-page").then(m => ({ default: m.ReviewsPage })));
const SessionsPage = lazy(() => import("./components/sessions/page").then(m => ({ default: m.SessionsPage })));
const SettingsPage = lazy(() => import("./components/settings/page").then(m => ({ default: m.SettingsPage })));
const HandoffsPage = lazy(() => import("./components/handoffs/page").then(m => ({ default: m.HandoffsPage })));
const QuickEntryPage = lazy(() => import("./components/quick-entry/page").then(m => ({ default: m.QuickEntryPage })));
const GitHubPage = lazy(() => import("./components/github/page").then(m => ({ default: m.GitHubPage })));
const TeamsPage = lazy(() => import("./components/teams/page").then(m => ({ default: m.TeamsPage })));
const ProjectsPage = lazy(() => import("./components/projects/page").then(m => ({ default: m.ProjectsPage })));
const AdminDashboardPage = lazy(() => import("./components/admin/dashboard-page").then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("./components/admin/users-page").then(m => ({ default: m.AdminUsersPage })));
const CoachingPage = lazy(() => import("./components/coaching/page").then(m => ({ default: m.CoachingPage })));
const InsightsPage = lazy(() => import("./components/insights/page").then(m => ({ default: m.InsightsPage })));
const AnalyticsPage = lazy(() => import("./components/analytics/page").then(m => ({ default: m.AnalyticsPage })));
const TeamAdminPage = lazy(() => import("./components/teams/admin-page").then(m => ({ default: m.TeamAdminPage })));
const TeamWorkspacePage = lazy(() => import("./components/teams/workspace-page").then(m => ({ default: m.TeamWorkspacePage })));
const TeamCoachingPage = lazy(() => import("./components/teams/coaching-page").then(m => ({ default: m.TeamCoachingPage })));
const CalendarPage = lazy(() => import("./components/calendar/page").then(m => ({ default: m.CalendarPage })));
const ChangelogPage = lazy(() => import("./components/changelog/page").then(m => ({ default: m.ChangelogPage })));
const DocsPage = lazy(() => import("./components/docs/page").then(m => ({ default: m.DocsPage })));
const AskPage = lazy(() => import("./components/ask/page").then(m => ({ default: m.AskPage })));

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

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
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
            <Route index element={<LazyRoute><DashboardPage /></LazyRoute>} />
            <Route path="dashboard" element={<LazyRoute><DashboardPage /></LazyRoute>} />
            <Route path="quick-entry" element={<LazyRoute><QuickEntryPage /></LazyRoute>} />
            <Route path="thoughts" element={<LazyRoute><ThoughtsPage /></LazyRoute>} />
            <Route path="decisions" element={<LazyRoute><DecisionsPage /></LazyRoute>} />
            <Route path="decisions/reviews" element={<LazyRoute><ReviewsPage /></LazyRoute>} />
            <Route path="sessions" element={<LazyRoute><SessionsPage /></LazyRoute>} />
            <Route path="handoffs" element={<LazyRoute><HandoffsPage /></LazyRoute>} />
            <Route path="ask" element={<LazyRoute><AskPage /></LazyRoute>} />
            <Route path="insights" element={<LazyRoute><InsightsPage /></LazyRoute>} />
            <Route path="coaching" element={<LazyRoute><CoachingPage /></LazyRoute>} />
            <Route path="calendar" element={<LazyRoute><CalendarPage /></LazyRoute>} />
            <Route path="teams" element={<LazyRoute><TeamsPage /></LazyRoute>} />
            <Route path="teams/:id/admin" element={<LazyRoute><TeamAdminPage /></LazyRoute>} />
            <Route path="teams/:id/workspace" element={<LazyRoute><TeamWorkspacePage /></LazyRoute>} />
            <Route path="teams/:id/coaching" element={<LazyRoute><TeamCoachingPage /></LazyRoute>} />
            <Route path="projects" element={<LazyRoute><ProjectsPage /></LazyRoute>} />
            <Route path="github" element={<LazyRoute><GitHubPage /></LazyRoute>} />
            <Route path="admin" element={<LazyRoute><AdminDashboardPage /></LazyRoute>} />
            <Route path="admin/dashboard" element={<LazyRoute><AdminDashboardPage /></LazyRoute>} />
            <Route path="admin/users" element={<LazyRoute><AdminUsersPage /></LazyRoute>} />
            <Route path="analytics" element={<LazyRoute><AnalyticsPage /></LazyRoute>} />
            <Route path="settings" element={<LazyRoute><SettingsPage /></LazyRoute>} />
          </Routes>
          </main>
        </div>
        <CommandPalette />
      </div>
    </div>
  );
}

function PageViewTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return <>{children}</>;
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
        <Sentry.ErrorBoundary fallback={<div className="flex h-screen items-center justify-center"><p className="text-muted-foreground">Something went wrong. Please refresh the page.</p></div>}>
        <BrowserRouter>
          <PageViewTracker>
          <DemoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/changelog" element={<LazyRoute><ChangelogPage /></LazyRoute>} />
              <Route path="/docs" element={<LazyRoute><DocsPage /></LazyRoute>} />
              <Route path="/demo" element={<DemoEntry />} />
              {isMarketingSite && (
                <Route path="/" element={<LandingPage />} />
              )}
              <Route element={<AuthGuard />}>
                <Route path="/*" element={<AppLayout />} />
              </Route>
            </Routes>
          </DemoProvider>
          </PageViewTracker>
        </BrowserRouter>
        </Sentry.ErrorBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
