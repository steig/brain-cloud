import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useThoughts, useCreateThought, useDeleteThought } from "@/lib/queries";
import { ThoughtList } from "./thought-list";
import { ThoughtForm } from "./thought-form";
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
import type { Thought } from "@/lib/api";

const types = ["all", "note", "idea", "question", "todo", "insight"] as const;

export function ThoughtsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const params: Record<string, string> = {
    order: "created_at.desc",
  };
  if (typeFilter !== "all") params.type = `eq.${typeFilter}`;

  const thoughts = useThoughts(params);
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
        <h1 className="text-2xl font-bold">Thoughts</h1>
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

      <div className="flex gap-2">
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
      </div>

      <ThoughtList
        thoughts={thoughts.data ?? []}
        isLoading={thoughts.isLoading}
        onDelete={(id) => deleteThought.mutate(id)}
      />
    </div>
  );
}
