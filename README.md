# Book-Selling-App

## Overview

Book-Selling-App is a small bookstore mobile app simulation created for a classroom assignment. It demonstrates a basic Android shopping flow with book browsing, search, cart, checkout-related screens, user profile, reviews, and AI-assisted features.

This project is intended for learning and local testing, not for production deployment.

**Demo**:

<img src="demo.gif" width="85%" alt="alt text">

## Project Structure

```text
Book-Selling-App/
+-- MAD-N8-BookStoreApp/       # Android client
+-- MAD-N8-BookStoreBackend/   # Node.js/Express backend
+-- README.md
```

## Technologies Used

### Android App

- Kotlin
- Jetpack Compose
- Material 3
- Navigation Compose
- Retrofit and OkHttp
- Coil for image loading
- Local SQLite for storing login session data

### Backend

- Node.js
- Express
- Supabase JavaScript client
- JWT authentication
- bcryptjs for password hashing
- Multer for file upload handling
- Groq / Gemini-related packages for AI features
- VNPay-related package for payment simulation

### Database

The database is hosted on Supabase and uses PostgreSQL tables such as:

- `Book`
- `BookImages`
- `Categories`
- `Authors`
- `Customer`
- `Cart`
- `CartItem`
- `Review`
- `Order`
- `OrderItem`
- `Address`
- `Payment`
- `Voucher`
- `Shipment`

SQL files for setting up and seeding the database are located in:

```text
MAD-N8-BookStoreBackend/
+-- supabase_schema_seed.sql        # Create schema and insert sample data
+-- supabase_seed_data_only.sql     # Insert sample data only
+-- supabase_api_visibility_fix.sql # Fix REST API access for local testing
```

For a new Supabase project, run `supabase_schema_seed.sql` first in the Supabase SQL Editor. If the tables already exist, use `supabase_seed_data_only.sql` to reset and reinsert demo data.

Demo login account after seeding:

```text
email: demo@bookstore.local
password: 123456
```

## Backend Setup and Run

Open a terminal in the backend folder:

```powershell
cd MAD-N8-BookStoreBackend
npm install
```

Create or update the `.env` file:

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

Useful test commands:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/books/categories
Invoke-RestMethod http://127.0.0.1:3000/api/books/for-you
```

## Running the Android App in Android Studio

1. Open Android Studio.
2. Choose **File > Open**.
3. Open this folder:

```text
MAD-N8-BookStoreApp
```

4. Wait for Gradle Sync to finish.
5. Select a connected Android device or emulator.
6. Run the `app` configuration.

If using a real Android phone, keep the backend running and map the backend port to the device:

```powershell
adb devices
adb reverse tcp:3000 tcp:3000
```

The Android app uses:

- `http://10.0.2.2:3000` for Android Emulator
- `http://127.0.0.1:3000` for a real device through `adb reverse`

Run `adb reverse tcp:3000 tcp:3000` again whenever the phone is reconnected or ADB is restarted.

## Notes

- Product browsing does not require login.
- Login is required for cart, checkout, profile, orders, and writing reviews.
- Registration creates an OTP in the backend and prints the OTP in the backend terminal. It does not send a real email.
- This project is a classroom simulation, so some payment and AI flows are simplified for demonstration.
