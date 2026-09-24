# Orders API Documentation

Comprehensive documentation for all user order endpoints:
1. **Create Order from Cart** (`POST /api/user/orders/create` / `POST /api/users/orders/create`)
2. **Get All Orders** (`GET /api/user/orders/get-all` / `GET /api/users/orders/get-all`)
3. **Get Order by ID** (`GET /api/user/orders/[id]` / `GET /api/users/orders/[id]`)

---

# 1. POST `/api/user/orders/create` — `createOrderFromCart`

Creates an order securely from the user's cart items using an atomic MySQL transaction with row-level locking (`FOR UPDATE`). Stock is validated, prices and totals are strictly calculated server-side, stock is reduced from `subcategories`, ordered items are cleared from `cart`, and a real-time `notify-order-to-shop` Socket.IO event and shop push notification are emitted upon transaction commit.

### Endpoints
- `POST /api/user/orders/create`
- `POST /api/user/orders`
- `POST /api/users/orders/create`
- `POST /api/users/orders`

---

### Authentication

**Required**. Send a valid `user_token` cookie or an `Authorization: Bearer <token>` header.

If unauthenticated:
```json
{
  "success": false,
  "message": "Unauthorized."
}
```
HTTP Status: `401 Unauthorized`.

---

### Request Body

```json
{
  "cartId": 12,
  "addressId": 1,
  "paymentMethodId": 1
}
```

Or for multiple cart items:
```json
{
  "cartId": [12, 13, 14],
  "addressId": 1,
  "paymentMethodId": 1
}
```

#### Request Fields
- `cartId` (**Required**): Integer or Array of Integers representing the `id`(s) from the `cart` table.
- `addressId` (*Optional*): Integer ID of delivery address. If omitted, the user's default saved address is used.
- `paymentMethodId` (*Optional*): Integer ID of payment method. If omitted, default payment method is used.

All amounts, item totals, delivery fee, totals, category metadata, and stock are queried directly from the `cart` and `subcategories` tables on the server.
- **Delivery Fee Rule**: If the order total amount (`subTotal`) is greater than ₹400, the delivery fee is ₹0 (free delivery). Otherwise, the delivery fee configured in `app_settings` is applied.

---

### Request Validation Rules

- `cartId` must exist and be a positive integer or non-empty array of positive integers.
- The specified `cartId`(s) must exist in the `cart` table and belong to the authenticated user.
- Stock is validated for all items referenced by the cart entries.
- Ordered items are automatically deleted from the `cart` table upon successful order placement.

---

### Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": 123,
      "orderId": "#GFM-123",
      "userId": 10,
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
      "addressId": 1,
      "address": {
        "id": 1,
        "userId": 10,
        "fullName": "John Doe",
        "phoneNumber": "9876543210",
        "buildingName": "Flat 402, Oakwood Towers",
        "building_name": "Flat 402, Oakwood Towers",
        "streetName": "100 Feet Ring Road",
        "street_name": "100 Feet Ring Road",
        "addressLine1": "Flat 402, Oakwood Towers",
        "addressLine2": "100 Feet Ring Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "postalCode": "560038",
        "addressType": "home",
        "address_type": "home",
        "isDefault": true,
        "is_default": true
      },
      "defaultAddress": {
        "id": 1,
        "userId": 10,
        "fullName": "John Doe",
        "phoneNumber": "9876543210",
        "buildingName": "Flat 402, Oakwood Towers",
        "building_name": "Flat 402, Oakwood Towers",
        "streetName": "100 Feet Ring Road",
        "street_name": "100 Feet Ring Road",
        "addressLine1": "Flat 402, Oakwood Towers",
        "addressLine2": "100 Feet Ring Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "postalCode": "560038",
        "addressType": "home",
        "address_type": "home",
        "isDefault": true,
        "is_default": true
      },
      "status": "ordered"
    },
    "items": [
      {
        "subcategoryId": 1,
        "subcategoryName": "Orange",
        "subcategoryImage": [
          "/images/subcategory/orange-1.jpg"
        ],
        "quantity": 1,
        "price": 5,
        "amount": 5,
        "itemTotal": 5,
        "categoryId": 3,
        "categoryName": "Fruits",
        "categoryType": "gram",
        "subcategory": {
          "id": 1,
          "subcategoryName": "Orange",
          "amount": 5,
          "image": [
            "/images/subcategory/orange-1.jpg"
          ],
          "stock": 9
        },
        "category": {
          "id": 3,
          "categoryName": "Fruits",
          "categoryType": "gram",
          "categoryImage": "/images/category/fruits.jpg"
        }
      }
    ],
    "defaultAddress": {
      "id": 1,
      "userId": 10,
      "fullName": "John Doe",
      "phoneNumber": "9876543210",
      "buildingName": "Flat 402, Oakwood Towers",
      "building_name": "Flat 402, Oakwood Towers",
      "streetName": "100 Feet Ring Road",
      "street_name": "100 Feet Ring Road",
      "addressLine1": "Flat 402, Oakwood Towers",
      "addressLine2": "100 Feet Ring Road",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560038",
      "postalCode": "560038",
      "addressType": "home",
      "address_type": "home",
      "isDefault": true,
      "is_default": true
    },
    "address": {
      "id": 1,
      "userId": 10,
      "fullName": "John Doe",
      "phoneNumber": "9876543210",
      "buildingName": "Flat 402, Oakwood Towers",
      "building_name": "Flat 402, Oakwood Towers",
      "streetName": "100 Feet Ring Road",
      "street_name": "100 Feet Ring Road",
      "addressLine1": "Flat 402, Oakwood Towers",
      "addressLine2": "100 Feet Ring Road",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560038",
      "postalCode": "560038",
      "addressType": "home",
      "address_type": "home",
      "isDefault": true,
      "is_default": true
    },
    "paymentMethod": {
      "id": 1,
      "paymentType": "COD",
      "description": "Pay when your fresh produce arrives at your door. We accept exact cash or card via our driver's terminal."
    }
  }
}
```

---

### Error Responses

#### 1. Unauthorized (`401 Unauthorized`)
```json
{
  "success": false,
  "message": "Unauthorized."
}
```

#### 2. Invalid Request / Validation Error (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid order items. items must be a non-empty array."
}
```
Or for duplicate items:
```json
{
  "success": false,
  "message": "Duplicate subcategoryId 1 detected in order items."
}
```

#### 3. Subcategory Not Found (`404 Not Found`)
```json
{
  "success": false,
  "message": "Subcategory not found. (ID: 999)"
}
```

#### 4. Insufficient Stock (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Insufficient stock for Orange. Available stock: 2, requested quantity: 5."
}
```

#### 5. Delivery Address Missing / Not Found (`400 Bad Request` / `404 Not Found`)
If the user has not added any delivery address:
```json
{
  "success": false,
  "message": "Delivery address not found. Please add a delivery address before placing an order."
}
```
Or if a selected `addressId` is invalid or belongs to another user:
```json
{
  "success": false,
  "message": "Selected delivery address not found. Please select a valid address."
}
```

#### 6. Internal Server Error (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "Failed to create order. Please try again later."
}
```

---

### Real-Time Socket Event & Push Notification

Upon successful transaction commit:
1. **Socket.IO Event**:
   - **Event**: `notify-order-to-shop`
   - **Payload**:
   ```json
   {
     "orderCount": 5
   }
   ```
   Where `orderCount` reflects the total pending orders with status `ordered` currently in the system.
2. **Shop Web Push**:
   - Sends a push notification to all subscribed shop admins via Firebase Cloud Messaging.

---
---

# 2. GET `/api/users/orders/get-all` — `getAllOrders`

Fetches all orders for a specific user, including payment method, delivery address, current order status, status history, order items (with category/subcategory fallbacks and images), and a stored cart summary.

Orders are returned newest first (`ORDER BY Order.id DESC`).

### Endpoints
- `/api/users/orders/get-all`
- `/api/users/orders`
- `/api/user/orders/get-all`
- `/api/user/orders`

