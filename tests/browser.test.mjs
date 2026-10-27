import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/code.js', import.meta.url), 'utf8');

function browser() {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, { value: '', innerHTML: '', textContent: '', style: {} });
        return elements.get(id);
    }
    const requests = [];
    const context = {
        document: { cookie: '', getElementById: element, getElementsByTagName: () => [element('colorList')] },
        window: { location: { href: '' } },
        XMLHttpRequest: class {
            constructor() { requests.push(this); this.headers = {}; }
            open(method, url) { this.method = method; this.url = url; }
            setRequestHeader(name, value) { this.headers[name] = value; }
            send(body) { this.body = body; }
        },
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {
        context, element, requests,
        run(code) { return vm.runInContext(code, context); },
        respond(status, body) {
            const request = requests.at(-1);
            request.readyState = 4;
            request.status = status;
            request.responseText = typeof body === 'string' ? body : JSON.stringify(body);
            request.onreadystatechange.call(request);
        },
    };
}

test('page reload checks the server session instead of browser identity', () => {
    const app = browser();
    app.context.document.cookie = 'firstName=Forged,lastName=User,userId=2';
    app.run('loadSession()');
    assert.equal(app.requests.at(-1).url, '/api/Session.php');
    app.respond(200, { id: 1, firstName: 'Alpha', lastName: 'User', error: '' });
    const label = app.element('userName');
    assert.equal(label.textContent || label.innerHTML, 'Logged in as Alpha User');
});

test('expired sessions redirect to login', () => {
    const app = browser();
    app.run('loadSession()');
    app.respond(401, { error: 'Authentication required' });
    assert.equal(app.context.window.location.href, 'index.html');
});

test('logout waits for server confirmation', () => {
    const app = browser();
    app.run('doLogout()');
    assert.equal(app.context.window.location.href, '');
    assert.equal(app.requests.at(-1).url, '/api/Logout.php');
    app.respond(200, { error: '' });
    assert.equal(app.context.window.location.href, 'index.html');
});

for (const action of ['addColor()', 'searchColor()']) {
    test(`${action} redirects after the server session expires`, () => {
        const app = browser();
        app.run(action);
        app.respond(401, { error: 'Authentication required' });
        assert.equal(app.context.window.location.href, 'index.html');
    });
}
