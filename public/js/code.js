const urlBase = '/api';
const extension = 'php';

function request(endpoint, body, feedbackId, onSuccess)
{
    const feedback = document.getElementById(feedbackId);
    feedback.textContent = '';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', urlBase + '/' + endpoint + '.' + extension, true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.timeout = 15000;
    xhr.onerror = function ()
    {
        feedback.textContent = 'Unable to connect. Please try again.';
    };
    xhr.ontimeout = function ()
    {
        feedback.textContent = 'Request timed out. Please try again.';
    };
    xhr.onreadystatechange = function ()
    {
        if (this.readyState !== 4) return;
        if (this.status === 0) return;
        if (this.status === 401 && endpoint !== 'Login')
        {
            window.location.href = 'index.html';
            return;
        }
        try
        {
            const data = JSON.parse(xhr.responseText);
            if (!data || Array.isArray(data) || typeof data.error !== 'string')
            {
                throw new Error('Invalid server response');
            }
            if (this.status < 200 || this.status >= 300 || data.error)
            {
                feedback.textContent = data.error || 'Request failed. Please try again.';
                return;
            }
            onSuccess(data);
        }
        catch (error)
        {
            feedback.textContent = 'Invalid server response. Please try again.';
        }
    };
    try
    {
        xhr.send(JSON.stringify(body));
    }
    catch (error)
    {
        feedback.textContent = 'Unable to connect. Please try again.';
    }
}

function validateUser(user)
{
    if (!Number.isInteger(user.id) || user.id < 1 ||
        typeof user.firstName !== 'string' || typeof user.lastName !== 'string')
    {
        throw new Error('Invalid server response');
    }
}

function doLogin()
{
    request('Login', {
        login: document.getElementById('loginName').value,
        password: document.getElementById('loginPassword').value,
    }, 'loginResult', function (user)
    {
        validateUser(user);
        window.location.href = 'color.html';
    });
}

function loadSession()
{
    request('Session', {}, 'userName', function (user)
    {
        validateUser(user);
        document.getElementById('userName').textContent = 'Logged in as ' + user.firstName + ' ' + user.lastName;
    });
}

function doLogout()
{
    request('Logout', {}, 'userName', function ()
    {
        window.location.href = 'index.html';
    });
}

function addColor()
{
    request('AddColor', { color: document.getElementById('colorText').value }, 'colorAddResult', function ()
    {
        document.getElementById('colorAddResult').textContent = 'Color has been added';
    });
}

function searchColor()
{
    const list = document.getElementById('colorList');
    list.replaceChildren();
    request('SearchColors', { search: document.getElementById('searchText').value }, 'colorSearchResult', function (data)
    {
        if (!Array.isArray(data.results) || !data.results.every(color => typeof color === 'string'))
        {
            throw new Error('Invalid server response');
        }
        for (let i = 0; i < data.results.length; i++)
        {
            if (i > 0) list.append(document.createElement('br'));
            list.append(document.createTextNode(data.results[i]));
        }
        document.getElementById('colorSearchResult').textContent = data.results.length ? 'Color(s) has been retrieved' : 'No colours found';
    });
}
