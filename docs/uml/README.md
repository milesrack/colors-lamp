# COLORS UML diagrams

These diagrams model the existing COLORS application from Labs 1–3. Editable
sources and rendered images are kept together; open any `.drawio` file in draw.io.

| Diagram | Editable source | Rendered diagram |
| --- | --- | --- |
| Use case | [usecase.drawio](usecase.drawio) | [usecase.png](usecase.png) |
| Activity | [activity.drawio](activity.drawio) | [activity.png](activity.png) |
| Class | [class.drawio](class.drawio) | [class.png](class.png) |

## Use case

![Use case diagram](usecase.png)

The User interacts with four use cases inside the application boundary: log in,
add a colour, search colours and log out. The normal UI workflow reaches colour
management after login. This ordering is not an `include` or `extend` relationship.
There is no registration, colour editing or colour deletion functionality.

## Activity

![Activity diagram](activity.png)

The activity follows login, credential rejection and retry, repeated add/search
actions, and logout. Action prefixes identify the User, Browser and API/database
responsibilities. These prefixes replace swimlanes to keep the three alternative
branches and their return paths readable. Decision guards select one outgoing
flow; diamonds also merge alternative incoming flows.

The scope is ordinary HTTP 200 responses and successful database execution,
including invalid credentials and a search with no matches. It does not model
malformed or expired cookies, transport failures, database exceptions or every
possible JavaScript failure.

Implementation details that affect interpretation:

- Login verifies the supplied password using `password_verify`. The documented
  account-creation procedure stores a bcrypt hash.
- The browser stores the first name, last name and user ID in one cookie with a
  20-minute expiry. This is browser identity state, not a server-side session.
- Add and search receive `userId` from the browser; neither endpoint authenticates
  the caller or validates a server-side session.
- Add displays its success message for any HTTP 200 response without checking the
  JSON `error` field. The diagram shows this behaviour, not guaranteed insertion
  for every possible response.
- Search uses `Name LIKE '%<search>%'` and the supplied user ID. SQL wildcard
  characters in the input retain their `LIKE` meaning; an empty term can match
  all colours belonging to that user.
- When no colours match, the API returns `error: "No Records Found"` without
  `results`. The browser first displays its retrieval message, then accessing
  `jsonObject.results.length` fails in the asynchronous callback. The displayed
  list is not updated. The page remains available for another action.
- Logout resets browser variables, expires the identity cookie and navigates to
  `index.html`; it makes no API request.

## Class

![Class diagram](class.png)

This is a conceptual domain class diagram mapped to the implemented database.
`User` represents the `Users` table and `Color` represents `Colors`. The application
uses procedural PHP and JavaScript; these are not claimed to be declared PHP or
JavaScript classes. No invented domain methods, inheritance or service classes
are shown. Attribute names preserve the schema's spelling and capitalisation.

Every `Color` belongs to exactly one `User`; a `User` may own zero or more colours.
The ordinary association reflects `Colors.UserId REFERENCES Users(ID)`. It does
not assert composition or cascading deletion. `Integer` maps to SQL `INT` and
`String` to `VARCHAR`; names are limited to 50 characters for user names/login and
255 for the password hash and colour name. Both IDs are auto-incrementing primary
keys; `Login` is unique and every column is `NOT NULL`.

## Source traceability

| Model element | Implementation evidence |
| --- | --- |
| Login controls and entry point | [`public/index.html`](../../public/index.html), `doLogin()` in [`public/js/code.js`](../../public/js/code.js) |
| Credential lookup and verification | [`api/Login.php`](../../api/Login.php) |
| Cookie save/read, page navigation and logout | `saveCookie()`, `readCookie()`, `doLogout()` in [`public/js/code.js`](../../public/js/code.js); [`public/color.html`](../../public/color.html) |
| Add controls, request and feedback | [`public/color.html`](../../public/color.html), `addColor()` in [`public/js/code.js`](../../public/js/code.js) |
| Colour insertion | [`api/AddColor.php`](../../api/AddColor.php) |
| Search request, list rendering and empty-result failure | `searchColor()` in [`public/js/code.js`](../../public/js/code.js) |
| User-filtered search and result/error responses | [`api/SearchColors.php`](../../api/SearchColors.php) |
| Class attributes, multiplicities and constraints | [`database/schema.sql`](../../database/schema.sql) |
| Database connection | [`config/database.php`](../../config/database.php) |
| Bcrypt account creation and documented limitations | Root [`README.md`](../../README.md) |

## Editing and rendering

The PNGs were exported with draw.io Desktop 31.5.2 at 2× scale, with a white
background, a 24-unit border and embedded editable diagram data. The standalone
`.drawio` files are the primary editable sources. Export again after every edit
so the source and image agree.

From the repository root on macOS:

```sh
/Applications/draw.io.app/Contents/MacOS/draw.io \
  --export --format png --scale 2 --border 24 --embed-diagram --theme light \
  docs/uml/usecase.drawio docs/uml/activity.drawio docs/uml/class.drawio
```

On other platforms, use the equivalent draw.io executable or **File → Export as →
PNG** with the same settings. Inspect all three exports for clipped labels,
connector crossings, arrow direction and legibility before committing.

## Submission

Submit the GitHub URL of the final pushed commit containing all three editable
sources and their PNG exports. Use the commit URL, rather than a branch or pull
request URL, as required by the assignment.
