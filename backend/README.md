# Backend

Environment variables:

- `DB_USER` (required), `DB_PASSWORD` (required), `DB_HOST` (default `127.0.0.1`), `DB_PORT` (default `3306`), `DB_NAME` (default `demoapp`)

Run: `DB_USER=... DB_PASSWORD=... node app.js` (port 4000)

Passwords are stored as scrypt hashes (`salt:hash`). Rows created before this change hold plaintext passwords and will no longer log in; reset them through add-employee or re-hash them.
