#!/usr/bin/env python3
"""Migrate data from old brain Postgres (via PostgREST) to Brain Cloud D1."""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

API_URL = os.environ.get("BRAIN_API_URL", "http://brain-api")
API_KEY = os.environ.get("BRAIN_API_KEY", "")
D1_USER_ID = "711ad6bb-d720-447f-bb99-d2a401571394"
DB_NAME = "brain-db"
BATCH_SIZE = 25  # D1 has limits on SQL size


def fetch(table: str, select: str = "*", limit: int = 5000, order: str = "created_at.asc") -> list:
    url = f"{API_URL}/{table}?select={select}&limit={limit}&order={order}"
    req = urllib.request.Request(url, headers={"X-API-Key": API_KEY})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def esc(val: str | None) -> str:
    """Escape a value for SQL, handling None."""
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def ts(val: str | None) -> str:
    """Convert a Postgres timestamp to D1 format."""
    if not val:
        return "NULL"
    # Take first 19 chars: 2026-03-08T04:12:02 -> 2026-03-08 04:12:02
    clean = val[:19].replace("T", " ")
    return f"'{clean}'"


def tags_to_json(val) -> str:
    """Convert Postgres array to JSON string."""
    if isinstance(val, list):
        return esc(json.dumps(val))
    return "'[]'"


def json_col(val) -> str:
    """Convert a JSONB value to JSON TEXT."""
    if val is None:
        return "'{}'"
    if isinstance(val, (dict, list)):
        return esc(json.dumps(val))
    return esc(str(val))


