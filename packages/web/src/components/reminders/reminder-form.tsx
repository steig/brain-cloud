import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface ReminderFormProps {
  onSubmit: (data: { content: string; due_at: string }) => void;
  isSubmitting?: boolean;
}

export function ReminderForm({ onSubmit, isSubmitting }: ReminderFormProps) {
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    // Default to tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ content: content.trim(), due_at: new Date(dueDate).toISOString() });
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="What do you need to remember?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1"
      />
      <Input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-52"
      />
      <Button type="submit" disabled={!content.trim() || isSubmitting} size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
