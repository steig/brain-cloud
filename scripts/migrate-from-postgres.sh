#!/usr/bin/env bash
# Migrate data from old brain Postgres (via PostgREST) to Brain Cloud D1
# Usage: ./scripts/migrate-from-postgres.sh
set -euo pipefail

API_URL="${BRAIN_API_URL:?Set BRAIN_API_URL}"
API_KEY="${BRAIN_API_KEY:?Set BRAIN_API_KEY}"
D1_USER_ID="711ad6bb-d720-447f-bb99-d2a401571394"
BATCH_SIZE=50
WRANGLER="npx wrangler"
DB_NAME="brain-db"

fetch_all() {
  local table=$1
  local select=${2:-"*"}
  local limit=${3:-5000}
  curl -s -H "X-API-Key: $API_KEY" \
    "$API_URL/$table?select=$select&limit=$limit&order=created_at.asc"
}

escape_sql() {
  # Escape single quotes for SQL
  printf '%s' "$1" | sed "s/'/''/g"
}

echo "=== Brain Postgres → D1 Migration ==="
echo ""

# --- Machines ---
echo "Fetching machines..."
machines=$(fetch_all machines)
machine_count=$(echo "$machines" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $machine_count machines"

if [ "$machine_count" -gt 0 ]; then
  echo "$machines" | python3 -c "
import sys, json

machines = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for m in machines:
    mid = m['id']
    hostname = m['hostname'].replace(\"'\", \"''\")
    os_val = (m.get('os') or '').replace(\"'\", \"''\")
    arch = (m.get('arch') or '').replace(\"'\", \"''\")
    metadata = json.dumps(m.get('metadata', {})).replace(\"'\", \"''\")
    created = m.get('created_at', '')[:19].replace('T', ' ')

    print(f\"INSERT OR IGNORE INTO machines (id, user_id, hostname, os, arch, metadata, created_at) VALUES ('{mid}', '{user_id}', '{hostname}', '{os_val}', '{arch}', '{metadata}', '{created}');\")
" > /tmp/migrate_machines.sql

  $WRANGLER d1 execute "$DB_NAME" --remote --file=/tmp/migrate_machines.sql 2>&1 | tail -3
  echo "  Imported machines"
fi

# --- Projects ---
echo "Fetching projects..."
projects=$(fetch_all projects)
project_count=$(echo "$projects" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $project_count projects"

if [ "$project_count" -gt 0 ]; then
  echo "$projects" | python3 -c "
import sys, json

projects = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for p in projects:
    pid = p['id']
    name = p['name'].replace(\"'\", \"''\")
    repo = (p.get('repo_url') or '').replace(\"'\", \"''\")
    desc = (p.get('description') or '').replace(\"'\", \"''\")
    metadata = json.dumps(p.get('metadata', {})).replace(\"'\", \"''\")
    created = p.get('created_at', '')[:19].replace('T', ' ')

    print(f\"INSERT OR IGNORE INTO projects (id, name, repo_url, description, owner_id, metadata, created_at) VALUES ('{pid}', '{name}', '{repo}', '{desc}', '{user_id}', '{metadata}', '{created}');\")
" > /tmp/migrate_projects.sql

  $WRANGLER d1 execute "$DB_NAME" --remote --file=/tmp/migrate_projects.sql 2>&1 | tail -3
  echo "  Imported projects"
fi

# --- Thoughts (main data - 660 rows) ---
echo "Fetching thoughts..."
thoughts=$(fetch_all thoughts "id,user_id,machine_id,project_id,type,content,context,tags,created_at" 5000)
thought_count=$(echo "$thoughts" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $thought_count thoughts"

if [ "$thought_count" -gt 0 ]; then
  echo "$thoughts" | python3 -c "
import sys, json

thoughts = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for t in thoughts:
    tid = t['id']
    machine_id = t.get('machine_id') or ''
    project_id = t.get('project_id') or ''
    ttype = t.get('type', 'note')
    content = t['content'].replace(\"'\", \"''\")
    context = json.dumps(t.get('context', {})).replace(\"'\", \"''\")
    # Postgres returns tags as array, D1 stores as JSON string
    tags = t.get('tags', [])
    if isinstance(tags, list):
        tags_json = json.dumps(tags).replace(\"'\", \"''\")
    else:
        tags_json = '[]'
    created = t.get('created_at', '')[:19].replace('T', ' ')

    machine_val = f\"'{machine_id}'\" if machine_id else 'NULL'
    project_val = f\"'{project_id}'\" if project_id else 'NULL'

    print(f\"INSERT OR IGNORE INTO thoughts (id, user_id, machine_id, project_id, type, content, context, tags, created_at) VALUES ('{tid}', '{user_id}', {machine_val}, {project_val}, '{ttype}', '{content}', '{context}', '{tags_json}', '{created}');\")
" > /tmp/migrate_thoughts.sql

  # Split into batches for D1
  total_lines=$(wc -l < /tmp/migrate_thoughts.sql)
  echo "  Importing $total_lines thoughts in batches..."

  split -l $BATCH_SIZE /tmp/migrate_thoughts.sql /tmp/migrate_thoughts_batch_

  for batch in /tmp/migrate_thoughts_batch_*; do
    $WRANGLER d1 execute "$DB_NAME" --remote --file="$batch" 2>&1 | tail -1
  done

  rm -f /tmp/migrate_thoughts_batch_*
  echo "  Imported thoughts"
fi

# --- Decisions ---
echo "Fetching decisions..."
decisions=$(fetch_all decisions "id,user_id,machine_id,project_id,title,context,options,chosen,rationale,outcome,tags,created_at" 5000)
decision_count=$(echo "$decisions" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $decision_count decisions"

if [ "$decision_count" -gt 0 ]; then
  echo "$decisions" | python3 -c "
import sys, json

decisions = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for d in decisions:
    did = d['id']
    machine_id = d.get('machine_id') or ''
    project_id = d.get('project_id') or ''
    title = d['title'].replace(\"'\", \"''\")
    context = (d.get('context') or '').replace(\"'\", \"''\")
    options = json.dumps(d.get('options', [])).replace(\"'\", \"''\")
    chosen = (d.get('chosen') or '').replace(\"'\", \"''\")
    rationale = (d.get('rationale') or '').replace(\"'\", \"''\")
    outcome = (d.get('outcome') or '').replace(\"'\", \"''\")
    tags = d.get('tags', [])
    if isinstance(tags, list):
        tags_json = json.dumps(tags).replace(\"'\", \"''\")
    else:
        tags_json = '[]'
    created = d.get('created_at', '')[:19].replace('T', ' ')

    machine_val = f\"'{machine_id}'\" if machine_id else 'NULL'
    project_val = f\"'{project_id}'\" if project_id else 'NULL'

    print(f\"INSERT OR IGNORE INTO decisions (id, user_id, machine_id, project_id, title, context, options, chosen, rationale, outcome, tags, created_at) VALUES ('{did}', '{user_id}', {machine_val}, {project_val}, '{title}', '{context}', '{options}', '{chosen}', '{rationale}', '{outcome}', '{tags_json}', '{created}');\")
" > /tmp/migrate_decisions.sql

  $WRANGLER d1 execute "$DB_NAME" --remote --file=/tmp/migrate_decisions.sql 2>&1 | tail -3
  echo "  Imported decisions"
fi

# --- Sessions ---
echo "Fetching sessions..."
sessions=$(fetch_all sessions "id,user_id,machine_id,project_id,started_at,ended_at,mood_start,mood_end,goals,accomplishments,blockers,summary" 5000)
session_count=$(echo "$sessions" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $session_count sessions"

if [ "$session_count" -gt 0 ]; then
  echo "$sessions" | python3 -c "
import sys, json

sessions = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for s in sessions:
    sid = s['id']
    machine_id = s.get('machine_id') or ''
    project_id = s.get('project_id') or ''
    started = s.get('started_at', '')[:19].replace('T', ' ')
    ended = s.get('ended_at') or ''
    if ended:
        ended = ended[:19].replace('T', ' ')
    mood_start = (s.get('mood_start') or '').replace(\"'\", \"''\")
    mood_end = (s.get('mood_end') or '').replace(\"'\", \"''\")
    goals = json.dumps(s.get('goals', [])).replace(\"'\", \"''\")
    accomplishments = json.dumps(s.get('accomplishments', [])).replace(\"'\", \"''\")
    blockers = json.dumps(s.get('blockers', [])).replace(\"'\", \"''\")
    summary = (s.get('summary') or '').replace(\"'\", \"''\")

    machine_val = f\"'{machine_id}'\" if machine_id else 'NULL'
    project_val = f\"'{project_id}'\" if project_id else 'NULL'
    ended_val = f\"'{ended}'\" if ended else 'NULL'

    print(f\"INSERT OR IGNORE INTO sessions (id, user_id, machine_id, project_id, started_at, ended_at, mood_start, mood_end, goals, accomplishments, blockers, summary) VALUES ('{sid}', '{user_id}', {machine_val}, {project_val}, '{started}', {ended_val}, '{mood_start}', '{mood_end}', '{goals}', '{accomplishments}', '{blockers}', '{summary}');\")
" > /tmp/migrate_sessions.sql

  $WRANGLER d1 execute "$DB_NAME" --remote --file=/tmp/migrate_sessions.sql 2>&1 | tail -3
  echo "  Imported sessions"
fi

# --- Sentiment ---
echo "Fetching sentiment..."
sentiment=$(fetch_all sentiment "id,user_id,target_type,target_name,feeling,intensity,reason,project_id,created_at" 5000)
sentiment_count=$(echo "$sentiment" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $sentiment_count sentiment records"

if [ "$sentiment_count" -gt 0 ]; then
  echo "$sentiment" | python3 -c "
import sys, json

records = json.load(sys.stdin)
user_id = '$D1_USER_ID'

for r in records:
    rid = r['id']
    target_type = r['target_type']
    target_name = r['target_name'].replace(\"'\", \"''\")
    feeling = r['feeling']
    intensity = r.get('intensity', 3)
    reason = (r.get('reason') or '').replace(\"'\", \"''\")
    project_id = r.get('project_id') or ''
    created = r.get('created_at', '')[:19].replace('T', ' ')

    project_val = f\"'{project_id}'\" if project_id else 'NULL'

    print(f\"INSERT OR IGNORE INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, project_id, created_at) VALUES ('{rid}', '{user_id}', '{target_type}', '{target_name}', '{feeling}', {intensity}, '{reason}', {project_val}, '{created}');\")
" > /tmp/migrate_sentiment.sql

  $WRANGLER d1 execute "$DB_NAME" --remote --file=/tmp/migrate_sentiment.sql 2>&1 | tail -3
  echo "  Imported sentiment"
fi

# Cleanup
rm -f /tmp/migrate_*.sql

echo ""
echo "=== Migration Complete ==="
echo "Verify at: https://dash.brain-ai.dev/dashboard"
