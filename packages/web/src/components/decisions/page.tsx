import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLoadMore } from "@/lib/use-load-more";
import { api, buildParams, type Decision } from "@/lib/api";
import { DecisionList } from "./decision-list";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { LoadMoreButton } from "@/components/shared/load-more-button";

export function DecisionsPage() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const filterParams: [string, string][] = [
    ["order", "created_at.desc"],
  ];
  if (dateRange?.from) filterParams.push(["created_at", `gte.${dateRange.from}T00:00:00Z`]);
  if (dateRange?.to) filterParams.push(["created_at", `lte.${dateRange.to}T23:59:59Z`]);

  const countParams: [string, string][] = [];
  if (dateRange?.from) countParams.push(["created_at", `gte.${dateRange.from}T00:00:00Z`]);
  if (dateRange?.to) countParams.push(["created_at", `lte.${dateRange.to}T23:59:59Z`]);

  const { items, totalCount, isLoading, isFetchingMore, hasMore, loadMore } = useLoadMore<Decision>({
    queryKey: ["decisions", dateRange],
    queryFn: ({ limit, offset }) => {
      const params: [string, string][] = [...filterParams, ["limit", String(limit)], ["offset", String(offset)]];
      return api.get<Decision[]>(`/api/decisions?${buildParams(params)}`);
    },
    countFn: () => api.head(`/api/decisions?${buildParams(countParams)}`),
    pageSize: 30,
  });

  return (
    <div className="space-y-4" data-tour="decisions">
      <Helmet><title>Decisions — Brain Cloud</title></Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Decisions{totalCount !== null ? ` (${totalCount})` : ""}
        </h1>
      </div>
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      <DecisionList
        decisions={items}
        isLoading={isLoading}
      />
      <LoadMoreButton hasMore={hasMore} isLoading={isFetchingMore} onClick={loadMore} />
    </div>
  );
}
