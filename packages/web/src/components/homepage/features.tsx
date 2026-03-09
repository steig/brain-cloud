import {
  Lightbulb,
  GitFork,
  Timer,
  BarChart3,
  Sparkles,
  Plug,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Lightbulb,
    title: "Capture Thoughts",
    description: "Record ideas, insights, and questions as you code — before they slip away.",
  },
  {
    icon: GitFork,
    title: "Log Decisions",
    description: "Track options considered, rationale, and outcomes for every technical choice.",
  },
  {
    icon: Timer,
    title: "Track Sessions",
    description: "Set goals, note mood, and log accomplishments per work session.",
  },
  {
    icon: BarChart3,
    title: "Analyze Patterns",
    description: "See productivity trends, token costs, and decision quality over time.",
  },
  {
    icon: Sparkles,
    title: "Search & Recall",
    description: "Full-text search across all your thoughts and decisions. Find what you need, fast.",
  },
  {
    icon: Plug,
    title: "MCP Integration",
    description: "Works inside Claude Code, Cursor, and any MCP-compatible client.",
  },
];

export function Features() {
  return (
    <section className="px-4 py-16 md:py-24">
      <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
        Everything you need to learn from your work
      </h2>
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
