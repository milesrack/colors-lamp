const urlBase = '/api';
const extension = 'php';

function doLogin()
{

		let login = document.getElementById("loginName").value;
		let password = document.getElementById("loginPassword").value;

		document.getElementById("loginResult").textContent = "";

		let tmp = {login:login,password:password};

	let jsonPayload = JSON.stringify( tmp );

	let url = urlBase + '/Login.' + extension;

	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function()
		{
			if (this.readyState == 4 && this.status == 200)
			{
				let jsonObject = JSON.parse( xhr.responseText );
				let userId = jsonObject.id;

				if( userId < 1 )
				{
					document.getElementById("loginResult").textContent = "User/Password combination incorrect";
					return;
				}


				window.location.href = "color.html";
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("loginResult").textContent = err.message;
	}

}

function loadSession()
{
    let xhr = new XMLHttpRequest();
    xhr.open("POST", urlBase + '/Session.' + extension, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.onreadystatechange = function()
    {
        if (this.readyState != 4) return;
        if (this.status == 401)
        {
            window.location.href = "index.html";
        }
        else if (this.status == 200)
        {
            let user = JSON.parse(xhr.responseText);
            document.getElementById("userName").textContent = "Logged in as " + user.firstName + " " + user.lastName;
        }
    };
    xhr.send("{}");
}

function doLogout()
{
    let xhr = new XMLHttpRequest();
    xhr.open("POST", urlBase + '/Logout.' + extension, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.onreadystatechange = function()
    {
        if (this.readyState == 4 && (this.status == 200 || this.status == 401))
        {
            window.location.href = "index.html";
        }
    };
    xhr.send("{}");
}

function addColor()
{
	let newColor = document.getElementById("colorText").value;
	document.getElementById("colorAddResult").textContent = "";

	let tmp = {color:newColor};
	let jsonPayload = JSON.stringify( tmp );

	let url = urlBase + '/AddColor.' + extension;

	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function()
		{
            if (this.readyState == 4 && this.status == 401)
            {
                window.location.href = "index.html";
                return;
            }
			if (this.readyState == 4 && this.status == 200)
			{
				document.getElementById("colorAddResult").textContent = "Color has been added";
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("colorAddResult").textContent = err.message;
	}

}

function searchColor()
{
	let srch = document.getElementById("searchText").value;
	document.getElementById("colorSearchResult").textContent = "";


	let tmp = {search:srch};
	let jsonPayload = JSON.stringify( tmp );

	let url = urlBase + '/SearchColors.' + extension;

	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function()
		{
            if (this.readyState == 4 && this.status == 401)
            {
                window.location.href = "index.html";
                return;
            }
			if (this.readyState == 4 && this.status == 200)
			{
				document.getElementById("colorSearchResult").textContent = "Color(s) has been retrieved";
				let jsonObject = JSON.parse( xhr.responseText );

                let list = document.getElementById("colorList");
                list.replaceChildren();
                for (let i = 0; i < jsonObject.results.length; i++)
                {
                    if (i > 0) list.append(document.createElement("br"));
                    list.append(document.createTextNode(jsonObject.results[i]));
                }
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("colorSearchResult").textContent = err.message;
	}

}
