const { execFileSync } = require('node:child_process');
const path = require('node:path');

const base = process.env.COLORS_TEST_URL;
if (!base) throw new Error('Run npm run test:integration to use the disposable database');

beforeEach(() => {
    execFileSync('docker', [
        'compose', '-p', process.env.COLORS_TEST_PROJECT,
        '-f', path.join(__dirname, '../compose.yaml'),
        'exec', '-T', 'web', 'php', 'tests/seed.php',
    ], { stdio: 'pipe', timeout: 15000 });
});

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
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json\b/);
    expect(response.body).toEqual({
        id: name === 'alpha' ? 1 : 2,
        firstName: name === 'alpha' ? 'Alpha' : 'Beta',
        lastName: 'User',
        error: '',
    });
    return response;
}

test('anonymous requests cannot read or add colours using a forged owner', async () => {
    const user = client();
    expect((await user.post('SearchColors', { search: '', userId: 2 })).status).toBe(401);
    expect((await user.post('AddColor', { color: 'intruder', userId: 2 })).status).toBe(401);
});

test('authenticated searches and inserts use the session owner', async () => {
    const alpha = client();
    const beta = client();
    await login(alpha);
    await login(beta, 'beta');
    expect((await alpha.post('SearchColors', { search: '', userId: 2 })).body.results).toEqual(['red']);
    const added = await alpha.post('AddColor', { color: 'private-green', userId: 2 });
    expect(added.status).toBe(200);
    expect(added.headers.get('content-type')).toMatch(/^application\/json\b/);
    expect(added.body).toEqual({ error: '' });
    const found = await alpha.post('SearchColors', { search: 'private-green' });
    expect(found.status).toBe(200);
    expect(found.headers.get('content-type')).toMatch(/^application\/json\b/);
    expect(found.body).toEqual({ results: ['private-green'], error: '' });
    const other = await beta.post('SearchColors', { search: 'private-green' });
    expect(other.status).toBe(200);
    expect(other.body).toEqual({ results: [], error: '' });
});

test('login rotates the session and session status survives page reload', async () => {
    const user = client();
    await user.post('Session');
    await login(user);
    const previousCookie = user.cookie;
    const response = await login(user);
    expect(user.cookie).not.toBe(previousCookie);
    const replay = await fetch(`${base}/api/Session.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: previousCookie }, body: '{}',
    });
    expect(replay.status).toBe(401);
    const cookie = response.headers.getSetCookie().join(';');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/path=\//i);
    expect((await user.post('Session')).body.id).toBe(1);
});

test('logout revokes the old session', async () => {
    const user = client();
    await login(user);
    const oldCookie = user.cookie;
    expect((await user.post('Logout')).status).toBe(200);
    const response = await fetch(`${base}/api/SearchColors.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: oldCookie }, body: '{"search":""}',
    });
    expect(response.status).toBe(401);
});

test('cross-origin form submissions cannot change authentication state', async () => {
    const response = await fetch(`${base}/api/Login.php`, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"login":"alpha","password":"test-password"}',
    });
    expect(response.status).toBe(415);
    const get = await fetch(`${base}/api/Login.php`);
    expect(get.status).toBe(405);
});

test('expired server sessions cannot be extended by a forged browser identity', async () => {
    const response = await fetch(`${base}/api/SearchColors.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'colors_session=colors-expired-test; firstName=Beta,lastName=User,userId=2' },
        body: '{"search":"","userId":2}',
    });
    expect(response.status).toBe(401);
});

test('quotes, backslashes, Unicode and markup round-trip as JSON values', async () => {
    const user = client();
    await login(user);
    const colours = ['roundtrip "red"', 'roundtrip back\\slash', 'roundtrip café 名', 'roundtrip <b>red</b>'];
    for (const color of colours) {
        expect((await user.post('AddColor', { color })).status).toBe(200);
    }
    expect((await user.post('SearchColors', { search: 'roundtrip' })).body.results).toEqual(colours);
    const quoted = client();
    const response = await quoted.post('Login', { login: 'quoted', password: 'test-password' });
    expect(response.body.firstName).toBe('A"\\名');
    expect(response.body.lastName).toBe('<b>User</b>');
});

test('empty searches return all owned colours and no matches return an empty array', async () => {
    const user = client();
    await login(user);
    const all = await user.post('SearchColors', { search: '' });
    expect(all.status).toBe(200);
    expect(all.body).toEqual({ results: ['red'], error: '' });
    const none = await user.post('SearchColors', { search: 'does-not-exist' });
    expect(none.status).toBe(200);
    expect(none.body.results).toEqual([]);
    expect(none.body.error).toBe('');
});

test('malformed JSON and non-object bodies are rejected consistently', async () => {
    const user = client();
    await login(user);
    for (const body of ['{', 'null', '[]', '"string"', '1', '']) {
        const response = await fetch(`${base}/api/AddColor.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: user.cookie }, body,
        });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toEqual(expect.any(String));
    }
});

test('required strings and schema length limits are validated before database access', async () => {
    const user = client();
    await login(user);
    for (const color of [undefined, null, 1, [], {}, '', '   ', 'x'.repeat(256), '名'.repeat(256)]) {
        expect((await user.post('AddColor', { color })).status).toBe(422);
    }
    for (const search of [undefined, null, 1, [], {}, 'x'.repeat(256)]) {
        expect((await user.post('SearchColors', { search })).status).toBe(422);
    }
    for (const body of [{}, { login: [], password: 'x' }, { login: 'x'.repeat(51), password: 'x' }, { login: 'alpha', password: '' }, { login: 'alpha', password: null }]) {
        expect((await client().post('Login', body)).status).toBe(422);
    }
    expect((await user.post('AddColor', { color: '名'.repeat(255) })).status).toBe(200);
    expect((await user.post('SearchColors', { search: '名'.repeat(255) })).body.results).toEqual(['名'.repeat(255)]);
});

test('failed login returns HTTP 401 without retaining an authenticated session', async () => {
    const user = client();
    await login(user);
    expect((await user.post('Login', { login: 'alpha', password: 'incorrect' })).status).toBe(401);
    expect((await user.post('Session')).status).toBe(401);
});

test('oversized JSON bodies are rejected without processing them', async () => {
    const response = await fetch(`${base}/api/Login.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'alpha', password: 'x'.repeat(65536) }),
    });
    expect(response.status).toBe(413);
    expect((await response.json()).error).toEqual(expect.any(String));
});

test('password whitespace is preserved during authentication', async () => {
    const user = client();
    expect((await user.post('Login', { login: 'spaced', password: 'test-password' })).status).toBe(401);
    const valid = await user.post('Login', { login: 'spaced', password: '  test-password  ' });
    expect(valid.status).toBe(200);
    expect(valid.body.id).toBe(4);
});
