import unittest
from unittest.mock import patch, MagicMock
import json
import os

ENV = {
    'UPSTASH_REDIS_REST_URL': 'https://test.upstash.io',
    'UPSTASH_REDIS_REST_TOKEN': 'testtoken',
}

class TestCheckRateLimit(unittest.TestCase):
    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_allows_request_under_limit(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps([
            {'result': 5},
            {'result': 1},
        ]).encode()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertTrue(result)

    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_blocks_request_over_limit(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps([
            {'result': 31},
            {'result': 1},
        ]).encode()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertFalse(result)

    @patch('_lib.ratelimit.urllib.request.urlopen')
    def test_fails_open_on_redis_error(self, mock_open):
        mock_open.side_effect = Exception('Redis unreachable')

        with patch.dict(os.environ, ENV):
            from _lib import ratelimit
            result = ratelimit.check_rate_limit('1.2.3.4')

        self.assertTrue(result)

if __name__ == '__main__':
    unittest.main()
