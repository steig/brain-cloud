import { useState } from "react";
import {
  useGitHubRepos,
  useLinkGitHubRepo,
  useUnlinkGitHubRepo,
  useSyncGitHubRepo,
  useGitHubActivity,
  useCreateThought,
} from "@/lib/queries";
import type { GitHubActivity, GitHubRepo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitCommit,
  GitPullRequest,
  CircleDot,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  Brain,
  Loader2,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

// --- Link Repo Form ---

function LinkRepoForm() {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const linkRepo = useLinkGitHubRepo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !name.trim()) return;
    linkRepo.mutate(
      { owner: owner.trim(), name: name.trim() },
      { onSuccess: () => { setOwner(""); setName(""); } }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          placeholder="Owner (e.g. octocat)"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
      </div>
      <span className="pb-2 text-muted-foreground">/</span>
      <div className="flex-1">
        <Input
          placeholder="Repository name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={linkRepo.isPending || !owner || !name}>
        {linkRepo.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span className="ml-1">Link</span>
      </Button>
      {linkRepo.isError && (
        <span className="text-sm text-destructive">
          {(linkRepo.error as Error).message}
        </span>
      )}
    </form>
  );
}

// --- Repo Card ---

function RepoCard({ repo }: { repo: GitHubRepo }) {
  const syncRepo = useSyncGitHubRepo();
  const unlinkRepo = useUnlinkGitHubRepo();

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            {repo.full_name}
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            {repo.last_synced_at
              ? `Last synced ${timeAgo(repo.last_synced_at)}`
              : "Never synced"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncRepo.mutate(repo.id)}
            disabled={syncRepo.isPending}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncRepo.isPending ? "animate-spin" : ""}`}
            />
            <span className="ml-1">Sync</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Unlink ${repo.full_name}? Activity data will be deleted.`))
                unlinkRepo.mutate(repo.id);
            }}
            disabled={unlinkRepo.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Activity Item ---

const typeIcons = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: CircleDot,
} as const;

const typeLabels = {
  commit: "Commit",
  pull_request: "PR",
  issue: "Issue",
} as const;

function stateBadge(type: string, state: string | null) {
  if (!state) return null;
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    open: "default",
    closed: "destructive",
    merged: "secondary",
  };
  return (
    <Badge variant={variants[state] ?? "outline"} className="text-[10px]">
      {state}
    </Badge>
  );
}

function ActivityItem({ item }: { item: GitHubActivity }) {
  const Icon = typeIcons[item.activity_type] ?? CircleDot;
  const createThought = useCreateThought();

  const importToBrain = () => {
    const label = typeLabels[item.activity_type] ?? item.activity_type;
    createThought.mutate({
      type: "note",
      content: `[GitHub ${label}] ${item.title}\n\n${item.html_url}`,
      tags: ["github", item.activity_type, item.repo_full_name],
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={item.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium hover:underline"
          >
            {item.title}
          </a>
          {stateBadge(item.activity_type, item.state)}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.author_login} in {item.repo_full_name} &middot;{" "}
          {timeAgo(item.created_at)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={importToBrain}
        disabled={createThought.isPending}
        title="Import to Brain"
      >
        {createThought.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// --- Main Page ---

export function GitHubPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [sinceFilter, setSinceFilter] = useState<string>("30d");

  const repos = useGitHubRepos();
  const activity = useGitHubActivity({
    type: typeFilter === "all" ? undefined : typeFilter,
    repo_id: repoFilter === "all" ? undefined : repoFilter,
    since: sinceFilter,
  });

  const hasRepos = repos.data && repos.data.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GitHub</h1>

      {/* Link repo form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Link a Repository</CardTitle>
        </CardHeader>
        <CardContent>
          <LinkRepoForm />
        </CardContent>
      </Card>

      {/* Linked repos */}
      {repos.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : hasRepos ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Linked Repositories
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {repos.data!.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No repositories linked yet. Link one above to start syncing activity.
          </CardContent>
        </Card>
      )}

      {/* Activity section */}
      {hasRepos && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="commit">Commits</SelectItem>
                <SelectItem value="pull_request">Pull requests</SelectItem>
                <SelectItem value="issue">Issues</SelectItem>
              </SelectContent>
            </Select>

            <Select value={repoFilter} onValueChange={setRepoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Repository" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repos</SelectItem>
                {repos.data?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sinceFilter} onValueChange={setSinceFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity feed */}
          {activity.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activity.data && activity.data.length > 0 ? (
            <div className="space-y-2">
              {activity.data.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No activity found. Try syncing a repository or adjusting filters.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
