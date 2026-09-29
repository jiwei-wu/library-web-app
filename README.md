# Library Desk — Web Interface

A responsive, dependency-free frontend for the [Library Desk Spring Boot API](https://github.com/jiwei-wu/library-management-system). It uses the Fetch API and plain HTML/CSS/JavaScript.

## Features

- Search and browse book titles with pagination and live availability.
- Register titles and readers; add physical copies to existing titles.
- Select a book, borrow a physical copy, inspect a reader's loan history and return copies.
- Display clear API errors, including unavailable copies and reached loan limits.

## Run

1. Start the backend according to its README. By default it runs at `http://localhost:8080` with an in-memory H2 database.
2. In this directory, start a static web server:

   ```bash
   python3 -m http.server 5500
   ```

3. Open `http://localhost:5500`. The frontend uses `http://localhost:8080/api` by default. Open it from this address rather than from a `file://` URL, as the backend permits the localhost:5500 web origin.

If the backend runs on a different host, change the `API` constant at the top of `app.js`.

## Technical notes

Dynamic text is inserted via `textContent` instead of HTML interpolation. The frontend is a local operations demo and has no user sign-in; it assumes a trusted staff user. Reader IDs are shown after registration and can be entered to view a reader's history.

The GitHub Actions workflow checks JavaScript syntax on pushes and pull requests.
