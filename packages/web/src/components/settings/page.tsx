import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteAccount } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Key, Plus, Trash2, BookOpen, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard } from "@/components/onboarding/setup-wizard";

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser();
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteAccount = useDeleteAccount();

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("write");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [exportType, setExportType] = useState("all");
  const [exportFormat, setExportFormat] = useState("json");
  const [exportRange, setExportRange] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const result = await createKey.mutateAsync({
      name: newKeyName.trim(),
      scope: newKeyScope,
      expiresAt: newKeyExpiry || undefined,
    });
    setCreatedKey(result.key);
    setNewKeyName("");
    setNewKeyScope("write");
    setNewKeyExpiry("");
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType, format: exportFormat, range: exportRange });
      const res = await fetch(`/api/export?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
    setNewKeyScope("write");
    setNewKeyExpiry("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isExpired = (key: { expires_at: string | null }) =>
    key.expires_at ? new Date(key.expires_at) < new Date() : false;
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
                Create named API keys for MCP server connections. Keys can be scoped to read, write, or admin access.
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
                      <Button variant="outline" size="icon" aria-label="Copy API key" onClick={copyKey}>
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
                    <div className="space-y-4">
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
                      <div className="space-y-2">
                        <Label htmlFor="key-scope">Scope</Label>
                        <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                          <SelectTrigger id="key-scope">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">Read -- search, recall, timeline only</SelectItem>
                            <SelectItem value="write">Write -- read + create thoughts, decisions, sessions</SelectItem>
                            <SelectItem value="admin">Admin -- full access including key management</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="key-expiry">Expiry (optional)</Label>
                        <Input
                          id="key-expiry"
                          type="date"
                          value={newKeyExpiry}
                          onChange={(e) => setNewKeyExpiry(e.target.value)}
                          min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        />
                      </div>
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
              {activeKeys.map((key) => {
                const expired = isExpired(key);
                return (
                  <div key={key.id} className={`flex items-center justify-between py-3 first:pt-0 last:pb-0 ${expired ? "opacity-50" : ""}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{key.name}</p>
                        <Badge variant={key.scope === "admin" ? "default" : key.scope === "read" ? "outline" : "secondary"} className="text-xs">
                          {key.scope || "write"}
                        </Badge>
                        {expired && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && (
                          <> &middot; Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                        )}
                        {key.expires_at && !expired && (
                          <> &middot; Expires {new Date(key.expires_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Revoke API key"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokeKey.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your thoughts, decisions, sessions, and sentiment data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="thoughts">Thoughts</SelectItem>
                  <SelectItem value="decisions">Decisions</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select value={exportRange} onValueChange={setExportRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Download"}
          </Button>
        </CardContent>
      </Card>

      {showSetupGuide ? (
        <SetupWizard onDismiss={() => setShowSetupGuide(false)} />
      ) : (
        <Button variant="outline" onClick={() => setShowSetupGuide(true)}>
          <BookOpen className="mr-2 h-4 w-4" />
          Setup Guide
        </Button>
      )}

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Delete Account</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently delete your account and all data. This cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <button
                type="button"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
                onClick={() => {
                  setExportType("all");
                  setExportFormat("json");
                  setExportRange("all");
                  handleExport();
                }}
              >
                Download your data first
              </button>
            </p>
          </div>
          <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be undone. All of your data will be deleted, including thoughts, decisions, sessions, API keys, and team memberships. Teams where you are the sole owner will also be deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-mono font-semibold">DELETE MY ACCOUNT</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  autoComplete="off"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || deleteAccount.isPending}
                  onClick={async () => {
                    await deleteAccount.mutateAsync();
                    navigate("/login");
                  }}
                >
                  {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
