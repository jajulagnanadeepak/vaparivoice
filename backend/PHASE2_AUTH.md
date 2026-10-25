# VoiceStock AI — Phase 2 authentication

## Apply the update

Copy these files into your existing project, overwriting the matching files under `backend/`. This bundle does not contain `.env` and will not overwrite your Atlas credentials.

- `app/config.py`
- `app/security.py` (new)
- `app/auth.py` (new)
- `app/main.py`
- `requirements.txt`
- `.env.example`

Keep your existing `app/database.py`, `app/__init__.py`, `.gitignore`, and private `.env`.

## Add settings to `backend/.env`

Make sure these two lines exist. Use the secret you generated locally earlier; do not use the placeholder.

```dotenv
JWT_SECRET_KEY=YOUR_EXISTING_GENERATED_SECRET
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Install and run

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

## Test in Swagger

Open `http://127.0.0.1:8000/docs`.

1. `POST /api/v1/auth/register`: create a test shop and owner.
2. Copy the returned `access_token`.
3. Click **Authorize**, enter `Bearer YOUR_ACCESS_TOKEN` if the dialog expects the full value (otherwise enter the token alone according to the UI), and authorize.
4. `GET /api/v1/auth/me`: confirm the authenticated user and shop ID.
5. `POST /api/v1/auth/login`: log in with the same email and password.
6. Try `/me` without a token; it should return HTTP 401.

Use a test account and a unique email. Passwords must be at least 10 characters.

## Security notes

- The API returns a signed short-lived access token; it does not return password hashes.
- The shop ID is resolved from the authenticated user's database record, not accepted from a client request.
- User email has a unique index.
- Registration creates a shop and owner as two writes with cleanup on failure; production should use a transaction or a robust recovery strategy if atomic account creation is required.
- Access tokens currently last 30 minutes; refresh/logout/session revocation are not implemented yet.
- This is the first auth milestone, not a complete production security review. Do not expose inventory write endpoints until authorization, validation, idempotency, and concurrency tests are added.
