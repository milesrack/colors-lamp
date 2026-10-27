import assert from 'node:assert/strict';
import { test } from 'node:test';

const base = process.env.COLORS_TEST_URL;
assert.ok(base, 'Run through tests/run.sh to use the disposable database');

for (const [endpoint, body] of [
    ['Login', { login: 'alpha', password: 'test-password' }],
    ['AddColor', { color: 'red' }],
    ['SearchColors', { search: '' }],
]) {
    test(`${endpoint} returns a generic JSON error when the database is unavailable`, async () => {
        const response = await fetch(`${base}/api/${endpoint}.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: endpoint === 'Login' ? '' : 'colors_session=colors-database-failure-test' },
            body: JSON.stringify(body),
        });
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { error: 'Unable to process request' });
    });
}
