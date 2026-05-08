# API Testing Guide

Use Postman, Insomnia, Thunder Client, or PowerShell `Invoke-RestMethod` to test the backend.

## Preparation

1. Start the backend:

```powershell
cd MAD-N8-BookStoreBackend
npm install
npm start
```

2. Confirm the server is reachable:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/books/categories
```

3. For protected APIs, log in first and copy the returned JWT token.
4. OTP codes are printed in the backend terminal. This project does not send real email.

## Suggested Test Order

1. Register a user with `POST /api/auth/register`.
2. Copy the OTP from the backend terminal.
3. Verify the OTP with `POST /api/auth/verify-otp` if needed.
4. Log in with `POST /api/auth/login` and save the JWT token.
5. Test public book APIs: categories, book list, recommendations, detail, search.
6. Test cart APIs with a valid `customerId`.
7. Test profile address and payment APIs.
8. Test checkout data APIs: vouchers, shipments, voucher validation.
9. Create an order through checkout or buy-now.
10. Test order history, order detail, cancel, and payment confirmation flows.

## PowerShell Examples

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/books/categories
Invoke-RestMethod http://127.0.0.1:3000/api/books/for-you
Invoke-RestMethod 'http://127.0.0.1:3000/api/books?page=1&limit=5'
Invoke-RestMethod 'http://127.0.0.1:3000/api/books/search?q=harry'
```

Login example:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"demo@bookstore.local","password":"123456"}'
```

When testing protected endpoints, send:

```text
Authorization: Bearer <token>
```

## Android Device Note

For a real Android device connected by USB, run:

```powershell
adb reverse tcp:3000 tcp:3000
```

This lets the Android app call the local backend through `http://127.0.0.1:3000`.
