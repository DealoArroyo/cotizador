import json
import os
import sys
import time
import urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib.base import SecureHandler
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get, sb_patch
from _lib.validate import TOKEN_RE
MAX_BODY = 8 * 1024


class handler(SecureHandler):
    def do_POST(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        token = (query.get('token') or [None])[0] or ''
        ip = self.client_address[0]

        if not check_rate_limit(ip):
            self._json(429, {'error': 'Too many requests'})
            return

        if not TOKEN_RE.match(token):
            self._json(404, {'error': 'not found'})
            return

        length = int(self.headers.get('Content-Length', 0))
        if length > MAX_BODY:
            self._json(413, {'error': 'Payload too large'})
            return

        body = json.loads(self.rfile.read(length)) if length else {}
        action = body.get('action')
        if action not in ('approved', 'rejected', 'changes_requested'):
            self._json(400, {'error': 'invalid action'})
            return

        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._json(404, {'error': 'not found'})
            user_id, quote_id = rows[0]['user_id'], rows[0]['quote_id']

            ud_rows = sb_get('user_data', {'user_id': f'eq.{user_id}', 'select': 'quotations'})
            if not ud_rows:
                return self._json(404, {'error': 'not found'})
            quotations = ud_rows[0].get('quotations') or []
            now = datetime.now(timezone.utc).isoformat()

            comment = str(body.get('comment', ''))[:1000].strip()
            client_name = str(body.get('clientName', ''))[:100].strip()
            signed_at = str(body.get('signedAt', ''))[:40].strip()

            for qt in quotations:
                if qt.get('id') == quote_id:
                    qt['status'] = action
                    if action == 'approved':
                        qt['approvedAt'] = now
                    elif action == 'rejected':
                        qt['rejectedAt'] = now
                    else:
                        qt['changesRequestedAt'] = now
                    if comment:
                        qt['clientComment'] = comment
                    if client_name:
                        qt['clientName'] = client_name
                    if signed_at:
                        qt['signedAt'] = signed_at
                    break

            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            token_prefix = token[:8]
            print(
                f'[portal:action] {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} '
                f'ip={ip} token={token_prefix}... action={action}',
                flush=True,
            )
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[action error] {e}', flush=True)
            self._json(500, {'error': 'Internal server error'})
