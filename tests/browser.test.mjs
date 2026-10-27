import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/code.js', import.meta.url), 'utf8');

function browser() {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            value: '', innerHTML: '', style: {}, children: [], valueText: '',
            get textContent() { return this.valueText + this.children.map(child => child.textContent).join(''); },
            set textContent(value) { this.valueText = value; this.children = []; },
            replaceChildren(...children) { this.valueText = ''; this.children = children; },
            append(...children) { this.children.push(...children); },
        });
        return elements.get(id);
    }
    const requests = [];
    const context = {
        document: { cookie: '', getElementById: element, getElementsByTagName: () => [element('colorList')], createTextNode: text => ({ nodeType: 3, textContent: text }), createElement: tag => ({ nodeType: 1, tagName: tag.toUpperCase(), textContent: '' }) },
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

test('account names are displayed as text rather than HTML', () => {
    const app = browser();
    app.run('loadSession()');
    app.respond(200, { id: 1, firstName: '<b>Alpha</b>', lastName: 'User', error: '' });
    assert.equal(app.element('userName').textContent, 'Logged in as <b>Alpha</b> User');
    assert.equal(app.element('userName').innerHTML, '');
});

test('stored colour markup remains literal text with separate result lines', () => {
    const app = browser();
    app.run('searchColor()');
    app.respond(200, { results: ['<b>red</b>', 'blue'], error: '' });
    const list = app.element('colorList');
    assert.equal(list.innerHTML, '');
    assert.equal(list.textContent, '<b>red</b>blue');
    assert.deepEqual(list.children.map(child => child.nodeType), [3, 1, 3]);
    assert.equal(list.children[1].tagName, 'BR');
});

test('empty search results clear the previous list and show a no-results message', () => {
    const app = browser();
    app.element('colorList').textContent = 'stale result';
    app.run('searchColor()');
    app.respond(200, { results: [], error: '' });
    assert.equal(app.element('colorList').textContent, '');
    assert.match(app.element('colorSearchResult').textContent, /no .*found/i);
});

test('add does not claim success when the API returns an error', () => {
    const app = browser();
    app.run('addColor()');
    app.respond(200, { error: 'Unable to add colour' });
    assert.equal(app.element('colorAddResult').textContent, 'Unable to add colour');
});

for (const [action, target] of [['doLogin()', 'loginResult'], ['loadSession()', 'userName'], ['addColor()', 'colorAddResult'], ['searchColor()', 'colorSearchResult'], ['doLogout()', 'userName']]) {
    test(`${action} handles invalid JSON, HTTP errors, network failure and timeout`, () => {
        for (const failure of ['invalid-json', 'http', 'network', 'timeout']) {
            const app = browser();
            app.run(action);
            app.element(target).textContent = '';
            if (failure === 'invalid-json') app.respond(200, 'not json');
            if (failure === 'http') app.respond(500, { error: 'Unable to process request' });
            if (failure === 'network') app.requests.at(-1).onerror();
            if (failure === 'timeout') app.requests.at(-1).ontimeout();
            assert.ok(app.element(target).textContent, failure);
            assert.equal(app.context.window.location.href, '', failure);
        }
    });
}

test('search rejects a malformed success response without retaining old results', () => {
    const app = browser();
    app.element('colorList').textContent = 'old';
    app.run('searchColor()');
    app.respond(200, { error: '', results: [null] });
    assert.equal(app.element('colorList').textContent, '');
    assert.match(app.element('colorSearchResult').textContent, /invalid/i);
});