### Authentication
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

### Example Successful Response (`200 OK`)

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
        "id": 12,
        "building_name": "Flat 4B, Sunrise Apts",
        "street_name": "12 Gandhi Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600001",
        "address_type": "home"
      },
      "orderStatus": {
        "id": 501,
        "orderId": 101,
        "status": "out for delivery",
        "createdAt": "2026-03-29T10:45:00.000Z",
        "updatedAt": "2026-03-29T11:00:00.000Z"
      },
      "statusHistory": [
        {
          "id": 499,
          "orderId": 101,
          "status": "ordered",
          "createdAt": "2026-03-29T10:00:00.000Z",
          "updatedAt": "2026-03-29T10:00:00.000Z"
        },
        {
          "id": 500,
          "orderId": 101,
          "status": "packed",
          "createdAt": "2026-03-29T10:30:00.000Z",
          "updatedAt": "2026-03-29T10:30:00.000Z"
        },
        {
          "id": 501,
          "orderId": 101,
          "status": "out for delivery",
          "createdAt": "2026-03-29T10:45:00.000Z",
          "updatedAt": "2026-03-29T11:00:00.000Z"
        }
      ],
      "items": [
        {
          "id": 201,
          "categoryId": 1,
          "subcategoryId": 5,
          "quantity": 2,
          "itemTotal": 50,
          "subcategory": {
            "id": 5,
            "subcategoryName": "Tomato Local",
            "amount": 25,
            "images": [
              "/images/subcategory/tomato-local-1.png",
              "/images/subcategory/tomato-local-2.png"
            ],
            "category": {
              "id": 1,
              "categoryName": "Vegetables",
              "categoryType": "gram",
              "status": "active"
            }
          },
          "createdAt": "2026-03-29T10:00:00.000Z",
          "updatedAt": "2026-03-29T10:00:00.000Z"
        }
      ],
      "cartSummary": {
        "totalItems": 3,
        "itemCount": 2,
        "totalAmount": 25,
        "deliveryFee": 40
      },
      "createdAt": "2026-03-29T10:00:00.000Z",
      "updatedAt": "2026-03-29T11:00:00.000Z"
    }
  ]
}
```

---

### Response Fields

Each object in `data` includes:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Order ID. |
| `userId` | `number` | Owner of the order. |
| `subTotal` | `number` | Stored order subtotal (not recalculated from current prices). |
| `totalItems` | `number` | Stored total quantity of items. |
| `deliveryFee` | `number` | Stored delivery fee. |
| `total` | `number` | Stored order total (`subTotal + deliveryFee`). |
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

### Order item fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Order item ID. |
| `categoryId` | `number` | Historical category ID stored on the item. |
| `subcategoryId` | `number` | Historical subcategory ID stored on the item. |
| `quantity` | `number` | Ordered quantity. |
| `itemTotal` | `number` | Stored item total from `OrderItems`. |
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

### Address Logic

1. Look up `user_addresses` by `Order.addressid`.
2. If that row exists, return it.
3. Otherwise use the historical snapshot stored on `Order` (`building_name`, `street_name`, `city`, `state`, `pincode`, `address_type`).
4. If neither a matching address nor snapshot fields exist, `address` is `null`.

---

### Category / Subcategory Fallback

- If the category/subcategory still exists and `status` is `active`, current catalog data is returned in the nested objects.
- If the record is missing or inactive, historical values from `OrderItems` are used (`categoryName`, `categoryType`, `subcategoryName`, `price`).
- `itemTotal` always uses the stored order-item amount, even when the nested subcategory shows a current price.

---

### Images

Images are loaded from `subcategory_images` for each item's `subcategoryId`.
- Empty / null paths are skipped.
- Paths are validated against files under `public/`.
- If no valid image remains, the API returns:
```json
{
  "images": ["/images/subcategory/subCategoryDefault.png"]
}
```

---

### Error Responses

#### `400 Bad Request` — invalid `userId`
```json
{ "error": "Invalid userId." }
```

#### `401 Unauthorized` — missing user identification
```json
{ "error": "User identification required. Please log in or provide a valid user ID." }
```

#### `403 Forbidden` — JWT user does not match query `userId`
```json
{ "error": "You are not authorized to access another user's orders." }
```

#### `404 Not Found` — user does not exist
```json
{ "error": "User profile not found." }
```

#### `500 Internal Server Error`
```json
{ "error": "Failed to retrieve orders" }
```

---
---

# 3. GET `/api/users/orders/[id]` — `getOrderById`

Fetches complete details for a single order by its ID, including payment method, delivery address snapshot, current order status, complete status history, order items (with live category/subcategory fallbacks and images), and stored cart summary.

Supports both numeric IDs (`101`) and `#GFM-` formatted strings (`#GFM-101`).

