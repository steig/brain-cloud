import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "./summary-tab";
import { CoachingTab } from "./coaching-tab";
import { PatternsTab } from "./patterns-tab";

export function InsightsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Insights</h1>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryTab />
        </TabsContent>
        <TabsContent value="coaching">
          <CoachingTab />
        </TabsContent>
        <TabsContent value="patterns">
          <PatternsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
