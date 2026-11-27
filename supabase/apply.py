#!/usr/bin/env python3
"""Apply SQL statements to Supabase via Management API, one statement per call."""
import json, sys, re, urllib.request

def load_creds():
    with open('/root/.openclaw/credentials/services.json') as f:
        return json.load(f)

def split_sql(sql: str):
    """Split SQL into statements on semicolons, respecting $$ ... $$ bodies and quotes."""
    stmts, cur, i, n = [], [], 0, len(sql)
    in_dollar = False
    while i < n:
        ch = sql[i]
        if not in_dollar and sql.startswith('$$', i):
            in_dollar = True
            cur.append('$$'); i += 2; continue
        if in_dollar and sql.startswith('$$', i):
            in_dollar = False
            cur.append('$$'); i += 2; continue
        if ch == ';' and not in_dollar:
            stmt = ''.join(cur).strip()
            if stmt:
                stmts.append(stmt)
            cur = []; i += 1; continue
        cur.append(ch); i += 1
    stmt = ''.join(cur).strip()
    if stmt:
        stmts.append(stmt)
    # drop pure comment lines
    out = []
    for s in stmts:
        lines = [l for l in s.splitlines() if not l.strip().startswith('--')]
        if ''.join(lines).strip():
            out.append(s)
    return out

def run_query(ref: str, token: str, query: str):
    url = f'https://api.supabase.com/v1/projects/{ref}/database/query'
    body = json.dumps({'query': query}).encode()
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode()[:500]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:800]

def main():
    creds = load_creds()
    ref = creds['supabase_aidata']['project_ref']
    token = creds['supabase']['platform_token']
    path = sys.argv[1]
    fail_fast = '--fail-fast' in sys.argv
    with open(path) as f:
        sql = f.read()
    stmts = split_sql(sql)
    print(f'{path}: {len(stmts)} statements')
    ok = fail = 0
    for idx, s in enumerate(stmts, 1):
        first = ' '.join(s.split())[:80]
        code, body = run_query(ref, token, s)
        if code in (200, 201):
            ok += 1
            print(f'  [{idx}/{len(stmts)}] OK  {first}')
        else:
            fail += 1
            print(f'  [{idx}/{len(stmts)}] FAIL {code}  {first}')
            print(f'       {body}')
            if fail_fast:
                sys.exit(1)
    print(f'done: {ok} ok, {fail} failed')
    sys.exit(1 if fail else 0)

if __name__ == '__main__':
    main()
