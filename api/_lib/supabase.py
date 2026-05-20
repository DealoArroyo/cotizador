import json
import os
import urllib.request
import urllib.parse


def sb_get(table, params):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    url += '?' + urllib.parse.urlencode(params)
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    req = urllib.request.Request(url, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def sb_patch(table, params, body):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    url += '?' + urllib.parse.urlencode(params)
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status


def sb_upsert(table, body):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status
