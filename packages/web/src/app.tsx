import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { PrivacyPolicyPage } from "@/components/legal/privacy-policy";
import { TermsOfServicePage } from "@/components/legal/terms-of-service";
import { LandingPage } from "@/components/marketing/landing-page";
import { isMarketingSite } from "@/lib/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
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
    <div className="flex h-screen">
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
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          {isMarketingSite && (
            <Route path="/" element={<LandingPage />} />
          )}
          <Route element={<AuthGuard />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
