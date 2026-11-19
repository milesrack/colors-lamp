
const base = process.env.COLORS_TEST_URL;
if (!base) throw new Error('Run npm run test:integration to use the disposable database');

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
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Unable to process request' });
    });
}
