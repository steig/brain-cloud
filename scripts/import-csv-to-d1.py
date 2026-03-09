#!/usr/bin/env python3
"""Import CSV exports from brain Postgres into Brain Cloud D1."""
import csv
import json
import os
import subprocess
import sys
import tempfile

D1_USER_ID = "711ad6bb-d720-447f-bb99-d2a401571394"
DB_NAME = "brain-db"
BATCH_SIZE = 20


def esc(val: str | None) -> str:
    if val is None or val == "":
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def ts(val: str | None) -> str:
    if not val or val == "":
        return "NULL"
    clean = val[:19].replace("T", " ")
    return f"'{clean}'"


def run_sql(statements: list[str], label: str = ""):
    if not statements:
        return True
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
                    print(f"\n    Error in {label}: {line[:200]}")
                    return False
    return True


def import_csv(filepath: str, table: str, columns: list[str], transform_row):
    """Generic CSV importer."""
    if not os.path.exists(filepath):
        print(f"  File not found: {filepath}")
        return 0

    with open(filepath) as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print(f"  No rows in {filepath}")
        return 0

    stmts = []
    imported = 0
    cols = ", ".join(columns)

    for row in rows:
        try:
            values = transform_row(row)
            if values is None:
                continue
            vals = ", ".join(values)
            stmts.append(f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({vals});")
        except Exception as e:
            print(f"\n    Error transforming row: {e}")
            continue

        if len(stmts) >= BATCH_SIZE:
            if run_sql(stmts, table):
                imported += len(stmts)
            sys.stdout.write(".")
            sys.stdout.flush()
            stmts = []

    if stmts:
        if run_sql(stmts, table):
            imported += len(stmts)
        sys.stdout.write(".")
        sys.stdout.flush()

    print()
    return imported


def main():
    print("=== CSV → D1 Import ===\n")

    # Machines
    print("Machines:")
    count = import_csv("/tmp/brain_machines.csv", "machines",
        ["id", "user_id", "hostname", "os", "arch", "metadata", "created_at"],
        lambda r: [
            esc(r["id"]), esc(D1_USER_ID), esc(r["hostname"]),
            esc(r.get("os")), esc(r.get("arch")),
            esc(r.get("metadata", "{}")), ts(r.get("created_at")),
        ]
    )
    print(f"  {count} machines imported")

    # Projects
    print("Projects:")
    count = import_csv("/tmp/brain_projects.csv", "projects",
        ["id", "name", "repo_url", "description", "owner_id", "metadata", "created_at"],
        lambda r: [
            esc(r["id"]), esc(r["name"]), esc(r.get("repo_url")),
            esc(r.get("description")), esc(D1_USER_ID),
            esc(r.get("metadata", "{}")), ts(r.get("created_at")),
        ]
    )
    print(f"  {count} projects imported")

    # Thoughts (already have 658 from prior import, OR IGNORE handles dupes)
    print("Thoughts:")
    count = import_csv("/tmp/brain_thoughts.csv", "thoughts",
        ["id", "user_id", "machine_id", "project_id", "type", "content", "context", "tags", "created_at"],
        lambda r: [
            esc(r["id"]), esc(D1_USER_ID),
            esc(r.get("machine_id")) if r.get("machine_id") else "NULL",
            esc(r.get("project_id")) if r.get("project_id") else "NULL",
            esc(r.get("type", "note")), esc(r["content"]),
            esc(r.get("context", "{}")), esc(r.get("tags", "[]")),
            ts(r.get("created_at")),
        ]
    )
    print(f"  {count} thoughts imported")

    # Decisions
    print("Decisions:")
    count = import_csv("/tmp/brain_decisions.csv", "decisions",
        ["id", "user_id", "machine_id", "project_id", "title", "context", "options", "chosen", "rationale", "outcome", "tags", "created_at", "updated_at"],
        lambda r: [
            esc(r["id"]), esc(D1_USER_ID),
            esc(r.get("machine_id")) if r.get("machine_id") else "NULL",
            esc(r.get("project_id")) if r.get("project_id") else "NULL",
            esc(r["title"]), esc(r.get("context")),
            esc(r.get("options", "[]")), esc(r.get("chosen")),
            esc(r.get("rationale")), esc(r.get("outcome")),
            esc(r.get("tags", "[]")), ts(r.get("created_at")),
            ts(r.get("updated_at")),
        ]
    )
    print(f"  {count} decisions imported")

    # Sessions
    print("Sessions:")
    count = import_csv("/tmp/brain_sessions.csv", "sessions",
        ["id", "user_id", "machine_id", "project_id", "started_at", "ended_at", "mood_start", "mood_end", "goals", "accomplishments", "blockers", "summary", "metadata"],
        lambda r: [
            esc(r["id"]), esc(D1_USER_ID),
            esc(r.get("machine_id")) if r.get("machine_id") else "NULL",
            esc(r.get("project_id")) if r.get("project_id") else "NULL",
            ts(r.get("started_at")), ts(r.get("ended_at")),
            esc(r.get("mood_start")), esc(r.get("mood_end")),
            esc(r.get("goals", "[]")), esc(r.get("accomplishments", "[]")),
            esc(r.get("blockers", "[]")), esc(r.get("summary")),
            esc(r.get("metadata", "{}")),
        ]
    )
    print(f"  {count} sessions imported")

    # Sentiment
    print("Sentiment:")
    count = import_csv("/tmp/brain_sentiment.csv", "sentiment",
        ["id", "user_id", "target_type", "target_name", "feeling", "intensity", "reason", "project_id", "created_at"],
        lambda r: [
            esc(r["id"]), esc(D1_USER_ID),
            esc(r["target_type"]), esc(r["target_name"]),
            esc(r["feeling"]), r.get("intensity", "3"),
            esc(r.get("reason")),
            esc(r.get("project_id")) if r.get("project_id") else "NULL",
            ts(r.get("created_at")),
        ]
    )
    print(f"  {count} sentiment imported")

    print("\n=== Import Complete ===")


if __name__ == "__main__":
    main()
