import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LoginPage } from "@/components/auth/login";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardPage } from "@/components/dashboard/page";
import { ThoughtsPage } from "@/components/thoughts/page";
import { DecisionsPage } from "@/components/decisions/page";
import { SessionsPage } from "@/components/sessions/page";
import { AnalyticsPage } from "@/components/analytics/page";
import { SettingsPage } from "@/components/settings/page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="thoughts" element={<ThoughtsPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
