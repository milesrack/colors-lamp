import assert from 'node:assert/strict';
import { test } from 'node:test';

const base = process.env.COLORS_TEST_URL;
assert.ok(base, 'Run through tests/run.sh to use the disposable database');

function client() {
    let cookie = '';
    return {
        get cookie() { return cookie; },
        async post(endpoint, body = {}) {
            const response = await fetch(`${base}/api/${endpoint}.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Cookie: cookie },
                body: JSON.stringify(body),
            });
            const setCookie = response.headers.getSetCookie().find(value => value.startsWith('colors_session='));
            if (setCookie) cookie = setCookie.split(';')[0];
            return { status: response.status, body: await response.json(), headers: response.headers };
        },
    };
}

async function login(user, name = 'alpha') {
    const response = await user.post('Login', { login: name, password: 'test-password' });
    assert.equal(response.status, 200);
    assert.equal(response.body.id, name === 'alpha' ? 1 : 2);
    return response;
}

test('anonymous requests cannot read or add colours using a forged owner', async () => {
    const user = client();
    assert.equal((await user.post('SearchColors', { search: '', userId: 2 })).status, 401);
    assert.equal((await user.post('AddColor', { color: 'intruder', userId: 2 })).status, 401);
});

test('authenticated searches and inserts use the session owner', async () => {
    const alpha = client();
    const beta = client();
    await login(alpha);
    await login(beta, 'beta');
    assert.deepEqual((await alpha.post('SearchColors', { search: '', userId: 2 })).body.results, ['red']);
    assert.equal((await alpha.post('AddColor', { color: 'private-green', userId: 2 })).status, 200);
    assert.deepEqual((await alpha.post('SearchColors', { search: 'private-green' })).body.results, ['private-green']);
    const other = await beta.post('SearchColors', { search: 'private-green' });
    assert.ok(!other.body.results?.includes('private-green'));
});

test('login rotates the session and session status survives page reload', async () => {
    const user = client();
    await user.post('Session');
    await login(user);
    const previousCookie = user.cookie;
    const response = await login(user);
    assert.notEqual(user.cookie, previousCookie);
    const replay = await fetch(`${base}/api/Session.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: previousCookie }, body: '{}',
    });
    assert.equal(replay.status, 401);
    const cookie = response.headers.getSetCookie().join(';');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /path=\//i);
    assert.equal((await user.post('Session')).body.id, 1);
});

test('logout revokes the old session and failed login clears prior identity', async () => {
    const user = client();
    await login(user);
    const oldCookie = user.cookie;
    assert.equal((await user.post('Logout')).status, 200);
    const response = await fetch(`${base}/api/SearchColors.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: oldCookie }, body: '{"search":""}',
    });
    assert.equal(response.status, 401);
    await login(user);
    await user.post('Login', { login: 'beta', password: 'incorrect' });
    assert.equal((await user.post('Session')).status, 401);
});

test('cross-origin form submissions cannot change authentication state', async () => {
    const response = await fetch(`${base}/api/Login.php`, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"login":"alpha","password":"test-password"}',
    });
    assert.equal(response.status, 415);
    const get = await fetch(`${base}/api/Login.php`);
    assert.equal(get.status, 405);
});

test('expired server sessions cannot be extended by a forged browser identity', async () => {
    const response = await fetch(`${base}/api/SearchColors.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'colors_session=colors-expired-test; firstName=Beta,lastName=User,userId=2' },
        body: '{"search":"","userId":2}',
    });
    assert.equal(response.status, 401);
});
