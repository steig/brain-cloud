import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useCreateOrchestratorMessage,
  useCreateOrchestratorRoom,
  useOrchestratorAgents,
  useOrchestratorMessages,
  useOrchestratorPresence,
  useOrchestratorRooms,
  useUpsertOrchestratorAgent,
  useUser,
} from "@/lib/queries";

const statusStyles: Record<string, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-500",
  busy: "bg-red-500",
  offline: "bg-muted-foreground/40",
};

export function OrchestratorPage() {
  const { data: user } = useUser();
  const rooms = useOrchestratorRooms();
  const agents = useOrchestratorAgents();
  const createRoom = useCreateOrchestratorRoom();
  const createMessage = useCreateOrchestratorMessage();
  const upsertAgent = useUpsertOrchestratorAgent();

  const [activeRoomId, setActiveRoomId] = useState<string | undefined>(undefined);
  const [roomName, setRoomName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentProvider, setAgentProvider] = useState("");
  const [agentModel, setAgentModel] = useState("");
  const [message, setMessage] = useState("");

  const activeRoom = useMemo(
    () => rooms.data?.find((room) => room.id === activeRoomId),
    [rooms.data, activeRoomId]
  );

  const messages = useOrchestratorMessages(activeRoomId);
  const presence = useOrchestratorPresence(activeRoomId);

  useEffect(() => {
    if (!activeRoomId && rooms.data?.length) {
      setActiveRoomId(rooms.data[0].id);
    }
  }, [activeRoomId, rooms.data]);

  const orderedMessages = useMemo(() => {
    if (!messages.data) return [];
    return [...messages.data].reverse();
  }, [messages.data]);

  const handleCreateRoom = async () => {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const room = await createRoom.mutateAsync({ name: trimmed });
    setRoomName("");
    setActiveRoomId(room.id);
  };

  const handleCreateAgent = async () => {
    const trimmed = agentName.trim();
    if (!trimmed) return;
    await upsertAgent.mutateAsync({
      name: trimmed,
      provider: agentProvider.trim() || undefined,
      model: agentModel.trim() || undefined,
      status: "idle",
    });
    setAgentName("");
    setAgentProvider("");
    setAgentModel("");
  };

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !activeRoomId) return;
    await createMessage.mutateAsync({
      roomId: activeRoomId,
      body: {
        content: trimmed,
        sender_type: "user",
        sender_name: user?.name || "You",
      },
    });
    setMessage("");
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Orchestrator</h1>
        <p className="text-sm text-muted-foreground">
          Coordinate multi-agent work with shared rooms, status, and handoffs.
        </p>
      </div>

      <div className="grid h-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Rooms</h2>
                <p className="text-xs text-muted-foreground">Shared coordination spaces</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <Button onClick={handleCreateRoom} disabled={createRoom.isPending}>
                Create
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {rooms.data?.length ? (
                rooms.data.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className={cn(
                      "flex w-full flex-col rounded-md border px-3 py-2 text-left transition-colors",
                      activeRoomId === room.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="text-sm font-medium">{room.name}</span>
                    {room.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">{room.description}</span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No rooms yet.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Agents</h2>
              <p className="text-xs text-muted-foreground">Register your tools</p>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Agent name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <Input
                placeholder="Provider (Claude, Gemini, Codex)"
                value={agentProvider}
                onChange={(e) => setAgentProvider(e.target.value)}
              />
              <Input
                placeholder="Model (optional)"
                value={agentModel}
                onChange={(e) => setAgentModel(e.target.value)}
              />
              <Button className="w-full" onClick={handleCreateAgent} disabled={upsertAgent.isPending}>
                Add agent
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {agents.data?.length ? (
                agents.data.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[agent.provider, agent.model].filter(Boolean).join(" • ") || "No model specified"}
                      </div>
                    </div>
                    <span className={cn("h-2.5 w-2.5 rounded-full", statusStyles[agent.status])} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No agents yet.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="flex h-full flex-col overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{activeRoom?.name || "Select a room"}</h2>
                {activeRoom?.description && (
                  <p className="text-xs text-muted-foreground">{activeRoom.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {presence.data?.map((p) => (
                  <Badge key={p.id} variant="secondary" className="flex items-center gap-1 text-xs">
                    <span className={cn("h-2 w-2 rounded-full", statusStyles[p.status])} />
                    {p.agent_name || "Agent"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {orderedMessages.length ? (
              <div className="space-y-3">
                {orderedMessages.map((msg) => (
                  <div key={msg.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {msg.sender_type === "agent"
                          ? msg.agent_name || msg.sender_name || "Agent"
                          : msg.sender_name || "You"}
                      </span>
                      <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="space-y-2">
              <Textarea
                placeholder={activeRoom ? "Send a message to the room" : "Select a room to start chatting"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={!activeRoomId}
              />
              <div className="flex justify-end">
                <Button onClick={handleSendMessage} disabled={!activeRoomId || createMessage.isPending}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
