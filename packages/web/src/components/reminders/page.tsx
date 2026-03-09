import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useReminders, useCreateReminder, useCompleteReminder, useDismissReminder } from "@/lib/queries";
import { ReminderList } from "./reminder-list";
import { ReminderForm } from "./reminder-form";
import { cn } from "@/lib/utils";

type TabStatus = "pending" | "completed" | "dismissed";

const tabs: { label: string; value: TabStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Dismissed", value: "dismissed" },
];

export function RemindersPage() {
  const [status, setStatus] = useState<TabStatus>("pending");
  const reminders = useReminders({ status });
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const dismissReminder = useDismissReminder();

  return (
    <div className="space-y-6">
      <Helmet><title>Reminders — Brain Cloud</title></Helmet>
      <h1 className="text-2xl font-bold">Reminders</h1>

      <ReminderForm
        onSubmit={(data) => createReminder.mutate(data)}
        isSubmitting={createReminder.isPending}
      />

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              status === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ReminderList
        reminders={reminders.data ?? []}
        isLoading={reminders.isLoading}
        onComplete={status === "pending" ? (id) => completeReminder.mutate(id) : undefined}
        onDismiss={status === "pending" ? (id) => dismissReminder.mutate(id) : undefined}
      />
    </div>
  );
}
