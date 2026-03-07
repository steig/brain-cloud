import { useDecisions } from "@/lib/queries";
import { DecisionList } from "./decision-list";

export function DecisionsPage() {
  const decisions = useDecisions({ order: "created_at.desc" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Decisions</h1>
      <DecisionList
        decisions={decisions.data ?? []}
        isLoading={decisions.isLoading}
      />
    </div>
  );
}
