import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    index: number;
    id: string;
    type: string;
    content: string;
  }>;
}

interface AskResponse {
  answer: string;
  sources: Array<{
    index: number;
    id: string;
    type: string;
    content: string;
    created_at: string;
  }>;
}

const SUGGESTIONS = [
  "What decisions did I make this week?",
  "What are my recurring blockers?",
  "Summarize my architecture decisions",
];

export function AskPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (question: string) =>
      api.post<AskResponse>("/api/ask", {
        question,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || ask.isPending) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    ask.mutate(question);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Ask Your Brain
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your thoughts, decisions, and sessions
        </p>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-medium text-muted-foreground">
              What would you like to know?
            </h2>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
              Ask questions about your past thoughts, decisions, and sessions.
              Your brain's AI will search and synthesize an answer.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "flex justify-end" : ""}
          >
            <div
              className={
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]"
                  : "max-w-[90%]"
              }
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Sources:
                  </div>
                  {msg.sources.map((s) => (
                    <div
                      key={s.id}
                      className="text-xs text-muted-foreground bg-muted rounded px-2 py-1"
                    >
                      [{s.index}]{" "}
                      <span className="capitalize">{s.type}</span>:{" "}
                      {s.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {ask.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your brain..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={ask.isPending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || ask.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
