import { useState } from "react";
import { useUser, useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Key, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPage() {
  const { data: user, isLoading } = useUser();
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const result = await createKey.mutateAsync(newKeyName.trim());
    setCreatedKey(result.key);
    setNewKeyName("");
  };

  const handleRevoke = async (id: string) => {
    await revokeKey.mutateAsync(id);
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const activeKeys = apiKeys?.filter((k) => k.is_active) ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information from OAuth provider</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatar_url} alt={user?.name} />
            <AvatarFallback className="text-lg">
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium">{user?.name}</p>
            {user?.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
            <Badge variant="secondary" className="mt-1">{user?.system_role}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Create named API keys for MCP server connections. Each key has the same permissions as your account.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) closeDialog(); }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                {createdKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>API Key Created</DialogTitle>
                      <DialogDescription>
                        Copy this key now. You won't be able to see it again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                      <Input value={createdKey} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={copyKey}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {copied && <p className="text-sm text-green-600">Copied!</p>}
                    <DialogFooter>
                      <Button onClick={closeDialog}>Done</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Give this key a name to identify where it's used (e.g. "laptop", "work-desktop").
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Name</Label>
                      <Input
                        id="key-name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. laptop"
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreate} disabled={!newKeyName.trim() || createKey.isPending}>
                        {createKey.isPending ? "Creating..." : "Create Key"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys yet. Create one to connect the MCP server.
            </p>
          ) : (
            <div className="divide-y">
              {activeKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && (
                        <> &middot; Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revokeKey.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
