# MAD-N8 BookStore Android App

Android client for the Book-Selling-App classroom project.

## Stack

- Kotlin
- Jetpack Compose
- Material 3
- Navigation Compose
- Retrofit and OkHttp
- Coil
- CameraX
- Local SQLite helper for login session storage

## Run in Android Studio

1. Open Android Studio.
2. Choose **File > Open**.
3. Select this folder: `MAD-N8-BookStoreApp`.
4. Wait for Gradle Sync to complete.
5. Start the backend in `MAD-N8-BookStoreBackend`.
6. Select an emulator or connected Android phone.
7. Run the `app` configuration.

## Backend Connection

The app is configured for local backend testing:

- Emulator: `http://10.0.2.2:3000`
- Real phone with ADB reverse: `http://127.0.0.1:3000`

For a real phone, run:

```powershell
adb devices
adb reverse tcp:3000 tcp:3000
```

Run the reverse command again after reconnecting the phone or restarting ADB.

## Login

After seeding the database, use:

```text
email: demo@bookstore.local
password: 123456
```

Browsing products is public. Cart, checkout, profile, orders, and review submission require login.
