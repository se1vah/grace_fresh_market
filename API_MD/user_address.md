# User Address API Documentation

This document details the **User Address API endpoints** (`GET`, `POST`, `PUT`, and `DELETE`) for managing user delivery and billing addresses in Grace Fresh Market.

---

## Data Model: `user_addresses`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Auto | Primary key ID of the address record. |
| `userId` / `user_id` | `number` | Yes | ID of the user who owns this address. Foreign key to `users(id)`. |
| `buildingName` / `building_name` | `string` | Yes | Building Name / Flat No / House No / Suite. |
| `streetName` / `street_name` / `street` | `string` | Yes | Street Name / Area / Locality. |
| `city` | `string` | Yes | City or Town name. |
| `state` | `string` | No | State name (e.g., "Karnataka", "California", "NY"). |
| `pincode` / `zipcode` | `string` | Yes | Postal Pincode / Zip Code. |
| `phoneNumber` / `phone_number` | `string` | No | Contact Phone Number. If omitted/null, falls back to `users.phoneNumber`. |
| `addressType` / `address_type` | `string` | Yes | Address Type: `"Home"`, `"Work"`, or `"Other"`. Returns lowercased `"home"`, `"work"`, or `"other"`. |
| `isDefault` / `is_default` | `boolean` | No | Flag indicating default primary address (`true` or `false`). Default: `false`. |
| `createdAt` | `string` | Auto | ISO timestamp when record was created. |
| `updatedAt` | `string` | Auto | ISO timestamp when record was last updated. |

---

## 1. POST `/api/user/address/create` (or `/api/user/address`) - Create Address

Adds a new address for the specified user.

### Request Details
- **HTTP Method**: `POST`
- **URL Paths**: `/api/user/address/create`, `/api/user/address`, `/api/users/address/create`, or `/api/users/address`
- **Headers**: `Content-Type: application/json`
- **Authentication**: 
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
  - **Option B**: Pass `userId` / `user_id` inside request payload.

### Request Body Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` / `user_id` | `number` | Optional* | User ID (Required if authentication token is not supplied). |
| `buildingName` | `string` | Yes | Building / Flat / House Name or Number. |
| `streetName` / `street` | `string` | Yes | Street Name / Area. |
| `city` | `string` | Yes | City or Town. |
| `state` | `string` | No | State name. |
| `pincode` / `zipcode` | `string` | Yes | Pincode / Zip Code. |
| `phoneNumber` / `phone_number` | `string` | No | Contact phone number. If null/empty, automatically falls back to `users.phoneNumber`. |
| `addressType` / `address_type` | `string` | Yes | Address Type: `"Home"`, `"Work"`, or `"Other"`. |
| `isDefault` / `is_default` | `boolean` | No | Set as default address (`true` or `false`). |

### Example Request Body

```json
{
  "userId": 1,
  "buildingName": "Flat 402, Oakwood Towers",
  "streetName": "100 Feet Ring Road, Indiranagar",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560038",
  "phoneNumber": "+91 9876543210",
  "addressType": "Home",
  "isDefault": true
}
```

### Example Successful Response (`201 Created`)

```json
{
  "success": true,
  "message": "User address added successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "buildingName": "Flat 402, Oakwood Towers",
    "streetName": "100 Feet Ring Road, Indiranagar",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560038",
    "addressType": "home",
    "isDefault": true,
    "createdAt": "2026-09-04T15:30:00.000Z",
    "updatedAt": "2026-09-04T15:30:00.000Z"
  }
}
```

---

## 2. GET `/api/user/address/get-all` (or `/api/user/address`) - Get All Addresses

Retrieves all saved addresses for a user or a specific single address by `id`.

### Request Details
- **HTTP Method**: `GET`
- **URL Paths**: `/api/user/address/get-all`, `/api/user/address`, `/api/users/address/get-all`, or `/api/users/address`
- **Authentication**: JWT Cookie (`user_token`), `Authorization: Bearer <token>`, or `userId` query parameter.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` / `user_id` | `number` | Optional* | User ID parameter (Required if authentication token is not present). |
| `id` / `addressId` | `number` | No | Optional single address ID to fetch. |

### Example Requests

- Get all addresses for user: `GET /api/user/address/get-all?userId=1`
- Get specific address: `GET /api/user/address?userId=1&id=1`

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "User addresses retrieved successfully",
  "count": 1,
  "data": [
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
      "createdAt": "2026-09-04T15:30:00.000Z",
      "updatedAt": "2026-09-04T15:30:00.000Z"
    }
  ]
}
```

---

## 3. PUT `/api/user/address` - Update Address

Updates an existing address record.

### Request Details
- **HTTP Method**: `PUT`
- **URL Paths**: `/api/user/address` or `/api/users/address`
- **Headers**: `Content-Type: application/json`

### Example Request Body

```json
{
  "userId": 1,
  "id": 1,
  "buildingName": "Villa 12, Palm Meadows",
  "streetName": "Whitefield Main Road",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560066",
  "addressType": "Work",
  "isDefault": true
}
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "User address updated successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "buildingName": "Villa 12, Palm Meadows",
    "streetName": "Whitefield Main Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560066",
    "addressType": "work",
    "isDefault": true,
    "createdAt": "2026-09-04T15:30:00.000Z",
    "updatedAt": "2026-09-04T15:35:00.000Z"
  }
}
```

---

## 4. DELETE `/api/user/address` - Delete Address

Deletes a user address.

### Query Parameters or Request Body
- `id` / `addressId` / `address_id`: Address ID to delete (Required).
- `userId` / `user_id`: User ID (Optional if token provided).

### Example Request
`DELETE /api/user/address?userId=1&id=1`

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Address deleted successfully",
  "deletedAddressId": 1
}
```

---

## Summary of Status Codes

- `200 OK`: Address retrieved, updated, or deleted successfully.
- `201 Created`: Address created successfully.
- `400 Bad Request`: Validation failure (missing required fields like buildingName, streetName, city, pincode, or invalid addressType).
- `401 Unauthorized`: Missing user authentication or user ID.
- `404 Not Found`: User or address record not found.
- `500 Internal Server Error`: Unexpected server or database error.