### Endpoints
- **Dynamic Path**:
  - `GET /api/users/orders/:id`
  - `GET /api/user/orders/:id`
  - `GET /api/shop/orders/:id` *(Shop admin management)*
- **Query Parameter Alternative**:
  - `GET /api/users/orders/get-by-id?orderId=:id`
  - `GET /api/user/orders/get-by-id?orderId=:id`

---

### Authentication

1. **User Request (Customer)**:
   - **Option A (Recommended)**: Pass JWT token via HTTP-only Cookie (`user_token`) or `Authorization: Bearer <token>`.
   - **Option B**: Pass `userId` or `user_id` as a URL query parameter.
   - If a JWT is present and `userId` is also supplied in query, they must match.
   - **Ownership Check**: A user can only view their own orders. Attempting to view another user's order returns `403 Forbidden`.

2. **Shop Admin Request**:
   - Send `shop_token` HTTP-only Cookie or `Authorization: Bearer <shop_token>`.
   - Shop admins are authorized to view any order in the system.

---

### Parameters

#### URL Route Parameters (for `[id]` routes)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number \| string` | **Yes** | Order ID (e.g. `101` or `#GFM-101`). |

#### Query Parameters (optional for `[id]`, required for `get-by-id`)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `orderId` / `id` | `number \| string` | Required on `get-by-id` | Order ID (e.g. `101` or `#GFM-101`). |
| `userId` / `user_id` | `number` | Optional | User ID (required if user JWT is not present). |

---

### Example Requests

#### Using Dynamic Route:
```http
GET /api/users/orders/101
Authorization: Bearer <token>
```

#### Using Query Route:
```http
GET /api/user/orders/get-by-id?orderId=101
Authorization: Bearer <token>
```

#### Using Formatted ID:
```http
GET /api/user/orders/%23GFM-101
Authorization: Bearer <token>
```

---

