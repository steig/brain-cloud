import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DxCharts } from "./dx-charts";
import { CostCharts } from "./cost-charts";
import { LearningChart } from "./learning-chart";
import { SentimentChart } from "./sentiment-chart";

export function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Tabs defaultValue="dx">
        <TabsList>
          <TabsTrigger value="dx">DX Summary</TabsTrigger>
          <TabsTrigger value="cost">Costs</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="dx">
          <DxCharts />
        </TabsContent>
        <TabsContent value="cost">
          <CostCharts />
        </TabsContent>
        <TabsContent value="learning">
          <LearningChart />
        </TabsContent>
        <TabsContent value="sentiment">
          <SentimentChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
