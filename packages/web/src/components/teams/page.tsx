import { useState } from "react";
import {
  useTeams,
  useTeam,
  useCreateTeam,
  useDeleteTeam,
  useRemoveTeamMember,
  useTeamInvites,
  useCreateTeamInvite,
  useCancelTeamInvite,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Team } from "@/lib/api";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "owner":
      return "default" as const;
    case "admin":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const createTeam = useCreateTeam();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    await createTeam.mutateAsync({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
    });
    setOpen(false);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Team"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-slug">Slug</Label>
            <Input
              id="team-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="my-team"
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier. Auto-generated from name.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-desc">Description (optional)</Label>
            <Input
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this team for?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !slug.trim() || createTeam.isPending}
          >
            {createTeam.isPending ? "Creating..." : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const createInvite = useCreateTeamInvite();

  const handleInvite = async () => {
    if (!email.trim()) return;
    await createInvite.mutateAsync({
      teamId,
      email: email.trim(),
      role,
    });
    setOpen(false);
    setEmail("");
    setRole("member");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invite link to add someone to this team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || createInvite.isPending}
          >
            {createInvite.isPending ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamDetail({
  team,
  onClose,
}: {
  team: Team;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useTeam(team.id);
  const invites = useTeamInvites(
    team.my_role === "owner" || team.my_role === "admin" ? team.id : null
  );
  const removeMember = useRemoveTeamMember();
  const cancelInvite = useCancelTeamInvite();
  const deleteTeam = useDeleteTeam();

  const isAdmin = team.my_role === "owner" || team.my_role === "admin";
  const isOwner = team.my_role === "owner";

  const handleDelete = async () => {
    if (!confirm("Delete this team? This cannot be undone.")) return;
    await deleteTeam.mutateAsync(team.id);
    onClose();
  };

  return (
    <div className="space-y-4 border-t pt-4">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Members ({detail?.members?.length ?? 0})
            </h3>
            <div className="flex gap-2">
              {isAdmin && <InviteDialog teamId={team.id} />}
            </div>
          </div>

          <div className="divide-y">
            {detail?.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.user_avatar ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {m.user_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleBadgeVariant(m.role)}>{m.role}</Badge>
                  {isAdmin && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        removeMember.mutate({
                          teamId: team.id,
                          userId: m.user_id,
                        })
                      }
                      disabled={removeMember.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && invites.data && invites.data.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Pending Invites
              </h3>
              <div className="divide-y">
                {invites.data.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{inv.role}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          cancelInvite.mutate({
                            teamId: team.id,
                            inviteId: inv.id,
                          })
                        }
                        disabled={cancelInvite.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteTeam.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteTeam.isPending ? "Deleting..." : "Delete Team"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{team.name}</CardTitle>
              {team.description && (
                <p className="text-sm text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={roleBadgeVariant(team.my_role ?? "member")}>
              {team.my_role}
            </Badge>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <TeamDetail team={team} onClose={() => setExpanded(false)} />
        </CardContent>
      )}
    </Card>
  );
}

export function TeamsPage() {
  const { data: teams, isLoading } = useTeams();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <CreateTeamDialog />
      </div>

      {!teams || teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground">
              Create a team to start collaborating with others.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
