import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useCreateThought, useDeleteThought } from "@/lib/queries";
import { useLoadMore } from "@/lib/use-load-more";
import { api, buildParams, type Thought } from "@/lib/api";
import { ThoughtList } from "./thought-list";
import { ThoughtForm } from "./thought-form";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const types = ["all", "note", "idea", "question", "todo", "insight"] as const;

export function ThoughtsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filterParams: [string, string][] = [
    ["order", "created_at.desc"],
  ];
  if (typeFilter !== "all") filterParams.push(["type", `eq.${typeFilter}`]);
  if (dateRange?.from) filterParams.push(["created_at", `gte.${dateRange.from}T00:00:00Z`]);
  if (dateRange?.to) filterParams.push(["created_at", `lte.${dateRange.to}T23:59:59Z`]);

  const countParams: [string, string][] = [];
  if (typeFilter !== "all") countParams.push(["type", `eq.${typeFilter}`]);
  if (dateRange?.from) countParams.push(["created_at", `gte.${dateRange.from}T00:00:00Z`]);
  if (dateRange?.to) countParams.push(["created_at", `lte.${dateRange.to}T23:59:59Z`]);

  const { items, totalCount, isLoading, isFetchingMore, hasMore, loadMore } = useLoadMore<Thought>({
    queryKey: ["thoughts", typeFilter, dateRange],
    queryFn: ({ limit, offset }) => {
      const params: [string, string][] = [...filterParams, ["limit", String(limit)], ["offset", String(offset)]];
      return api.get<Thought[]>(`/api/thoughts?${buildParams(params)}`);
    },
    countFn: () => api.head(`/api/thoughts?${buildParams(countParams)}`),
    pageSize: 30,
  });

  const createThought = useCreateThought();
  const deleteThought = useDeleteThought();

  const handleCreate = async (data: Partial<Thought>) => {
    await createThought.mutateAsync(data);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4" data-tour="thoughts">
      <Helmet><title>Thoughts — Brain Cloud</title></Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Thoughts{totalCount !== null ? ` (${totalCount})` : ""}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Thought
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Thought</DialogTitle>
            </DialogHeader>
            <ThoughtForm
              onSubmit={handleCreate}
              isLoading={createThought.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All types" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <ThoughtList
        thoughts={items}
        isLoading={isLoading}
        onDelete={(id) => deleteThought.mutate(id)}
      />
      <LoadMoreButton hasMore={hasMore} isLoading={isFetchingMore} onClick={loadMore} />
    </div>
  );
}
