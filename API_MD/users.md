# User Management API Documentation

This document details the **User Management API endpoints** (`Create User`, `User Login`, and `User Logout`) used in the Grace Fresh Market system.

---

## 1. POST `/api/users` (or `/api/users/create`)

Creates a new user record, generates a JWT authentication token, and persists the token in the `userLogin` table.

### Request Details
- **HTTP Method**: `POST`
- **URL Path**: `/api/users` (or `/api/users/create`)
- **Headers**: `Content-Type: application/json`
- **Authentication**: Public (Unauthenticated)

### Request Body Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fullName` | `string` | Yes | Full name of the user. |
| `email` | `string` | Yes | Unique valid email address for the user. |
| `phoneNumber` | `string` | Yes | Phone number of the user. |
| `password` | `string` | Yes | Password for the account (minimum 6 characters). |
| `fcmToken` | `string` | No | Optional Firebase Cloud Messaging (FCM) device token for push notifications (also accepts `fcm_token`). Saved into `userLogin` table. |

### Example Request Body

```json
{
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecretPassword123",
  "fcmToken": "dwhUL5LQ0uuWwqcDOX2R2c:APA91bG2s-s3jWQomdeqiys5W0ZuaOALtMKZL1SOv..."
}
```

### Example Successful Response (`201 Created`)

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "phoneNumber": "+1234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. POST `/api/users/login`

Authenticates an existing user with email and password, generates a new JWT token, and records the token entry along with `fcmToken` in `userLogin`.

### Request Details
- **HTTP Method**: `POST`
- **URL Path**: `/api/users/login`
- **Headers**: `Content-Type: application/json`
- **Authentication**: Public (Unauthenticated)

### Request Body Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | User's registered email address. |
| `password` | `string` | Yes | User's password. |
| `fcmToken` | `string` | No | Optional Firebase Cloud Messaging (FCM) device token for push notifications (also accepts `fcm_token`). Saved into `userLogin` table. |

### Example Request Body

```json
{
  "email": "jane.doe@example.com",
  "password": "SecretPassword123",
  "fcmToken": "dwhUL5LQ0uuWwqcDOX2R2c:APA91bG2s-s3jWQomdeqiys5W0ZuaOALtMKZL1SOv..."
}
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "phoneNumber": "+1234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 3. POST `/api/users/logout`

Logs out the current user session by deleting the active JWT token from the `userLogin` database table and clearing the `user_token` HTTP cookie.

### Request Details
- **HTTP Method**: `POST`
- **URL Path**: `/api/users/logout`
- **Headers**: `Authorization: Bearer <token>` (optional if cookie is present)
- **Cookie**: `user_token=<token>`

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 4. GET `/api/users/get-all` (or `/api/users`, `/api/user/get-all`) - Get User Details

Retrieves details for registered user(s), including full name, email address, phone number, total address count, cart item count, and saved delivery addresses.

### Request Details
- **HTTP Method**: `GET`
- **URL Paths**: `/api/users/get-all`, `/api/users`, or `/api/user/get-all`
- **Authentication**: 
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`. Returns details for that specific logged-in user.
  - **Option B**: Pass `id` / `userId` in query parameters.
  - **Option C**: Pass `all=true` in query parameters to list all registered users (admin mode).

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` / `userId` | `number` | No | - | Optional specific user ID parameter. |
| `all` | `boolean` | No | `false` | Set to `true` to list all users when calling with admin credentials or unauthenticated. |
| `search` / `q` | `string` | No | - | Filter users by matching `fullName`, `email`, or `phoneNumber`. |
| `page` | `number` | No | `1` | Page number for pagination. |
| `limit` | `number` | No | `50` | Number of user records per page (max `100`). |
| `includeAddresses` | `boolean` | No | `true` | Include user addresses in response (`true` or `false`). |

### Example Request (Authenticated via Cookie or Token)
`GET /api/users/get-all`

### Example Response for Authenticated User (`200 OK`)

```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "id": 1,
    "fullName": "Jane Doe",
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phoneNumber": "+919876543210",
    "phone_number": "+919876543210",
    "createdAt": "2026-08-30T16:20:00.000Z",
    "updatedAt": "2026-08-30T16:20:00.000Z",
    "addressCount": 1,
    "cartItemCount": 3,
    "addresses": [
      {
        "id": 1,
        "userId": 1,
        "buildingName": "Flat 402, Oakwood Towers",
        "streetName": "100 Feet Ring Road, Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "addressType": "home",
        "isDefault": true,
        "createdAt": "2026-09-01T00:15:00.000Z",
        "updatedAt": "2026-09-01T00:15:00.000Z"
      }
    ]
  }
}
```

---

### Error Responses

#### 1. Validation Error (`400 Bad Request`)

When required fields (`email` or `password`) are missing during login/registration:

```json
{
  "error": "Email is required."
}
```

#### 2. Authentication Error (`401 Unauthorized`)

When email is not registered or password does not match during login:

```json
{
  "error": "Invalid email or password."
}
```

#### 3. Internal Server Error (`500 Internal Server Error`)

When a database connection or server error occurs:

```json
{
  "error": "An unexpected authentication error occurred."
}
```

---

## Database Impact

- **`users` table**: Stores `id`, `fullName`, `email`, `phoneNumber`, hashed `password`, `created_at`, `updated_at`.
- **`userLogin` table**: Stores `id`, `user_id` (foreign key to `users.id`), `token` (JWT string), `fcmToken` (Firebase Cloud Messaging push notification device token), and `created_at`. Every successful registration or login inserts a new active session record into `userLogin` along with the provided `fcmToken`. On logout, the token session is deleted from `userLogin`.