def run_sql(statements: list[str]):
    """Execute SQL statements against D1 in a temp file."""
    if not statements:
        return
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        # Disable FK checks for migration
        f.write("PRAGMA foreign_keys = OFF;\n")
        f.write("\n".join(statements))
        f.write("\nPRAGMA foreign_keys = ON;\n")
        f.flush()
        result = subprocess.run(
            ["npx", "wrangler", "d1", "execute", DB_NAME, "--remote", f"--file={f.name}"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            # Print first error line for debugging
            err = result.stderr.strip().split("\n")
            for line in err:
                if "ERROR" in line or "error" in line.lower():
                    print(f"    Error: {line[:200]}")
                    break
        os.unlink(f.name)


def migrate_thoughts(data: list):
    stmts = []
    for t in data:
        content = esc(t["content"])
        # Skip if content would make SQL too large (>100KB)
        if len(content) > 50000:
            print(f"    Skipping thought {t['id'][:8]}... (content too large)")
            continue

        machine_val = esc(t.get("machine_id")) if t.get("machine_id") else "NULL"
        project_val = esc(t.get("project_id")) if t.get("project_id") else "NULL"

        stmt = (
            f"INSERT OR IGNORE INTO thoughts (id, user_id, machine_id, project_id, type, content, context, tags, created_at) "
            f"VALUES ({esc(t['id'])}, {esc(D1_USER_ID)}, {machine_val}, {project_val}, "
            f"{esc(t.get('type', 'note'))}, {content}, {json_col(t.get('context', {}))}, "
            f"{tags_to_json(t.get('tags', []))}, {ts(t.get('created_at'))});"
        )
        stmts.append(stmt)

        if len(stmts) >= BATCH_SIZE:
            run_sql(stmts)
            sys.stdout.write(".")
            sys.stdout.flush()
            stmts = []

    if stmts:
        run_sql(stmts)
    print()


def migrate_decisions(data: list):
    stmts = []
    for d in data:
        machine_val = esc(d.get("machine_id")) if d.get("machine_id") else "NULL"
        project_val = esc(d.get("project_id")) if d.get("project_id") else "NULL"

        stmt = (
            f"INSERT OR IGNORE INTO decisions (id, user_id, machine_id, project_id, title, context, options, chosen, rationale, outcome, tags, created_at) "
            f"VALUES ({esc(d['id'])}, {esc(D1_USER_ID)}, {machine_val}, {project_val}, "
            f"{esc(d['title'])}, {esc(d.get('context'))}, {json_col(d.get('options', []))}, "
            f"{esc(d.get('chosen'))}, {esc(d.get('rationale'))}, {esc(d.get('outcome'))}, "
            f"{tags_to_json(d.get('tags', []))}, {ts(d.get('created_at'))});"
        )
        stmts.append(stmt)

        if len(stmts) >= BATCH_SIZE:
            run_sql(stmts)
            stmts = []

    if stmts:
        run_sql(stmts)


def migrate_sessions(data: list):
    stmts = []
    for s in data:
        machine_val = esc(s.get("machine_id")) if s.get("machine_id") else "NULL"
        project_val = esc(s.get("project_id")) if s.get("project_id") else "NULL"

        stmt = (
            f"INSERT OR IGNORE INTO sessions (id, user_id, machine_id, project_id, started_at, ended_at, mood_start, mood_end, goals, accomplishments, blockers, summary) "
            f"VALUES ({esc(s['id'])}, {esc(D1_USER_ID)}, {machine_val}, {project_val}, "
            f"{ts(s.get('started_at'))}, {ts(s.get('ended_at'))}, "
            f"{esc(s.get('mood_start'))}, {esc(s.get('mood_end'))}, "
            f"{json_col(s.get('goals', []))}, {json_col(s.get('accomplishments', []))}, "
            f"{json_col(s.get('blockers', []))}, {esc(s.get('summary'))});"
        )
        stmts.append(stmt)

        if len(stmts) >= BATCH_SIZE:
            run_sql(stmts)
            stmts = []

    if stmts:
        run_sql(stmts)


def migrate_sentiment(data: list):
    stmts = []
    for r in data:
        project_val = esc(r.get("project_id")) if r.get("project_id") else "NULL"

        stmt = (
            f"INSERT OR IGNORE INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, project_id, created_at) "
            f"VALUES ({esc(r['id'])}, {esc(D1_USER_ID)}, {esc(r['target_type'])}, "
            f"{esc(r['target_name'])}, {esc(r['feeling'])}, {r.get('intensity', 3)}, "
            f"{esc(r.get('reason'))}, {project_val}, {ts(r.get('created_at'))});"
        )
        stmts.append(stmt)

        if len(stmts) >= BATCH_SIZE:
            run_sql(stmts)
            stmts = []

    if stmts:
        run_sql(stmts)


def main():
    print("=== Brain Postgres → D1 Migration ===\n")

    # Machines
    machines = fetch("machines", "id,hostname,os,arch,metadata,created_at")
    print(f"Machines: {len(machines)} found")
    if machines:
        stmts = []
        for m in machines:
            stmts.append(
                f"INSERT OR IGNORE INTO machines (id, user_id, hostname, os, arch, metadata, created_at) "
                f"VALUES ({esc(m['id'])}, {esc(D1_USER_ID)}, {esc(m['hostname'])}, "
                f"{esc(m.get('os'))}, {esc(m.get('arch'))}, {json_col(m.get('metadata', {}))}, "
                f"{ts(m.get('created_at'))});"
            )
        run_sql(stmts)
        print(f"  Imported {len(stmts)}")

    # Projects
    projects = fetch("projects", "id,name,repo_url,description,metadata,created_at")
    print(f"Projects: {len(projects)} found")
    if projects:
        stmts = []
        for p in projects:
            stmts.append(
                f"INSERT OR IGNORE INTO projects (id, name, repo_url, description, owner_id, metadata, created_at) "
                f"VALUES ({esc(p['id'])}, {esc(p['name'])}, {esc(p.get('repo_url'))}, "
                f"{esc(p.get('description'))}, {esc(D1_USER_ID)}, {json_col(p.get('metadata', {}))}, "
                f"{ts(p.get('created_at'))});"
            )
        run_sql(stmts)
        print(f"  Imported {len(stmts)}")

    # Thoughts
    thoughts = fetch("thoughts", "id,user_id,machine_id,project_id,type,content,context,tags,created_at")
    print(f"Thoughts: {len(thoughts)} found")
    if thoughts:
        migrate_thoughts(thoughts)
        print(f"  Imported")

    # Decisions
    decisions = fetch("decisions", "id,user_id,machine_id,project_id,title,context,options,chosen,rationale,outcome,tags,created_at")
    print(f"Decisions: {len(decisions)} found")
    if decisions:
        migrate_decisions(decisions)
        print(f"  Imported")

    # Sessions
    sessions = fetch("sessions", "id,user_id,machine_id,project_id,started_at,ended_at,mood_start,mood_end,goals,accomplishments,blockers,summary", order="started_at.asc")
    print(f"Sessions: {len(sessions)} found")
    if sessions:
        migrate_sessions(sessions)
        print(f"  Imported")

    # Sentiment
    sentiment = fetch("sentiment", "id,user_id,target_type,target_name,feeling,intensity,reason,project_id,created_at")
    print(f"Sentiment: {len(sentiment)} found")
    if sentiment:
        migrate_sentiment(sentiment)
        print(f"  Imported")

    print("\n=== Migration Complete ===")
    print("Verify at: https://dash.brain-ai.dev/dashboard")


if __name__ == "__main__":
    main()
