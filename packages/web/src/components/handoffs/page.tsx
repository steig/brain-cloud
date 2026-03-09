import { useState } from "react";
import { useHandoffs } from "@/lib/queries";
import { HandoffList } from "./handoff-list";
import { Button } from "@/components/ui/button";

export function HandoffsPage() {
  const [showClaimed, setShowClaimed] = useState(false);
  const handoffs = useHandoffs(showClaimed ? {} : { status: "pending" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Handoffs</h1>
        <div className="flex gap-2">
          <Button
            variant={showClaimed ? "outline" : "default"}
            size="sm"
            onClick={() => setShowClaimed(false)}
          >
            Pending
          </Button>
          <Button
            variant={showClaimed ? "default" : "outline"}
            size="sm"
            onClick={() => setShowClaimed(true)}
          >
            All
          </Button>
        </div>
      </div>
      <HandoffList
        handoffs={handoffs.data ?? []}
        isLoading={handoffs.isLoading}
      />
    </div>
  );
}
