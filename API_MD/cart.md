# User Cart API Documentation: `addCart` & `getAllCart`

This document details the **User Cart API endpoints** (`addCart`, `getAllCart`, `updateCart`, and `deleteCart`) implemented for the Grace Fresh Market system.

---

## 1. POST `/api/cart/add` (or `POST /api/cart`) - `addCart`

Adds a specific subcategory product item to the user's shopping cart or increments the quantity if the item is already present in the cart.

### Request Details
- **HTTP Method**: `POST`
- **URL Paths**: `/api/cart/add` or `/api/cart`
- **Headers**: `Content-Type: application/json`
- **Authentication**: 
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
  - **Option B**: Pass `user_id` inside request payload.

### Request Body Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `subcategory_id` | `number` | Yes | - | ID of the subcategory item to add. Accepts `subcategory_id`, `subcategoryId`, or `product_id`. |
| `quantity` | `number` | No | `1` | Quantity to add to cart (supports decimal/float values > 0, e.g. `0.5`, `1.5`, `2`). |
| `user_id` | `number` | Optional* | - | User ID (Required if JWT token is not supplied). Accepts `user_id` or `userId`. |
| `action` | `string` | No | `"add"` | `"add"` (increments existing quantity) or `"set"` (replaces existing quantity). |

### Example Request Body

```json
{
  "user_id": 1,
  "subcategory_id": 4,
  "quantity": 2
}
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": [
    {
      "id": 1,
      "cartId": 1,
      "userId": 1,
      "subcategoryId": 4,
      "quantity": 2,
      "itemTotal": 99.98,
      "subcategory": {
        "id": 4,
        "subcategoryName": "Organic Spinach",
        "amount": 49.99,
        "stock": 50,
        "status": "active",
        "images": [
          "/images/subcategory/spinach-1.jpg"
        ],
        "primaryImage": "/images/subcategory/spinach-1.jpg",
        "category": {
          "id": 1,
          "categoryName": "Fresh Vegetables",
          "categoryType": "gram",
          "status": "active"
        }
      },
      "createdAt": "2026-08-30T16:20:00.000Z",
      "updatedAt": "2026-08-30T16:20:00.000Z"
    }
  ],
  "cartSummary": {
    "totalItems": 2,
    "itemCount": 1,
    "totalAmount": 99.98,
    "deliveryFee": 40
  }
}
```

---

## 2. GET `/api/cart/get-all` (or `GET /api/cart`) - `getAllCart`

Retrieves all active items in the specified user's shopping cart along with item details, images, stock, and total price summary.

### Request Details
- **HTTP Method**: `GET`
- **URL Paths**: `/api/cart/get-all` or `/api/cart`
- **Authentication**: 
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
  - **Option B**: Pass `userId` or `user_id` as URL query parameter (e.g. `/api/cart/get-all?userId=1`).

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` / `user_id` | `number` | Optional* | User ID parameter (Required if authentication token is not present). |

### Example Request
`GET /api/cart/get-all?userId=1`

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": [
    {
      "id": 1,
      "cartId": 1,
      "userId": 1,
      "subcategoryId": 4,
      "quantity": 2,
      "itemTotal": 99.98,
      "subcategory": {
        "id": 4,
        "subcategoryName": "Organic Spinach",
        "amount": 49.99,
        "stock": 50,
        "status": "active",
        "images": [
          "/images/subcategory/spinach-1.jpg"
        ],
        "primaryImage": "/images/subcategory/spinach-1.jpg",
        "category": {
          "id": 1,
          "categoryName": "Fresh Vegetables",
          "categoryType": "gram",
          "status": "active"
        }
      },
      "createdAt": "2026-08-30T16:20:00.000Z",
      "updatedAt": "2026-08-30T16:20:00.000Z"
    }
  ],
  "cartSummary": {
    "totalItems": 2,
    "itemCount": 1,
    "totalAmount": 99.98,
    "deliveryFee": 40
  }
}
```

---

## 3. POST `/api/cart/bulk` (or `POST /api/cart/create-bulk`) - `createBulkCart`

Adds or updates multiple items in the user's shopping cart in a single batch request. Supports merging with existing cart items or replacing the cart entirely.

### Request Details
- **HTTP Method**: `POST`
- **URL Paths**: `/api/cart/bulk` or `/api/cart/create-bulk`
- **Headers**: `Content-Type: application/json`
- **Authentication**: 
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
  - **Option B**: Pass `user_id` inside request payload.

### Request Body Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `Array` | Yes | - | Array of item objects containing `subcategory_id`, `quantity`, and optional item-level `action`. |
| `mode` | `string` | No | `"merge"` | `"merge"` (combines items with user's existing cart) or `"replace"` (clears existing cart before adding). |
| `action` | `string` | No | `"add"` | Default action for items: `"add"` (increments existing quantity) or `"set"` (replaces existing quantity). |
| `user_id` | `number` | Optional* | - | User ID (Required if JWT token is not supplied). Accepts `user_id` or `userId`. |

### Example Request Body

```json
{
  "user_id": 1,
  "mode": "merge",
  "action": "add",
  "items": [
    {
      "subcategory_id": 4,
      "quantity": 2
    },
    {
      "subcategory_id": 7,
      "quantity": 1,
      "action": "set"
    }
  ]
}
```

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Bulk cart creation completed successfully (2 items processed)",
  "mode": "merge",
  "processedCount": 2,
  "data": [
    {
      "id": 1,
      "cartId": 1,
      "userId": 1,
      "subcategoryId": 4,
      "quantity": 2,
      "itemTotal": 99.98,
      "subcategory": {
        "id": 4,
        "subcategoryName": "Organic Spinach",
        "amount": 49.99,
        "stock": 50,
        "offer": 10.00,
        "status": "active",
        "images": [
          "/images/subcategory/spinach-1.jpg"
        ],
        "primaryImage": "/images/subcategory/spinach-1.jpg",
        "category": {
          "id": 1,
          "categoryName": "Fresh Vegetables",
          "categoryType": "gram",
          "status": "active"
        }
      },
      "createdAt": "2026-08-30T16:20:00.000Z",
      "updatedAt": "2026-08-30T16:20:00.000Z"
    }
  ],
  "cartSummary": {
    "totalItems": 3,
    "itemCount": 2,
    "totalAmount": 149.97
  }
}
```

---

## 4. Additional Cart Actions: PUT & DELETE `/api/cart`

### Update Cart Quantity: `PUT /api/cart`
Updates item quantity. Setting `quantity: 0` removes the item.

- **Request Body**:
  ```json
  {
    "user_id": 1,
    "subcategory_id": 4,
    "quantity": 3
  }
  ```

### Delete Cart Item / Clear Cart: `DELETE /api/cart`
Deletes an item or clears the entire cart.

- **Query Parameters**:
  - Delete single item: `/api/cart?userId=1&subcategoryId=4` or `/api/cart?userId=1&cartId=1`
  - Clear entire cart: `/api/cart?userId=1&clearAll=true`

---

## Summary of Status Codes

- `200 OK`: Successful cart operation (`addCart`, `getAllCart`, `PUT`, `DELETE`).
- `400 Bad Request`: Validation failure (missing `subcategory_id`, negative quantity, or stock overflow).
- `401 Unauthorized`: Missing authentication token or `user_id`.
- `404 Not Found`: Selected product item or cart record not found.
- `500 Internal Server Error`: Database query or unexpected server error.
