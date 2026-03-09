import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateThought,
  useCreateDecision,
  useCreateSentiment,
  useProjects,
} from "@/lib/queries";
import type { Thought, Decision } from "@/lib/api";
import { Plus, X } from "lucide-react";

const thoughtTypes = ["note", "idea", "question", "todo", "insight"] as const;
const targetTypes = ["tool", "library", "pattern", "codebase", "task", "process"] as const;
const feelings = [
  { value: "frustrated", emoji: "\u{1F624}", label: "Frustrated" },
  { value: "confused", emoji: "\u{1F615}", label: "Confused" },
  { value: "satisfied", emoji: "\u{1F60C}", label: "Satisfied" },
  { value: "excited", emoji: "\u{1F929}", label: "Excited" },
  { value: "neutral", emoji: "\u{1F610}", label: "Neutral" },
  { value: "annoyed", emoji: "\u{1F612}", label: "Annoyed" },
  { value: "impressed", emoji: "\u{1F929}", label: "Impressed" },
] as const;

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg">
      {message}
    </div>
  );
}

// --- Thought Form ---

function ThoughtTab() {
  const [type, setType] = useState<string>("note");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const createThought = useCreateThought();
  const { data: projects } = useProjects();

  useEffect(() => { contentRef.current?.focus(); }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;
    createThought.mutate(
      {
        type: type as Thought["type"],
        content,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        ...(projectId && { project_id: projectId }),
      },
      {
        onSuccess: () => {
          setContent("");
          setTags("");
          setToast("Thought saved");
          contentRef.current?.focus();
        },
      }
    );
  }, [content, type, tags, projectId, createThought]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {thoughtTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Tags (comma separated)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. learned, idea, project-x"
        />
      </div>

      <Button type="submit" disabled={createThought.isPending || !content.trim()} className="w-full">
        {createThought.isPending ? "Saving..." : "Save Thought"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Ctrl+Enter to submit</p>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  );
}

// --- Decision Form ---

interface OptionEntry {
  option: string;
  pros: string;
  cons: string;
}

function DecisionTab() {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState<OptionEntry[]>([{ option: "", pros: "", cons: "" }]);
  const [chosen, setChosen] = useState("");
  const [rationale, setRationale] = useState("");
  const [tags, setTags] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const createDecision = useCreateDecision();

  useEffect(() => { titleRef.current?.focus(); }, []);

  const addOption = () => setOptions([...options, { option: "", pros: "", cons: "" }]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: keyof OptionEntry, value: string) => {
    const next = [...options];
    next[i] = { ...next[i], [field]: value };
    setOptions(next);
  };

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    createDecision.mutate(
      {
        title,
        context: context || undefined,
        options: options
          .filter((o) => o.option.trim())
          .map((o) => ({
            option: o.option,
            pros: o.pros.split(",").map((s) => s.trim()).filter(Boolean),
            cons: o.cons.split(",").map((s) => s.trim()).filter(Boolean),
          })),
        chosen: chosen || undefined,
        rationale: rationale || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      } as Partial<Decision>,
      {
        onSuccess: () => {
          setTitle("");
          setContext("");
          setOptions([{ option: "", pros: "", cons: "" }]);
          setChosen("");
          setRationale("");
          setTags("");
          setToast("Decision saved");
          titleRef.current?.focus();
        },
      }
    );
  }, [title, context, options, chosen, rationale, tags, createDecision]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What decision are you making?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Context</Label>
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="What led to needing this decision?"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Options</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4" /> Add Option
          </Button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={opt.option}
                onChange={(e) => updateOption(i, "option", e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              {options.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label="Remove option" onClick={() => removeOption(i)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              value={opt.pros}
              onChange={(e) => updateOption(i, "pros", e.target.value)}
              placeholder="Pros (comma separated)"
              className="text-xs"
            />
            <Input
              value={opt.cons}
              onChange={(e) => updateOption(i, "cons", e.target.value)}
              placeholder="Cons (comma separated)"
              className="text-xs"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Chosen</Label>
        <Input
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          placeholder="Which option was chosen?"
        />
      </div>

      <div className="space-y-2">
        <Label>Rationale</Label>
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why was this option chosen?"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags (comma separated)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. architecture, frontend"
        />
      </div>

      <Button type="submit" disabled={createDecision.isPending || !title.trim()} className="w-full">
        {createDecision.isPending ? "Saving..." : "Save Decision"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Ctrl+Enter to submit</p>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  );
}

// --- Sentiment Form ---

function SentimentTab() {
  const [targetType, setTargetType] = useState<string>("tool");
  const [targetName, setTargetName] = useState("");
  const [feeling, setFeeling] = useState<string>("");
  const [intensity, setIntensity] = useState(3);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const createSentiment = useCreateSentiment();

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!targetName.trim() || !feeling) return;
    createSentiment.mutate(
      {
        target_type: targetType,
        target_name: targetName,
        feeling,
        intensity,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          setTargetName("");
          setFeeling("");
          setIntensity(3);
          setReason("");
          setToast("Sentiment saved");
          nameRef.current?.focus();
        },
      }
    );
  }, [targetType, targetName, feeling, intensity, reason, createSentiment]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Target Type</Label>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Target Name</Label>
          <Input
            ref={nameRef}
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. React, Vitest"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Feeling</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {feelings.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFeeling(f.value)}
              className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-accent ${
                feeling === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input"
              }`}
            >
              <span className="text-lg">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Intensity: {intensity}</Label>
        <input
          type="range"
          min={1}
          max={5}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mild</span>
          <span>Strong</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why do you feel this way?"
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={createSentiment.isPending || !targetName.trim() || !feeling}
        className="w-full"
      >
        {createSentiment.isPending ? "Saving..." : "Save Sentiment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Ctrl+Enter to submit</p>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  );
}

// --- Quick Entry Page ---

export function QuickEntryPage() {
  const [tab, setTab] = useState("thought");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Quick Entry</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="thought" className="flex-1">Thought</TabsTrigger>
          <TabsTrigger value="decision" className="flex-1">Decision</TabsTrigger>
          <TabsTrigger value="sentiment" className="flex-1">Sentiment</TabsTrigger>
        </TabsList>
        <TabsContent value="thought">
          <ThoughtTab />
        </TabsContent>
        <TabsContent value="decision">
          <DecisionTab />
        </TabsContent>
        <TabsContent value="sentiment">
          <SentimentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
