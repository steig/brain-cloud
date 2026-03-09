#!/usr/bin/env python3
"""Import JSON exports from brain Postgres into Brain Cloud D1."""
import json
import os
import subprocess
import sys
import tempfile

D1_USER_ID = "711ad6bb-d720-447f-bb99-d2a401571394"
DB_NAME = "brain-db"
BATCH_SIZE = 20


def esc(val) -> str:
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def ts(val) -> str:
    if not val:
        return "NULL"
    clean = str(val)[:19].replace("T", " ")
    return f"'{clean}'"


def fk(val) -> str:
    """FK value — NULL if empty."""
    if not val:
        return "NULL"
    return esc(val)


def run_sql(statements: list[str]):
    if not statements:
        return
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write("PRAGMA foreign_keys = OFF;\n")
        f.write("\n".join(statements))
        f.write("\nPRAGMA foreign_keys = ON;\n")
        f.flush()
        result = subprocess.run(
            ["npx", "wrangler", "d1", "execute", DB_NAME, "--remote", f"--file={f.name}"],
            capture_output=True, text=True, timeout=60
        )
        os.unlink(f.name)
        if result.returncode != 0:
            for line in result.stderr.split("\n"):
                if "ERROR" in line:
                    print(f"\n  ERR: {line[:200]}")
                    break


def load_json(path: str) -> list:
    if not os.path.exists(path):
        return []
    with open(path) as f:
        data = json.load(f)
    return data if data else []


def batch_import(rows, to_sql, label):
    stmts = []
    count = 0
    for row in rows:
        try:
            stmt = to_sql(row)
            if stmt:
                stmts.append(stmt)
        except Exception as e:
            print(f"\n  Skip: {e}")
            continue

        if len(stmts) >= BATCH_SIZE:
            run_sql(stmts)
            count += len(stmts)
            sys.stdout.write(".")
            sys.stdout.flush()
            stmts = []

    if stmts:
        run_sql(stmts)
        count += len(stmts)
        sys.stdout.write(".")
        sys.stdout.flush()

    print(f"\n  {label}: {count} imported")


def main():
    print("=== JSON → D1 Import ===\n")
    uid = esc(D1_USER_ID)

    # Machines
    machines = load_json("/tmp/brain_machines.json")
    print(f"Machines: {len(machines)} found")
    batch_import(machines, lambda m: (
        f"INSERT OR IGNORE INTO machines (id, user_id, hostname, os, arch, metadata, created_at) "
        f"VALUES ({esc(m['id'])}, {uid}, {esc(m['hostname'])}, {esc(m.get('os'))}, "
        f"{esc(m.get('arch'))}, {esc(m.get('metadata', '{}'))}, {ts(m.get('created_at'))});"
    ), "machines")

    # Projects
    projects = load_json("/tmp/brain_projects.json")
    print(f"Projects: {len(projects)} found")
    batch_import(projects, lambda p: (
        f"INSERT OR IGNORE INTO projects (id, name, repo_url, description, owner_id, metadata, created_at) "
        f"VALUES ({esc(p['id'])}, {esc(p['name'])}, {esc(p.get('repo_url'))}, "
        f"{esc(p.get('description'))}, {uid}, {esc(p.get('metadata', '{}'))}, {ts(p.get('created_at'))});"
    ), "projects")

    # Decisions
    decisions = load_json("/tmp/brain_decisions.json")
    print(f"Decisions: {len(decisions)} found")
    batch_import(decisions, lambda d: (
        f"INSERT OR IGNORE INTO decisions (id, user_id, machine_id, project_id, title, context, options, chosen, rationale, outcome, tags, created_at, updated_at) "
        f"VALUES ({esc(d['id'])}, {uid}, {fk(d.get('machine_id'))}, {fk(d.get('project_id'))}, "
        f"{esc(d['title'])}, {esc(d.get('context'))}, {esc(d.get('options', '[]'))}, "
        f"{esc(d.get('chosen'))}, {esc(d.get('rationale'))}, {esc(d.get('outcome'))}, "
        f"{esc(d.get('tags', '[]'))}, {ts(d.get('created_at'))}, {ts(d.get('updated_at'))});"
    ), "decisions")

    # Sessions
    sessions = load_json("/tmp/brain_sessions.json")
    print(f"Sessions: {len(sessions)} found")
    batch_import(sessions, lambda s: (
        f"INSERT OR IGNORE INTO sessions (id, user_id, machine_id, project_id, started_at, ended_at, mood_start, mood_end, goals, accomplishments, blockers, summary, metadata) "
        f"VALUES ({esc(s['id'])}, {uid}, {fk(s.get('machine_id'))}, {fk(s.get('project_id'))}, "
        f"{ts(s.get('started_at'))}, {ts(s.get('ended_at'))}, "
        f"{esc(s.get('mood_start'))}, {esc(s.get('mood_end'))}, "
        f"{esc(s.get('goals', '[]'))}, {esc(s.get('accomplishments', '[]'))}, "
        f"{esc(s.get('blockers', '[]'))}, {esc(s.get('summary'))}, "
        f"{esc(s.get('metadata', '{}'))});"
    ), "sessions")

    # Sentiment
    sentiment = load_json("/tmp/brain_sentiment.json")
    print(f"Sentiment: {len(sentiment)} found")
    batch_import(sentiment, lambda r: (
        f"INSERT OR IGNORE INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, project_id, created_at) "
        f"VALUES ({esc(r['id'])}, {uid}, {esc(r['target_type'])}, {esc(r['target_name'])}, "
        f"{esc(r['feeling'])}, {r.get('intensity', 3)}, {esc(r.get('reason'))}, "
        f"{fk(r.get('project_id'))}, {ts(r.get('created_at'))});"
    ), "sentiment")

    # Verify
    print("\n=== Verifying... ===")
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB_NAME, "--remote",
         "--command", f"SELECT 'thoughts' as t, count(*) as n FROM thoughts WHERE user_id='{D1_USER_ID}' UNION ALL SELECT 'decisions', count(*) FROM decisions WHERE user_id='{D1_USER_ID}' UNION ALL SELECT 'sessions', count(*) FROM sessions WHERE user_id='{D1_USER_ID}' UNION ALL SELECT 'machines', count(*) FROM machines WHERE user_id='{D1_USER_ID}' UNION ALL SELECT 'projects', count(*) FROM projects WHERE owner_id='{D1_USER_ID}' UNION ALL SELECT 'sentiment', count(*) FROM sentiment WHERE user_id='{D1_USER_ID}'"],
        capture_output=True, text=True, timeout=30
    )
    # Extract results
    for line in result.stdout.split("\n"):
        if '"t"' in line or '"n"' in line:
            continue
        if "thoughts" in line or "decisions" in line or "sessions" in line or "machines" in line or "projects" in line or "sentiment" in line:
            print(f"  {line.strip()}")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
