import { useState } from "react";
import {
  useDecisionReviews,
  useDecisionsNeedingReview,
  useReviewStats,
  useCreateDecisionReview,
} from "@/lib/queries";
import type { Decision, DecisionReview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { timeAgo } from "@/lib/utils";

const ratingColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

export function ReviewsPage() {
  const stats = useReviewStats();
  const needingReview = useDecisionsNeedingReview();
  const reviews = useDecisionReviews();
  const [reviewTarget, setReviewTarget] = useState<Decision | null>(null);

  const isLoading = stats.isLoading || needingReview.isLoading || reviews.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Decision Reviews</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const s = stats.data;
  const reviewRate = s && s.total_decisions > 0
    ? ((s.reviewed_decisions / s.total_decisions) * 100).toFixed(0)
    : "0";
  const positiveRate = s && s.total_reviews > 0
    ? ((s.positive_outcomes / s.total_reviews) * 100).toFixed(0)
    : "0";
  const wouldRepeatRate = s && s.total_reviews > 0
    ? ((s.would_repeat / s.total_reviews) * 100).toFixed(0)
    : "0";

  const chartData = Array.from({ length: 5 }, (_, i) => {
    const rating = i + 1;
    const found = s?.rating_distribution?.find((d) => d.rating === rating);
    return { rating: `${rating}`, count: found?.count ?? 0 };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Decision Reviews</h1>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Review Rate"
          value={`${reviewRate}%`}
          subtitle={`${s?.reviewed_decisions ?? 0} of ${s?.total_decisions ?? 0} decisions`}
          icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Positive Outcomes"
          value={`${positiveRate}%`}
          subtitle={`${s?.positive_outcomes ?? 0} rated 4-5`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Would Decide Same"
          value={`${wouldRepeatRate}%`}
          subtitle={`${s?.would_repeat ?? 0} of ${s?.total_reviews ?? 0}`}
          icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Avg Rating"
          value={s?.avg_rating ? s.avg_rating.toFixed(1) : "—"}
          subtitle={`${s?.total_reviews ?? 0} reviews total`}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rating distribution chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {s?.total_reviews === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No reviews yet. Review some decisions below to see the chart.
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="rating" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={ratingColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decisions needing review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Decisions Needing Review
              {needingReview.data && needingReview.data.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {needingReview.data.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!needingReview.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All caught up! No decisions need review.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {needingReview.data.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{d.title}</p>
                      {d.chosen && (
                        <p className="text-xs text-muted-foreground truncate">
                          Chose: {d.chosen}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(d.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2 shrink-0"
                      onClick={() => setReviewTarget(d)}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Past reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {!reviews.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reviews yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.data.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review form dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Decision</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <ReviewForm
              decision={reviewTarget}
              onClose={() => setReviewTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="p-0.5"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  decision,
  onClose,
}: {
  decision: Decision;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [wouldRepeat, setWouldRepeat] = useState(true);
  const createReview = useCreateDecisionReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReview.mutateAsync({
      decision_id: decision.id,
      outcome_rating: rating || undefined,
      outcome_notes: notes || undefined,
      lessons_learned: lessons || undefined,
      would_decide_same: wouldRepeat,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-medium">{decision.title}</p>
        {decision.chosen && (
          <p className="text-sm text-muted-foreground">Chose: {decision.chosen}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Outcome Rating</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Outcome Notes</Label>
        <Textarea
          id="notes"
          placeholder="How did this decision turn out?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessons">Lessons Learned</Label>
        <Textarea
          id="lessons"
          placeholder="What did you learn from this decision?"
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWouldRepeat(!wouldRepeat)}
          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
            wouldRepeat
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground"
          }`}
        >
          {wouldRepeat && <Check className="h-3 w-3" />}
        </button>
        <Label className="cursor-pointer" onClick={() => setWouldRepeat(!wouldRepeat)}>
          Would make the same decision again
        </Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createReview.isPending}>
          {createReview.isPending ? "Saving..." : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: DecisionReview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{review.decision_title}</p>
          <div className="flex items-center gap-2 mt-1">
            {review.outcome_rating != null && (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3 w-3 ${
                      n <= review.outcome_rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
            {review.would_decide_same != null && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  review.would_decide_same
                    ? "border-green-500/30 text-green-600 dark:text-green-400"
                    : "border-red-500/30 text-red-600 dark:text-red-400"
                }`}
              >
                {review.would_decide_same ? "Would repeat" : "Would change"}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {timeAgo(review.created_at)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {review.outcome_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outcome</p>
              <p>{review.outcome_notes}</p>
            </div>
          )}
          {review.lessons_learned && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Lessons</p>
              <p>{review.lessons_learned}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
