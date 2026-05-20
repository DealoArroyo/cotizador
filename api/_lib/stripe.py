import json
import os
import urllib.parse
import urllib.request


def _encode(data, prefix=''):
    items = []
    for k, v in data.items():
        key = f'{prefix}[{k}]' if prefix else k
        if isinstance(v, dict):
            items.extend(_encode(v, key))
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    items.extend(_encode(item, f'{key}[{i}]'))
                else:
                    items.append((f'{key}[{i}]', str(item)))
        else:
            items.append((key, str(v)))
    return items


def stripe_request(method, path, data=None):
    url = 'https://api.stripe.com/v1/' + path.lstrip('/')
    body = urllib.parse.urlencode(_encode(data)).encode() if data else None
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            'Authorization': 'Bearer ' + os.environ['STRIPE_SECRET_KEY'],
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())
