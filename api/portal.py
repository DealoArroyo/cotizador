import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from _lib.base import SecureHandler
from _lib.render import render_error, render_portal
from _lib.ratelimit import check_rate_limit
from _lib.supabase import sb_get

TOKEN_RE = re.compile(r'^[a-f0-9]{32}$')


class handler(SecureHandler):
    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        token = (query.get('token') or [None])[0] or ''
        ip = self.client_address[0]

        if not check_rate_limit(ip):
            self._html(429, render_error('Demasiadas solicitudes. Intenta más tarde.'))
            return

        if not TOKEN_RE.match(token):
            self._html(404, render_error('Esta cotización ya no está disponible'))
            return

        if not os.environ.get('SUPABASE_URL') or not os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
            self._html(503, render_error('Servidor no configurado'))
            return

        try:
            rows = sb_get('quote_tokens', {'token': f'eq.{token}', 'select': '*'})
            if not rows:
                return self._html(404, render_error('Esta cotización ya no está disponible'))
            user_id = rows[0]['user_id']
            quote_id = rows[0]['quote_id']

            ud_rows = sb_get('user_data', {
                'user_id': f'eq.{user_id}',
                'select': 'quotations,company,settings',
            })
            if not ud_rows:
                return self._html(404, render_error('Datos no encontrados'))
            ud = ud_rows[0]

            q = next((x for x in (ud.get('quotations') or []) if x.get('id') == quote_id), None)
            if not q:
                return self._html(404, render_error('Cotización no encontrada'))
            if q.get('status') not in ('sent', 'approved', 'rejected', 'changes_requested'):
                return self._html(410, render_error('Esta cotización ya no está disponible'))

            self._html(200, render_portal(q, ud.get('company') or {}, ud.get('settings') or {}))
        except Exception as e:
            print(f'[portal GET error] {e}', flush=True)
            self._html(500, render_error('Error interno'))
