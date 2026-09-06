# Shop Admin API Documentation: App Setting

This document details the **App Setting API endpoints** used in the Grace Fresh Market Shop Admin module to retrieve and update primary application contact information (Email and Phone Number).

---

## 1. GET `/api/shop/app-setting`

Retrieves the current application contact settings and optional delivery fee.

### Request Details
- **HTTP Method**: `GET`
- **URL Path**: `/api/shop/app-setting`

### Example Request

```http
GET /api/shop/app-setting HTTP/1.1
Host: localhost:3000
Accept: application/json
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "info@gracefreshmarket.com",
    "phoneNumber": "+1 (800) 555-0199",
    "deliveryFee": 40,
    "created_at": "2026-09-01T17:55:00.000Z",
    "updated_at": "2026-09-01T17:55:00.000Z"
  }
}
```

---

## 2. PUT `/api/shop/app-setting`

Updates the application contact email, phone number, and optional delivery fee. *(Note: `POST` is also supported as an alias).*

### Request Details
- **HTTP Method**: `PUT` or `POST`
- **URL Path**: `/api/shop/app-setting`
- **Headers**: `Content-Type: application/json`

### Request Body Parameters

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | Valid contact email address. |
| `phone_number` | `string` | **Yes** | Contact phone number (also accepts `phoneNumber`). |
| `delivery_fee` | `number` or `string` | No | Optional delivery fee in Indian rupees (also accepts `deliveryFee`). Blank or omitted stores `null`; valid values are ₹0–₹100,000 with up to two decimal places. |

### Example Request Body

```json
{
  "email": "support@gracefreshmarket.com",
  "phone_number": "+1 (800) 123-4567",
  "delivery_fee": 40.5
}
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "App settings updated successfully",
  "data": {
    "id": 1,
    "email": "support@gracefreshmarket.com",
    "phoneNumber": "+1 (800) 123-4567",
    "deliveryFee": 40.5,
    "updated_at": "2026-09-01T17:56:00.000Z"
  }
}
```

### Example Validation Error Response (`400 Bad Request`)

```json
{
  "error": "Please enter a valid email address"
}
```

---

## Summary of Status Codes

- `200 OK`: Request succeeded.
- `400 Bad Request`: Validation failure (missing required fields or invalid email format).
- `500 Internal Server Error`: Database or internal server error.
