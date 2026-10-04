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

## 5. DELETE `/api/user/delete/:userId` (or `/api/users/delete/:userId`)

Permanently hard deletes a user account and all associated relational data from the database and storage.

### Pre-Condition: Active Order Check
Before deletion, the API checks whether the user has any **active orders** (orders whose latest status is **not** `delivered` or `cancelled`).
- **If active orders exist**: The request is **rejected** with HTTP `400 Bad Request`, detailing the active order IDs and their current statuses.
- **If no active orders exist** (or only terminal `delivered`/`cancelled` orders exist): All user data is permanently hard deleted in an atomic database transaction.

### Hard Deletion Scope
The hard delete permanently cascades across all tables:
1. `Notification` (both order-related and general user notifications)
2. `OrderStatus` (order status history entries for all user orders)
3. `OrderItems` (all line items belonging to user orders)
4. `` `Order` `` (user order master records)
5. `cart` (all cart items for this user)
6. `user_addresses` (all saved delivery addresses)
7. `userLogin` (all active authentication sessions and FCM push tokens)
8. `users` (the user profile record)
9. Storage: Profile photo file permanently deleted from Vercel Blob / server disk.

### Request Details
- **HTTP Method**: `DELETE` (also accepts `POST`)
- **URL Path**: `/api/user/delete/:userId` (or `/api/users/delete/:userId`)
- **Query / Body Alternative**: `/api/user/delete?userId=:userId` or `{ "userId": 123 }`
- **Authentication**:
  - **Shop Admin**: Shop cookie (`shop_token`) or `Authorization: Bearer <shop_token>`. Allowed to delete any user.
  - **Customer**: User cookie (`user_token`) or `Authorization: Bearer <user_token>`. Allowed to delete their own account.
  - Rejects with `403 Forbidden` if a logged-in customer attempts to delete another customer's ID.

### Example Request
`DELETE /api/user/delete/4`

---

### Example Successful Response (`200 OK`)

When the user exists and has no active orders:

```json
{
  "success": true,
  "message": "User and all associated data permanently deleted successfully.",
  "deletedUser": {
    "id": 4,
    "fullName": "Jane Doe",
    "email": "jane.doe@example.com",
    "phoneNumber": "+1234567890"
  },
  "deletedCounts": {
    "user": 1,
    "orders": 2,
    "orderItems": 5,
    "orderStatuses": 6,
    "notifications": 4,
    "cartItems": 3,
    "addresses": 2,
    "sessions": 1
  }
}
```

---

### Example Active Order Conflict Response (`400 Bad Request`)

When the user has one or more orders in active status (`ordered`, `packed`, or `out for delivery`):

```json
{
  "success": false,
  "error": "Cannot delete user because order #12 is currently in 'packed' status. All orders must be delivered or cancelled first.",
  "message": "Cannot delete user because order #12 is currently in 'packed' status. All orders must be delivered or cancelled first.",
  "code": "USER_HAS_ACTIVE_ORDERS",
  "hasActiveOrders": true,
  "activeOrdersCount": 1,
  "activeOrders": [
    {
      "orderId": 12,
      "status": "packed",
      "createdAt": "2026-09-27T10:15:00.000Z"
    }
  ]
}
```

---

### Example User Not Found Response (`404 Not Found`)

```json
{
  "success": false,
  "error": "User not found.",
  "message": "User not found.",
  "code": "USER_NOT_FOUND"
}
```

---

### Example Unauthorized / Forbidden Response (`403 Forbidden`)

When a logged-in user tries to delete another user's account:

```json
{
  "success": false,
  "error": "You are not authorized to delete another user's account."
}
```

## 6. POST `/api/users/forgotPassword` (or `/api/users/forgot-password`, `/api/user/forgotPassword`, `/api/user/forgot-password`)

Generates a secure random 4-digit confirmation code, stores it in the `users.confirmationCode` column, and sends a professional email with the verification code to the user.

### Request Details
- **HTTP Method**: `POST`
- **URL Paths**: `/api/users/forgotPassword`, `/api/users/forgot-password`, `/api/user/forgotPassword`, `/api/user/forgot-password`
- **Headers**: `Content-Type: application/json`
- **Authentication**: Public (Unauthenticated)

### Request Body Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | Registered user email address. |

### Example Request Body

```json
{
  "email": "user@example.com"
}
```

### Example Successful Response (`200 OK`)

```json
{
  "status": true,
  "success": true,
  "message": "Confirmation code sent to your email successfully."
}
```

### Example Error Responses

- **Missing / Invalid Email (`400 Bad Request`)**:
```json
{
  "status": false,
  "success": false,
  "error": "Email is required.",
  "message": "Email is required."
}
```

- **User Not Found (`404 Not Found`)**:
```json
{
  "status": false,
  "success": false,
  "error": "User with this email does not exist.",
  "message": "User with this email does not exist."
}
```

---

## 7. POST `/api/users/confirmForgotPassword` (or `/api/users/confirm-forgot-password`, `/api/user/confirmForgotPassword`, `/api/user/confirm-forgot-password`)

Verifies the 4-digit confirmation code and optionally resets the user password.

### Request Details
- **HTTP Method**: `POST`
- **URL Paths**: `/api/users/confirmForgotPassword`, `/api/users/confirm-forgot-password`, `/api/user/confirmForgotPassword`, `/api/user/confirm-forgot-password`
- **Headers**: `Content-Type: application/json`
- **Authentication**: Public (Unauthenticated)

### Behavior & Modes

#### Mode 1 — Confirmation Code Validation Only
Use this mode to check if the 4-digit code entered by the user is valid before asking them to enter a new password.

**Request Body:**
```json
{
  "confirmationCode": "1234"
}
```

*(Optional `email` parameter can also be supplied).*

**Success Response (`200 OK`):**
```json
{
  "status": true,
  "success": true,
  "message": "Confirmation code verified successfully"
}
```

**Invalid/Expired Code Response (`400 Bad Request`):**
```json
{
  "status": false,
  "success": false,
  "error": "Invalid or expired confirmation code.",
  "message": "Invalid or expired confirmation code."
}
```

#### Mode 2 — Confirm Code + Reset Password
Use this mode to verify the confirmation code, validate and hash the new password, update the database, and set `confirmationCode = NULL` to prevent reuse.

**Request Body:**
```json
{
  "confirmationCode": "1234",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Success Response (`200 OK`):**
```json
{
  "status": true,
  "success": true,
  "message": "Password reset successfully"
}
```

**Password Mismatch Response (`400 Bad Request`):**
```json
{
  "status": false,
  "success": false,
  "error": "newPassword and confirmPassword must match.",
  "message": "newPassword and confirmPassword must match."
}
```

---

## Database Impact

- **`users` table**: Stores `id`, `fullName`, `email`, `phoneNumber`, hashed `password`, `confirmationCode` (`VARCHAR(10) NULL DEFAULT NULL`), `created_at`, `updated_at`.
- **`confirmationCode` column**: Holds the active 4-digit numeric code when requested via `forgotPassword`. Once the password is reset successfully via `confirmForgotPassword`, `confirmationCode` is reset to `NULL` to prevent reuse.
- **`userLogin` table**: Stores `id`, `user_id` (foreign key to `users.id`), `token` (JWT string), `fcmToken` (Firebase Cloud Messaging push notification device token), and `created_at`.
- **Hard Deletion**: Deleting via `/api/user/delete/:userId` permanently purges the user from `users`, `userLogin`, `cart`, `user_addresses`, `Order`, `OrderItems`, `OrderStatus`, `Notification`, and removes any uploaded profile images from blob storage.

