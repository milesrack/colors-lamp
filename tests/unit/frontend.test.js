const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '../../public/js/code.js'), 'utf8');
const pages = ['index.html', 'color.html'].map(file =>
    readFileSync(path.join(__dirname, '../../public', file), 'utf8'));

function browser() {
    document.body.innerHTML = pages.map(html =>
        new DOMParser().parseFromString(html, 'text/html').body.innerHTML).join('');
    const requests = [];
    const context = {
        document,
        // jsdom does not implement page navigation; record the requested destination.
        window: { location: { href: '' } },
        XMLHttpRequest: jest.fn(function () {
            requests.push(this);
            this.open = jest.fn();
            this.setRequestHeader = jest.fn();
            this.send = jest.fn();
        }),
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {
        context,
        element: id => document.getElementById(id),
        requests,
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
    expect(app.requests.at(-1).open).toHaveBeenCalledWith('POST', '/api/Session.php', true);
    app.respond(200, { id: 1, firstName: 'Alpha', lastName: 'User', error: '' });
    const label = app.element('userName');
    expect(label.textContent).toBe('Logged in as Alpha User');
});

test('expired sessions redirect to login', () => {
    const app = browser();
    app.run('loadSession()');
    app.respond(401, { error: 'Authentication required' });
    expect(app.context.window.location.href).toBe('index.html');
});

test('logout waits for server confirmation', () => {
    const app = browser();
    app.run('doLogout()');
    expect(app.context.window.location.href).toBe('');
    expect(app.requests.at(-1).open).toHaveBeenCalledWith('POST', '/api/Logout.php', true);
    app.respond(200, { error: '' });
    expect(app.context.window.location.href).toBe('index.html');
});

for (const action of ['addColor()', 'searchColor()']) {
    test(`${action} redirects after the server session expires`, () => {
        const app = browser();
        app.run(action);
        app.respond(401, { error: 'Authentication required' });
        expect(app.context.window.location.href).toBe('index.html');
    });
}

test('account names are displayed as text rather than HTML', () => {
    const app = browser();
    app.run('loadSession()');
    app.respond(200, { id: 1, firstName: '<b>Alpha</b>', lastName: 'User', error: '' });
    expect(app.element('userName').textContent).toBe('Logged in as <b>Alpha</b> User');
    expect(app.element('userName').querySelector('b')).toBeNull();
});

test('stored colour markup remains literal text with separate result lines', () => {
    const app = browser();
    app.run('searchColor()');
    app.respond(200, { results: ['<b>red</b>', 'blue'], error: '' });
    const list = app.element('colorList');
    expect(list.querySelector('b')).toBeNull();
    expect(list.textContent).toBe('<b>red</b>blue');
    expect(Array.from(list.childNodes, child => child.nodeType)).toEqual([3, 1, 3]);
    expect(list.childNodes[1].tagName).toBe('BR');
});

test('empty search results clear the previous list and show a no-results message', () => {
    const app = browser();
    app.element('colorList').textContent = 'stale result';
    app.run('searchColor()');
    app.respond(200, { results: [], error: '' });
    expect(app.element('colorList').textContent).toBe('');
    expect(app.element('colorSearchResult').textContent).toBe('No colours found');
});

test('add does not claim success when the API returns an error', () => {
    const app = browser();
    app.run('addColor()');
    app.respond(200, { error: 'Unable to add colour' });
    expect(app.element('colorAddResult').textContent).toBe('Unable to add colour');
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
            expect(app.element(target).textContent).toBe({
                'invalid-json': 'Invalid server response. Please try again.',
                http: 'Unable to process request',
                network: 'Unable to connect. Please try again.',
                timeout: 'Request timed out. Please try again.',
            }[failure]);
            expect(app.context.window.location.href).toBe('');
        }
    });
}

test('search rejects a malformed success response without retaining old results', () => {
    const app = browser();
    app.element('colorList').textContent = 'old';
    app.run('searchColor()');
    app.respond(200, { error: '', results: [null] });
    expect(app.element('colorList').textContent).toBe('');
    expect(app.element('colorSearchResult').textContent).toBe('Invalid server response. Please try again.');
});

test('adding a colour sends JSON and waits for confirmation before showing success', () => {
    const app = browser();
    app.element('colorText').value = 'blue';
    app.run('addColor()');
    const request = app.requests.at(-1);
    expect(request.open).toHaveBeenCalledWith('POST', '/api/AddColor.php', true);
    expect(request.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=UTF-8');
    expect(request.send).toHaveBeenCalledWith(JSON.stringify({ color: 'blue' }));
    expect(app.element('colorAddResult').textContent).toBe('');
    app.respond(200, { error: '' });
    expect(app.element('colorAddResult').textContent).toBe('Color has been added');
});

test.each([
    { id: 0, firstName: 'Alpha', lastName: 'User' },
    { id: -1, firstName: 'Alpha', lastName: 'User' },
    { id: 1.5, firstName: 'Alpha', lastName: 'User' },
    { id: '1', firstName: 'Alpha', lastName: 'User' },
    { id: 1, firstName: null, lastName: 'User' },
    { id: 1, firstName: 'Alpha' },
])('login rejects a malformed user: %j', user => {
    const app = browser();
    app.run('doLogin()');
    app.respond(200, { ...user, error: '' });
    expect(app.element('loginResult').textContent).toBe('Invalid server response. Please try again.');
    expect(app.context.window.location.href).toBe('');
});

test('login sends credentials and navigates after a valid response', () => {
    const app = browser();
    app.element('loginName').value = 'alpha';
    app.element('loginPassword').value = ' password ';
    app.run('doLogin()');
    expect(app.requests.at(-1).send).toHaveBeenCalledWith(JSON.stringify({ login: 'alpha', password: ' password ' }));
    expect(app.context.window.location.href).toBe('');
    app.respond(200, { id: 1, firstName: 'Alpha', lastName: 'User', error: '' });
    expect(app.context.window.location.href).toBe('color.html');
});
