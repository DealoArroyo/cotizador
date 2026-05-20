import os
import sys
import urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from _lib.base import SecureHandler
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get, sb_patch
from _lib.validate import TOKEN_RE


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

            for qt in quotations:
                if qt.get('id') == quote_id:
                    if not qt.get('viewedAt'):
                        qt['viewedAt'] = now
                    qt['lastViewedAt'] = now
                    qt['viewCount'] = qt.get('viewCount', 0) + 1
                    break

            sb_patch('user_data', {'user_id': f'eq.{user_id}'}, {'quotations': quotations})
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[viewed error] {e}', flush=True)
            self._json(500, {'error': 'Internal server error'})
