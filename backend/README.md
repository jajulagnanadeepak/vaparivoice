# VoiceStock AI Backend — Phase 1

This is the initial FastAPI + MongoDB Atlas foundation. It does **not** yet contain authentication or inventory write endpoints. Those must be added before shop data operations are exposed.

## 1. Place the folder

Extract `backend/` into the root of your existing `voicestock-ai` project, beside `src/`. Do not replace or delete your frontend.

## 2. Create and activate a virtual environment (Windows PowerShell)

```powershell
cd path\to\voicestock-ai\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, use the venv's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 3. Configure MongoDB Atlas

Copy `.env.example` to `.env` and replace `MONGODB_URI` with your Atlas Python-driver connection string.

- Create a dedicated database user with only the required database permissions.
- Add your current IP in Atlas Network Access for local development.
- URL-encode special characters in the database user's password.
- Do not commit or share `.env`.
- Do not use `0.0.0.0/0` as a production network-access rule.

## 4. Run the API

From the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

Check these URLs:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/health/live
- http://127.0.0.1:8000/health/ready
- http://127.0.0.1:8000/docs

`/health/ready` checks Atlas connectivity. If it returns HTTP 503, verify the URI, database credentials, Atlas IP access list, and network connectivity.

## Next phase

Add authentication and shop-level authorization before creating product, sale, stock-movement, or correction endpoints. Never trust a shop ID supplied by the frontend as proof of access.
