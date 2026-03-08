import { Helmet } from "react-helmet-async";
import { useSessions } from "@/lib/queries";
import { SessionList } from "./session-list";

export function SessionsPage() {
  const sessions = useSessions({ order: "started_at.desc" });

  return (
    <div className="space-y-4" data-tour="sessions">
      <Helmet><title>Sessions — Brain Cloud</title></Helmet>
      <h1 className="text-2xl font-bold">Sessions</h1>
      <SessionList
        sessions={sessions.data ?? []}
        isLoading={sessions.isLoading}
      />
    </div>
  );
}
