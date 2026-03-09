import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/config";

const dataTable = [
  {
    category: "Thoughts & ideas",
    why: "Retrieve insights later",
    example: '"Auth at src/auth.ts:45 skips expiry check"',
  },
  {
    category: "Decisions",
    why: "Review and learn from outcomes",
    example: "Chose JWT over sessions — rationale + trade-offs",
  },
  {
    category: "Sessions",
    why: "Track productivity patterns",
    example: "Goals, mood, accomplishments per session",
  },
  {
    category: "Sentiment",
    why: "Surface tool frustration patterns",
    example: '"frustrated with flaky CI" — intensity 4/5',
  },
  {
    category: "DX metrics",
    why: "Understand AI costs and usage",
    example: "Token counts, model used, success rate",
  },
];

export function Privacy() {
  return (
    <section id="privacy" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">
          Transparent by design
        </h2>
        <p className="mb-8 text-center text-muted-foreground">
          Here's exactly what Brain Cloud collects, why, and an example of each.
        </p>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">What</th>
                <th className="px-4 py-3 text-left font-medium">Why</th>
                <th className="px-4 py-3 text-left font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              {dataTable.map(({ category, why, example }) => (
                <tr key={category} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{why}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                    {example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Where your data lives:</strong>{" "}
            Cloudflare D1 (SQLite at the edge). Each user's data is logically isolated.
          </p>
          <p>
            <strong className="text-foreground">What we do NOT do:</strong>{" "}
            No selling data. No AI training on your data. No third-party sharing.
            No cross-site tracking. Auth-only cookies.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold">Ready to start?</h3>
          <div className="flex gap-3">
            <Button asChild>
              <a href={`${APP_URL}login`}>
                <Github className="mr-2 h-4 w-4" />
                Sign up with GitHub
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`${APP_URL}login`}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
