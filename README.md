# Book-Selling-App

## Overview

Book-Selling-App is a small bookstore mobile app simulation created for a classroom assignment. It demonstrates a basic Android shopping flow: browsing books, searching, viewing details, managing a cart, checking out, viewing orders, editing a profile, writing reviews, and using AI-assisted search/chat features.

This project is intended for learning and local testing, not production deployment.

**Demo**:

<img src="demo.gif" width="85%" alt="BookStore app demo">

## Project Structure

```text
Book-Selling-App/
+-- MAD-N8-BookStoreApp/       # Android Kotlin client
+-- MAD-N8-BookStoreBackend/   # Node.js/Express backend
+-- README.md                  # Project setup notes
+-- demo.gif                   # Demo media
```

## Technologies Used

### Android App

- Kotlin
- Jetpack Compose
- Material 3
- Navigation Compose
- Retrofit and OkHttp
- Coil for image loading
- CameraX for image search support
- SQLite helper for local login session storage

### Backend

- Node.js
- Express
- Supabase JavaScript client
- PostgreSQL through Supabase
- JWT authentication
- bcryptjs for password hashing
- Multer for file upload handling
- Groq / Gemini integration points for AI features
- VNPay sandbox flow for payment simulation

### Database

The database is hosted on Supabase and uses PostgreSQL tables including:

- `Book`, `BookImages`, `Categories`, `Authors`, `Publishers`
- `Customer`, `OTP`, `Address`, `Payment`
- `Cart`, `CartItem`
- `Review`, `ViewHistory`
- `Order`, `OrderItem`
- `Voucher`, `Shipment`

Database setup files are in `MAD-N8-BookStoreBackend/`:

```text
supabase_schema_seed.sql        # Create tables and insert demo data
supabase_seed_data_only.sql     # Reset and insert demo data only
supabase_api_visibility_fix.sql # Grant REST API visibility for local testing
```

For a new Supabase project, run `supabase_schema_seed.sql` in the Supabase SQL Editor. If the schema already exists, run `supabase_seed_data_only.sql` to reload demo records.

Demo login account after seeding:

```text
email: demo@bookstore.local
password: 123456
```

## API Documentation Summary

The original project notes describe 38 backend APIs grouped into six areas:

- Authentication: register, login, forgot password, OTP verification, password change.
- Books and reviews: categories, paginated books, recommendations, detail view, text search, author/publisher lists, review read/write, AI search/chat endpoints.
- Cart: get cart, add item, update quantity, remove item.
- Profile: user profile, addresses, payment methods.
- Checkout data: vouchers, shipments, voucher validation.
- Orders: checkout from cart, buy now, order history, order detail, cancel/confirm payment.

Testing notes from the standalone Markdown files have been consolidated here: run the backend locally, use Postman/Insomnia/Thunder Client or `Invoke-RestMethod`, copy the JWT token from login for protected endpoints, and read OTP codes from the backend terminal because email delivery is simulated.

## Backend Setup and Run

Open a terminal in the backend folder:

```powershell
cd MAD-N8-BookStoreBackend
npm install
```

Create or update `.env` in `MAD-N8-BookStoreBackend/`:

```env
PORT=3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

Start the backend:

```powershell
npm start
```

The backend should run at:

```text
http://localhost:3000
```

Quick test commands:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/books/categories
Invoke-RestMethod http://127.0.0.1:3000/api/books/for-you
```

## Running the Android App in Android Studio

1. Open Android Studio.
2. Choose **File > Open**.
3. Open `MAD-N8-BookStoreApp`.
4. Wait for Gradle Sync to finish.
5. Select a connected Android device or emulator.
6. Run the `app` configuration.

If using a real Android phone, keep the backend running and map the backend port to the device:

```powershell
adb devices
adb reverse tcp:3000 tcp:3000
```

The Android app uses these backend addresses:

- Android Emulator: `http://10.0.2.2:3000`
- Real Android device through `adb reverse`: `http://127.0.0.1:3000`

Run `adb reverse tcp:3000 tcp:3000` again whenever the phone is reconnected or ADB is restarted.

## Notes

- Product browsing does not require login.
- Login is required for cart, checkout, profile, orders, and writing reviews.
- Registration and password reset generate OTP codes in the backend terminal; the project does not send real email.
- Payment and AI flows are simplified for classroom demonstration.
- Keep `.env` and other credential files out of Git.
