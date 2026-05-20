import json
import os
import urllib.request

RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60  # segundos


def check_rate_limit(ip: str) -> bool:
    """Sliding window rate limit via Upstash Redis pipeline. Fail open."""
    url = os.environ['UPSTASH_REDIS_REST_URL'].rstrip('/') + '/pipeline'
    token = os.environ['UPSTASH_REDIS_REST_TOKEN']
    key = f'rl:{ip}'
    commands = [
        ['INCR', key],
        ['EXPIRE', key, RATE_LIMIT_WINDOW, 'NX'],
    ]
    data = json.dumps(commands).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method='POST',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            results = json.loads(r.read())
            count = results[0]['result']
            return count <= RATE_LIMIT_MAX
    except Exception:
        return True  # fail open: si Redis no responde, deja pasar
