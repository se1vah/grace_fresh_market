# Orders API Documentation: `getAllOrders`

This document details the **Get All Orders** API (`getAllOrders`) implemented for the Grace Fresh Market system.

---

## GET `/api/users/orders/get-all` — `getAllOrders`

Fetches all orders for a specific user, including payment method, delivery address, current order status, status history, order items (with category/subcategory fallbacks and images), and a stored cart summary.

Orders are returned newest first (`ORDER BY Order.id DESC`).

### Request Details

- **HTTP Method**: `GET`
- **URL Paths**:
  - `/api/users/orders/get-all`
  - `/api/users/orders`
  - `/api/user/orders/get-all`
  - `/api/user/orders`
- **Authentication**:
  - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
  - **Option B**: Pass `userId` or `user_id` as a URL query parameter.

If a JWT is present and a query `userId` is also supplied, they must match. A logged-in user cannot fetch another user's orders.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` / `user_id` | `number` | Optional* | User ID (required if JWT is not present). |

### Example Request

```http
GET /api/users/orders/get-all?userId=3
Authorization: Bearer <token>
```

---

## Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "id": 101,
      "userId": 3,
      "subTotal": 25,
      "totalItems": 3,
      "deliveryFee": 40,
      "total": 65,
      "paymentMethodId": 1,
      "paymentMethod": {
        "id": 1,
        "paymentType": "COD",
        "description": "Pay when your fresh produce arrives at your door. We accept exact cash or card via our driver's terminal."
      },
      "address": {
        "id": 10,
        "building_name": "ABC Apartments",
        "street_name": "Main Street",
        "city": "Madurai",
        "state": "Tamil Nadu",
        "pincode": "625001",
        "address_type": "Home"
      },
      "orderStatus": {
        "id": 2,
        "orderId": 101,
        "status": "packed",
        "createdAt": "2026-09-05T18:10:00.000Z",
        "updatedAt": "2026-09-05T18:10:00.000Z"
      },
      "statusHistory": [
        {
          "id": 1,
          "orderId": 101,
          "status": "ordered",
          "createdAt": "2026-09-05T17:45:41.000Z",
          "updatedAt": "2026-09-05T17:45:41.000Z"
        },
        {
          "id": 2,
          "orderId": 101,
          "status": "packed",
          "createdAt": "2026-09-05T18:10:00.000Z",
          "updatedAt": "2026-09-05T18:10:00.000Z"
        }
      ],
      "items": [
        {
          "id": 1,
          "categoryId": 3,
          "subcategoryId": 7,
          "quantity": 1,
          "itemTotal": 5,
          "subcategory": {
            "id": 7,
            "subcategoryName": "Orange",
            "amount": 5,
            "images": [
              "/images/subcategory/orange-1788630330135-1.jpg"
            ],
            "category": {
              "id": 3,
              "categoryName": "Fruits",
              "categoryType": "gram",
              "status": "active"
            }
          },
          "createdAt": "2026-09-05T17:45:41.000Z",
          "updatedAt": "2026-09-05T17:45:41.000Z"
        }
      ],
      "cartSummary": {
        "totalItems": 3,
        "itemCount": 2,
        "totalAmount": 25,
        "deliveryFee": 40
      },
      "createdAt": "2026-09-05T17:45:41.000Z",
      "updatedAt": "2026-09-05T17:45:41.000Z"
    }
  ]
}
```

If the user exists but has no orders:

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": []
}
```

---

## Response Fields

Each object in `data` includes:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Order ID. |
| `userId` | `number` | Owner of the order. |
| `subTotal` | `number` | Stored order subtotal (not recalculated from current prices). |
| `totalItems` | `number` | Stored total quantity of items. |
| `deliveryFee` | `number` | Stored delivery fee. |
| `total` | `number` | Stored order total. |
| `paymentMethodId` | `number \| null` | Payment method foreign key. |
| `paymentMethod` | `object \| null` | Payment method details (`id`, `paymentType`, `description`). `null` if missing. |
| `address` | `object \| null` | Delivery address (see Address Logic). |
| `orderStatus` | `object \| null` | Latest status from `OrderStatus` (highest `id`). `null` if none. |
| `statusHistory` | `array` | All status records for the order, oldest first. Empty array if none. |
| `items` | `array` | Order line items. Empty array if none. |
| `cartSummary` | `object` | Stored summary for this order. |
| `createdAt` | `string` | Order created timestamp. |
| `updatedAt` | `string` | Order updated timestamp. |

### Cart summary

| Field | Source |
| :--- | :--- |
| `totalItems` | `Order.totalItems` (total quantity) |
| `itemCount` | Count of `OrderItems` rows (unique line items) |
| `totalAmount` | `Order.subTotal` |
| `deliveryFee` | `Order.deliveryFee` |

Do not confuse `itemCount` with `totalItems`.

### Order item fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Order item ID. |
| `categoryId` | `number` | Historical category ID stored on the item. |
| `subcategoryId` | `number` | Historical subcategory ID stored on the item. |
| `quantity` | `number` | Ordered quantity. |
| `itemTotal` | `number` | Stored `amount * quantity` from `OrderItems`. Never current catalog price. |
| `subcategory` | `object` | Nested subcategory, images, and category. |
| `createdAt` / `updatedAt` | `string` | Line-item timestamps. |

### Order status values

Allowed `OrderStatus.status` values:

- `ordered`
- `packed`
- `out for delivery`
- `delivered`
- `cancelled`

---

## Address Logic

Address is **not** taken from the user's current default address.

1. Look up `user_addresses` by `Order.addressid`.
2. If that row exists, return it.
3. Otherwise use the historical snapshot stored on `Order` (`building_name`, `street_name`, `city`, `state`, `pincode`, `address_type`).
4. If neither a matching address nor snapshot fields exist, `address` is `null`.

---

## Category / Subcategory Fallback

- If the category/subcategory still exists and `status` is `active`, current catalog data is returned in the nested objects.
- If the record is missing or inactive, historical values from `OrderItems` are used (`categoryName`, `categoryType`, `subcategoryName`, `amount`).
- `itemTotal` always uses the stored order-item amount, even when the nested subcategory shows a current price.

---

## Images

Images are loaded from `subcategory_images` for each item's `subcategoryId`.

- Empty / null paths are skipped.
- Paths are validated against files under `public/`.
- Broken or missing files are omitted.
- If no valid image remains, the API returns:

```json
{
  "images": ["/images/subcategory/subCategoryDefault.png"]
}
```

The images array is never empty.

---

## Error Responses

### `400 Bad Request` — invalid `userId`

```json
{ "error": "Invalid userId." }
```

### `401 Unauthorized` — missing user identification

```json
{ "error": "User identification required. Please log in or provide a valid user ID." }
```

### `403 Forbidden` — JWT user does not match query `userId`

```json
{ "error": "You are not authorized to access another user's orders." }
```

### `404 Not Found` — user does not exist

```json
{ "error": "User profile not found." }
```

### `500 Internal Server Error`

```json
{ "error": "Failed to retrieve orders" }
```

---

## Notes

- Tables used: `` `Order` ``, `OrderItems`, `OrderStatus`, `PaymentMethod`, `user_addresses`, `categories`, `subcategories`, `subcategory_images`.
- `` `Order` `` is quoted because `Order` is a reserved MySQL keyword.
- All three order tables store `createdAt` and `updatedAt`.
- Queries are parameterized. Related rows are loaded in batches (no per-item N+1 queries).
