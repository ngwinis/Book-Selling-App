# MAD-N8 BookStore Backend

Node.js/Express backend for the Book-Selling-App classroom project.

## Stack

- Node.js and Express
- Supabase JavaScript client
- PostgreSQL on Supabase
- JWT authentication
- bcryptjs password hashing
- Multer file upload handling
- Groq/Gemini integration points for AI features
- VNPay sandbox payment simulation

## Setup

```powershell
npm install
```

Create `.env` in this folder:

```env
PORT=3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

## Database

Run the SQL files in Supabase SQL Editor:

1. `supabase_schema_seed.sql` for a fresh database.
2. `supabase_seed_data_only.sql` when tables already exist and only demo data needs to be reset.
3. `supabase_api_visibility_fix.sql` if REST API calls return empty data because table access is blocked.

## Run

```powershell
npm start
```

Default server URL:

```text
http://localhost:3000
```

## Useful Tests

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/books/categories
Invoke-RestMethod http://127.0.0.1:3000/api/books/for-you
```

## Notes

- OTP email delivery is simulated by printing OTP codes in the backend terminal.
- Some AI and payment flows are simplified for classroom demonstration.
- Do not commit `.env` or real credentials.
