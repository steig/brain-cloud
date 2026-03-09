import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { changelog } from "@/data/changelog";
import { BrainCloudLogo } from "@/components/brand/logo";

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  added: {
    label: "Added",
    className: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  improved: {
    label: "Improved",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  fixed: {
    label: "Fixed",
    className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  },
};

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Changelog - Brain Cloud</title>
        <meta
          name="description"
          content="See what's new in Brain Cloud. Release notes, new features, improvements, and bug fixes."
        />
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <BrainCloudLogo size={32} className="text-foreground" />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Changelog
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            New features, improvements, and fixes for Brain Cloud.
          </p>
        </div>

        <div className="space-y-12">
          {changelog.map((entry) => (
            <article
              key={entry.version}
              className="border-l-2 border-border pl-6"
            >
              <div className="mb-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl font-semibold">
                    v{entry.version} &mdash; {entry.title}
                  </h2>
                </div>
                <time className="text-sm text-muted-foreground">
                  {new Date(entry.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </time>
              </div>

              <p className="mb-4 text-muted-foreground">{entry.description}</p>

              <ul className="space-y-2">
                {entry.changes.map((change, i) => {
                  const style = TYPE_STYLES[change.type];
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className={`mt-0.5 inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <span>{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