### Example Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": 101,
    "userId": 3,
    "user": {
      "id": 3,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "9876543210",
      "profileImage": null
    },
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
      "id": 12,
      "building_name": "Flat 4B, Sunrise Apts",
      "street_name": "12 Gandhi Road",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "pincode": "600001",
      "address_type": "home"
    },
    "orderStatus": {
      "id": 501,
      "orderId": 101,
      "status": "out for delivery",
      "createdAt": "2026-03-29T10:45:00.000Z",
      "updatedAt": "2026-03-29T11:00:00.000Z"
    },
    "statusHistory": [
      {
        "id": 499,
        "orderId": 101,
        "status": "ordered",
        "createdAt": "2026-03-29T10:00:00.000Z",
        "updatedAt": "2026-03-29T10:00:00.000Z"
      },
      {
        "id": 500,
        "orderId": 101,
        "status": "packed",
        "createdAt": "2026-03-29T10:30:00.000Z",
        "updatedAt": "2026-03-29T10:30:00.000Z"
      },
      {
        "id": 501,
        "orderId": 101,
        "status": "out for delivery",
        "createdAt": "2026-03-29T10:45:00.000Z",
        "updatedAt": "2026-03-29T11:00:00.000Z"
      }
    ],
    "items": [
      {
        "id": 201,
        "categoryId": 1,
        "subcategoryId": 5,
        "quantity": 2,
        "itemTotal": 50,
        "subcategory": {
          "id": 5,
          "subcategoryName": "Tomato Local",
          "amount": 25,
          "images": [
            "/images/subcategory/tomato-local-1.png"
          ],
          "category": {
            "id": 1,
            "categoryName": "Vegetables",
            "categoryType": "gram",
            "status": "active"
          }
        },
        "createdAt": "2026-03-29T10:00:00.000Z",
        "updatedAt": "2026-03-29T10:00:00.000Z"
      }
    ],
    "cartSummary": {
      "totalItems": 3,
      "itemCount": 1,
      "totalAmount": 25,
      "deliveryFee": 40,
      "total": 65
    }
    },
    "createdAt": "2026-03-29T10:00:00.000Z",
    "updatedAt": "2026-03-29T11:00:00.000Z"
  }
}
```

---

### Error Responses

#### `400 Bad Request` — invalid order ID
```json
{
  "success": false,
  "error": "Invalid order ID. Must be a positive integer or formatted as #GFM-123."
}
```

#### `401 Unauthorized` — unauthenticated request
```json
{
  "success": false,
  "error": "User identification required. Please log in or provide a valid user ID."
}
```

#### `403 Forbidden` — attempting to access another user's order
```json
{
  "success": false,
  "error": "You are not authorized to access this order."
}
```

#### `404 Not Found` — order does not exist
```json
{
  "success": false,
  "error": "Order #999 not found."
}
```

#### `500 Internal Server Error` — unexpected server error
```json
{
  "success": false,
  "error": "Failed to retrieve order"
}
```

---
---

# 4. Database Schema Notes

- **`` `Order` `` (and `orders` view) table**:
  - `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
  - `userId` (`INT NOT NULL`)
  - `subTotal` (`DECIMAL(10, 2) NOT NULL DEFAULT 0.00`)
  - `totalItems` (`FLOAT NOT NULL DEFAULT 0`)
  - `deliveryFee` (`DECIMAL(10, 2) NOT NULL DEFAULT 0.00`)
  - `total` (`DECIMAL(10, 2) NOT NULL DEFAULT 0.00`)
  - `paymentMethodId` (`INT NULL DEFAULT NULL`)
  - `addressid` (`INT NULL DEFAULT NULL`)
  - `building_name` (`VARCHAR(255) NULL DEFAULT ''`)
  - `street_name` (`VARCHAR(255) NULL DEFAULT ''`)
  - `city` (`VARCHAR(100) NULL DEFAULT ''`)
  - `state` (`VARCHAR(100) NULL DEFAULT ''`)
  - `pincode` (`VARCHAR(20) NULL DEFAULT ''`)
  - `address_type` (`VARCHAR(50) NULL DEFAULT ''`)
  - `createdAt`, `updatedAt` (`TIMESTAMP`)
  - The `status` column has been decoupled from `Order`.

- **`OrderStatus` table**: Tracks status lifecycle per order:
  - `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
  - `orderId` (`INT NOT NULL`)
  - `status` (`ENUM('ordered', 'packed', 'out for delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'ordered'`)
  - `createdAt`, `updatedAt` (`TIMESTAMP`)

- **`OrderItems` (and `order_items` view) table**: Stores individual purchased line items:
  - `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
  - `orderId` (`INT NOT NULL`)
  - `subcategoryId` (`INT NOT NULL`)
  - `categoryId` (`INT NOT NULL`)
  - `subcategoryName` (`VARCHAR(255) NOT NULL`)
  - `price` (`DECIMAL(10, 2) NOT NULL DEFAULT 0.00`)
  - `itemTotal` (`DECIMAL(10, 2) NOT NULL DEFAULT 0.00`)
  - `categoryName` (`VARCHAR(255) NOT NULL`)
  - `categoryType` (`ENUM('gram', 'quantity') NOT NULL`)
  - `quantity` (`FLOAT NOT NULL DEFAULT 1`)
  - `createdAt`, `updatedAt` (`TIMESTAMP`)
