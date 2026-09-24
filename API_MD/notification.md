# Notification Table & Helper Documentation

This document describes the **`Notification` database table** and the helper utilities for creating and managing notifications in Grace Fresh Market.

---

## 1. Table Schema: `Notification`

```sql
CREATE TABLE IF NOT EXISTS Notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    orderId INT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_user (userId),
    INDEX idx_notification_order (orderId),
    INDEX idx_notification_type (type),
    INDEX idx_notification_created (createdAt),
    CONSTRAINT fk_notification_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_order
        FOREIGN KEY (orderId) REFERENCES `Order`(id)
        ON DELETE SET NULL
);
```

### Column Specifications

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INT` | No | Auto Increment | Unique notification identifier (Primary Key). |
| `userId` | `INT` | Yes | `NULL` | Targeted user ID (Foreign key to `users(id)`). `NULL` for broadcast/general notifications. |
| `orderId` | `INT` | Yes | `NULL` | Associated order ID (Foreign key to `Order(id)`). `NULL` if not order-related. |
| `title` | `VARCHAR(255)` | No | — | Notification heading or title string. |
| `content` | `TEXT` | No | — | Notification body content / message text. |
| `type` | `VARCHAR(50)` | No | `'general'` | Notification category (e.g. `'order'`, `'order_update'`, `'promo'`, `'welcome'`). |
| `createdAt` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Timestamp when notification was created. |
| `updatedAt` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP ON UPDATE` | Timestamp when notification was last modified. |

---

## 2. Helper Functions

Located in [`lib/services/notification.ts`](file:///d:/work/grace_fresh_market/lib/services/notification.ts) (also exported from [`lib/notifications/notification.ts`](file:///d:/work/grace_fresh_market/lib/notifications/notification.ts)).

### `insertNotification(input, connection?)` (or `createNotification`)

Inserts a notification record into the `Notification` table and returns the full record. Supports transactional execution with an optional `PoolConnection`.

#### Input Interface:
```typescript
interface CreateNotificationInput {
  userId?: number | string | null;
  orderId?: number | string | null;
  title: string;
  content: string;
  type?: string;
}
```

#### Return Type:
```typescript
interface NotificationRecord {
  id: number;
  userId: number | null;
  orderId: number | null;
  title: string;
  content: string;
  type: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
```

#### Usage Example:
```typescript
import { insertNotification } from '@/lib/services/notification';

// Standalone insert
const notif = await insertNotification({
  userId: 42,
  orderId: 105,
  title: 'Order Confirmed! 🛒',
  content: 'Your order #GFM-105 has been received and is being prepared.',
  type: 'order',
});

// Or within a transaction:
const notif = await insertNotification(
  {
    userId: 42,
    orderId: 105,
    title: 'Order Placed! 🛒',
    content: 'Order #GFM-105 was placed successfully.',
    type: 'order',
  },
  connection
);
```

### Additional Queries:
- `getNotificationsByUserId(userId, options)`: Returns user notifications sorted newest first.
- `getNotificationById(id)`: Returns a single notification by ID.
- `deleteNotificationById(id, userId?)`: Removes a notification record.

---

## 3. Automatic Insertion on Push Notification (`userPushNotification`)

Whenever [`userPushNotification`](file:///d:/work/grace_fresh_market/lib/notifications/userPushNotification.ts) is called, it automatically persists a record into the `Notification` table:
- **`userId`**: Targeted user ID.
- **`orderId`**: Associated order ID (if applicable).
- **`title`**: Notification title.
- **`content`**: Notification body/content.
- **`type`**: The push notification trigger type (e.g., `'ordered'`, `'packed'`, `'out for delivery'`, `'delivered'`, `'cancelled'`).

### Supported Trigger Types:
- `'ordered'`: Order has been placed by the customer.
- `'packed'`: Order items are packed and ready.
- `'out for delivery'`: Order is en route with delivery partner.
- `'delivered'`: Order has been successfully delivered.
- `'cancelled'`: Order has been cancelled.

### Push Trigger Example:
```typescript
import { userPushNotification } from '@/lib/notifications/userPushNotification';

// When order status is updated to 'delivered':
await userPushNotification({
  userId: 42,
  orderId: 105,
  title: 'Order Delivered! 🎉',
  body: 'Your fresh produce for order #GFM-105 has arrived.',
  type: 'delivered',
});
```

---

## 4. User Notification Endpoints

### 4.1 Get User Notifications
- **URL**: `GET /api/user/notifications` (or `/api/users/notifications`)
- **Headers**: `Authorization: Bearer <user_token>` (or cookie)
- **Query Parameters**:
  - `userId` *(optional)*: Explicit user ID
  - `type` *(optional)*: Filter by type (e.g., `type=delivered`, `type=ordered`)
  - `limit` *(optional)*: Number of notifications (default `50`, max `100`)
  - `offset` *(optional)*: Skip count (default `0`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Notifications retrieved successfully.",
  "total": 2,
  "data": [
    {
      "id": 1,
      "userId": 42,
      "orderId": 105,
      "title": "Order Delivered! 🎉",
      "content": "Your fresh produce for order #GFM-105 has arrived.",
      "type": "delivered",
      "createdAt": "2026-09-25T00:30:00.000Z",
      "updatedAt": "2026-09-25T00:30:00.000Z"
    }
  ]
}
```

### 4.2 Delete User Notification
- **URL**: `DELETE /api/user/notifications` (or `/api/users/notifications`)
- **Headers**: `Authorization: Bearer <user_token>` (or cookie)
- **Query / Body**: `{ "id": 1, "userId": 42 }`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Notification removed successfully."
}
```
