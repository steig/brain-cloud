import { useState, useRef, useEffect } from "react";
import { useCreateApiKey } from "@/lib/queries";
import { auth } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, ChevronRight, ChevronDown, X, Loader2 } from "lucide-react";

const DISMISSED_KEY = "onboarding_dismissed";

function getServerUrl() {
  return window.location.origin;
}

function configSnippet(client: string, apiKey: string) {
  const url = getServerUrl();
  const mcpConfig = {
    mcpServers: {
      "brain-cloud": {
        type: "streamable-http",
        url: `${url}/mcp`,
        headers: { "X-API-Key": apiKey },
      },
    },
  };
  if (client === "claude-code" || client === "claude-desktop") {
    return JSON.stringify(mcpConfig, null, 2);
  }
  // generic / other
  return `Server URL: ${url}/mcp\nHeader: X-API-Key: ${apiKey}`;
}

function ConfigBlock({ snippet, id, copied, onCopy }: { snippet: string; id: string; copied: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <div className="relative">
      <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-x-auto">
        {snippet}
      </pre>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2"
        onClick={() => onCopy(snippet, id)}
      >
        {copied === id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
        <span className="ml-1">{copied === id ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}

interface SetupWizardProps {
  onDismiss?: () => void;
}

export function SetupWizard({ onDismiss }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [keyName, setKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [selectedClient, setSelectedClient] = useState("auto");
  const [showInstallDetails, setShowInstallDetails] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const createKey = useCreateApiKey();

  useEffect(() => {
    if (step === 1 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    onDismiss?.();
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) return;
    const result = await createKey.mutateAsync({ name: keyName.trim() });
    setCreatedKey(result.key);
    setStep(2);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestConnection = async () => {
    if (!createdKey) return;
    setTestStatus("testing");
    try {
      const ok = await auth.testApiKey(createdKey);
      setTestStatus(ok ? "success" : "error");
    } catch {
      setTestStatus("error");
    }
  };

  const stepIndicator = (num: number, label: string) => (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
          step > num
            ? "bg-primary text-primary-foreground"
            : step === num
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {step > num ? <Check className="h-3.5 w-3.5" /> : num}
      </div>
      <span className={`text-sm ${step >= num ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Connect Your AI Tools</CardTitle>
            <CardDescription>Set up the MCP server to use Brain Cloud from Claude Code or other AI clients.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} title="Dismiss" aria-label="Dismiss setup wizard">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-6 pt-2">
          {stepIndicator(1, "API Key")}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {stepIndicator(2, "Configure")}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {stepIndicator(3, "Test")}
        </div>
      </CardHeader>

      <CardContent>
        {/* Step 1: Generate API Key */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-key-name">Key name</Label>
              <div className="flex gap-2">
                <Input
                  id="wizard-key-name"
                  ref={nameInputRef}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. laptop, work-desktop"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                />
                <Button onClick={handleCreateKey} disabled={!keyName.trim() || createKey.isPending}>
                  {createKey.isPending ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This key authenticates your MCP client. You can manage keys in Settings.
            </p>
          </div>
        )}

        {/* Step 2: Configure Client */}
        {step === 2 && createdKey && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your API key</Label>
              <div className="flex gap-2">
                <Input value={createdKey} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" aria-label="Copy API key" onClick={() => handleCopy(createdKey, "key")}>
                  {copied === "key" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Copy this now — it won't be shown again.</p>
            </div>

            <div className="space-y-2">
              <Label>Add to your client config</Label>
              <Tabs value={selectedClient} onValueChange={setSelectedClient}>
                <TabsList>
                  <TabsTrigger value="auto">Auto Install</TabsTrigger>
                  <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
                  <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
                <TabsContent value="auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    Installs MCP server, hooks, slash commands, and logging directives. Run in your terminal:
                  </p>
                  <ConfigBlock
                    snippet={`BRAIN_API_KEY="${createdKey}" bash <(curl -fsSL ${getServerUrl()}/install.sh)`}
                    id="config-auto"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <button
                    type="button"
                    className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowInstallDetails(!showInstallDetails)}
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showInstallDetails ? "" : "-rotate-90"}`} />
                    What gets installed
                  </button>
                  {showInstallDetails && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside pl-1">
                      <li>MCP server connection (streamable-http)</li>
                      <li>Session lifecycle hooks (auto-start, DX tracking)</li>
                      <li>Slash commands: pickup, commit, health, handoff, onboard</li>
                      <li>Logging directives for CLAUDE.md</li>
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="claude-code">
                  <p className="text-xs text-muted-foreground mb-2">
                    Add to <code className="rounded bg-muted px-1 py-0.5">~/.claude/.mcp.json</code> (global) or <code className="rounded bg-muted px-1 py-0.5">.claude/.mcp.json</code> (per-project):
                  </p>
                  <ConfigBlock snippet={configSnippet("claude-code", createdKey)} id="config-claude-code" copied={copied} onCopy={handleCopy} />
                </TabsContent>
                <TabsContent value="claude-desktop">
                  <p className="text-xs text-muted-foreground mb-2">
                    Add to <code className="rounded bg-muted px-1 py-0.5">~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code className="rounded bg-muted px-1 py-0.5">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
                  </p>
                  <ConfigBlock snippet={configSnippet("claude-desktop", createdKey)} id="config-claude-desktop" copied={copied} onCopy={handleCopy} />
                </TabsContent>
                <TabsContent value="other">
                  <p className="text-xs text-muted-foreground mb-2">
                    Use these values in your MCP-compatible client:
                  </p>
                  <ConfigBlock snippet={configSnippet("other", createdKey)} id="config-other" copied={copied} onCopy={handleCopy} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(3)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Test Connection */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verify your API key works by testing the connection.
            </p>

            <div className="flex items-center gap-3">
              <Button onClick={handleTestConnection} disabled={testStatus === "testing"}>
                {testStatus === "testing" && <Loader2 className="h-4 w-4 animate-spin" />}
                {testStatus === "testing" ? "Testing..." : "Test Connection"}
              </Button>

              {testStatus === "success" && (
                <Badge variant="default" className="bg-green-600">
                  <Check className="mr-1 h-3 w-3" /> Connected
                </Badge>
              )}
              {testStatus === "error" && (
                <Badge variant="destructive">Connection failed — check your key</Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleDismiss}>
                {testStatus === "success" ? "Done" : "I'll do this later"}
              </Button>
            </div>
          </div>
        )}

        {/* Skip link for steps 1-2 */}
        {step < 3 && (
          <div className="pt-3 text-right">
            <Button variant="link" size="sm" className="text-muted-foreground" onClick={handleDismiss}>
              I'll do this later
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { DISMISSED_KEY };
