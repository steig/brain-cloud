import { useState } from "react";
import { useProjects, useUpdateProject } from "@/lib/queries";
import type { Project } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, ExternalLink, Check, X, Pencil } from "lucide-react";

function ProjectCard({ project, onSelect, isSelected }: { project: Project; onSelect: (p: Project) => void; isSelected: boolean }) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-primary/50 ${isSelected ? "border-primary" : ""}`}
      onClick={() => onSelect(project)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <Badge variant="outline" className="text-xs capitalize">
            {project.visibility ?? "private"}
          </Badge>
        </div>
        {project.description && (
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        {project.repo_url && (
          <a
            href={project.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            {project.repo_url.replace(/^https?:\/\//, "")}
          </a>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

function ProjectSettings({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [repoUrl, setRepoUrl] = useState(project.repo_url ?? "");
  const [visibility, setVisibility] = useState(project.visibility ?? "private");

  const resetForm = () => {
    setName(project.name);
    setDescription(project.description ?? "");
    setRepoUrl(project.repo_url ?? "");
    setVisibility(project.visibility ?? "private");
    setEditing(false);
  };

  const handleSave = async () => {
    await updateProject.mutateAsync({
      id: project.id,
      name: name.trim(),
      description: description.trim() || undefined,
      repo_url: repoUrl.trim() || undefined,
      visibility,
    });
    setEditing(false);
  };

  // Reset form when project changes
  if (!editing && name !== project.name) {
    resetForm();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Settings</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>Manage settings for {project.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!editing}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repo_url">Repository URL</Label>
          <Input
            id="repo_url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={!editing}
            placeholder="https://github.com/owner/repo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select value={visibility} onValueChange={setVisibility} disabled={!editing}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls who can see this project and its data.
          </p>
        </div>
        {editing && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!name.trim() || updateProject.isPending} size="sm">
              <Check className="mr-1 h-3 w-3" />
              {updateProject.isPending ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={resetForm} size="sm">
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [selected, setSelected] = useState<Project | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Projects</h1>
      {!projects?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No projects yet. Projects are created automatically when you start a session with a project context.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-2">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onSelect={(proj) => setSelected(proj)}
                  isSelected={selected?.id === p.id}
                />
              ))}
            </div>
          </div>
          <div>
            {selected ? (
              <ProjectSettings key={selected.id} project={selected} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">Select a project to view settings</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
