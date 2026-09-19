# Shop Admin API Documentation: SubCategories

This document details the **SubCategory API endpoints** used in the Grace Fresh Market Shop Admin module.

---

## Data Model

### `subcategories` Table

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Auto | Primary key ID. |
| `category_id` | `number` | Yes | Parent Category ID. Must belong to an active parent category. |
| `subcategory_name` | `string` | Yes | Name of the item / subcategory. |
| `status` | `string` | Yes | Status (`"active"` or `"inactive"`). |
| `amount` | `number` | Yes | Price / base amount in INR currency. |
| `stock` | `number` \| `null` | No | Optional available stock quantity (numbers only, non-negative whole number). |
| `offer` | `number` | No | Optional offer discount percentage (numeric percentage between 0 and 100). |

### `subcategory_images` Table

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Auto | Primary key ID. |
| `subcategory_id` | `number` | Yes | Foreign key referencing `subcategories(id)` with `ON DELETE CASCADE`. |
| `image_url` | `string` | Yes | Public image relative URL. |
| `is_primary` | `boolean` (0/1) | Yes | Flag indicating whether this image is the primary image (1 = primary). |
| `created_at` | `timestamp` | Auto | Record creation timestamp. |

---

## GET `/api/shop/sub-categories`

Retrieves a paginated list of subcategories including associated parent category information. Supports filtering by text search and specific parent category ID.

### Request Details
- **HTTP Method**: `GET`
- **URL Path**: `/api/shop/sub-categories`
- **Authentication**: Public (Unauthenticated)

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number for pagination (minimum: 1). |
| `limit` | `number` | No | `10` | Number of subcategories per page (maximum: 100). |
| `search` | `string` | No | `""` | Search keyword to filter subcategories by `subcategory_name`. |
| `categoryId` | `string` / `number` | No | `"all"` | Filter subcategories belonging to a specific parent Category ID. |

### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subcategoryName": "Leafy Greens",
      "subcategory_name": "Leafy Greens",
      "image": "/images/subcategory/leafy-greens-1787510000000-1.jpg",
      "images": [
        "/images/subcategory/leafy-greens-1787510000000-1.jpg",
        "/images/subcategory/leafy-greens-1787510000000-2.jpg"
      ],
      "status": "active",
      "amount": 49.99,
      "stock": 50,
      "categoryId": 1,
      "category_id": 1,
      "category": {
        "id": 1,
        "categoryName": "Fresh Vegetables",
        "category_name": "Fresh Vegetables",
        "image": "/images/category/fresh-vegetables-1787510000000.jpg",
        "status": "active",
        "createdAt": "2026-08-23T18:00:00.000Z",
        "updatedAt": "2026-08-23T18:00:00.000Z"
      },
      "createdAt": "2026-08-23T18:10:00.000Z",
      "updatedAt": "2026-08-23T18:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## POST `/api/shop/sub-categories`

Creates a new subcategory item with multi-image upload support and optional numeric stock.

### Request Details
- **HTTP Method**: `POST`
- **URL Path**: `/api/shop/sub-categories`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Admin JWT Token (Cookie: `shop_token`)

### Form Data Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | `number` | Yes | Parent Category ID. |
| `subcategory_name` | `string` | Yes | Name of the subcategory. |
| `status` | `string` | No | `"active"` or `"inactive"` (Default: `"active"`). |
| `amount` | `number` | Yes | Non-negative numeric amount. |
| `stock` | `number` | No | Optional non-negative whole number. |
| `offer` | `number` | No | Optional offer percentage (0 to 100). |
| `images` | `File[]` | Yes | One or more image files (JPG, PNG, WEBP, max 5MB each). |

---

## PUT `/api/shop/sub-categories/:id`

Updates an existing subcategory item, managing multi-image file retention/addition and stock count.

### Request Details
- **HTTP Method**: `PUT`
- **URL Path**: `/api/shop/sub-categories/:id`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Admin JWT Token (Cookie: `shop_token`)

### Form Data Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | `number` | No | Updated Parent Category ID. |
| `subcategory_name` | `string` | No | Updated subcategory item name. |
| `status` | `string` | No | Updated status (`"active"` or `"inactive"`). |
| `amount` | `number` | No | Updated price / amount. |
| `stock` | `number` | No | Updated optional stock quantity. |
| `offer` | `number` | No | Updated optional offer percentage (0 to 100). |
| `existing_images` | `string[]` | No | List of existing relative image URL paths to retain. |
| `images` | `File[]` | No | New image files to upload and append. |
| `status` | `string` | No | Updated status (`"active"` or `"inactive"`). |

### Validation Rules
- **Inactive State Restriction**: Setting `status` to `"inactive"` is rejected with `400 Bad Request` if any order containing this subcategory has an active status that is not `"delivered"` or `"cancelled"`.

#### Example Inactive State Error Response (`400 Bad Request`)
```json
{
  "error": "Cannot make this subcategory inactive because order #1 is currently in 'ordered' status. All orders must be delivered or cancelled first.",
  "message": "Cannot make this subcategory inactive because order #1 is currently in 'ordered' status. All orders must be delivered or cancelled first."
}
```

---

## DELETE `/api/shop/sub-categories/:id`

Deletes a subcategory item and removes all associated stored image files from disk.

### Request Details
- **HTTP Method**: `DELETE`
- **URL Path**: `/api/shop/sub-categories/:id`
- **Authentication**: Admin JWT Token (Cookie: `shop_token`)

### Validation Rules
- **Active Orders Restriction**: Deletion is rejected with `400 Bad Request` if any order containing this subcategory has a status other than `"delivered"` or `"cancelled"`.

#### Example Delete Error Response (`400 Bad Request`)
```json
{
  "error": "Cannot delete this subcategory because order #1 is currently in 'ordered' status. All orders must be delivered or cancelled first.",
  "message": "Cannot delete this subcategory because order #1 is currently in 'ordered' status. All orders must be delivered or cancelled first."
}
```

---

## Summary of Status Codes

- `200 OK` / `201 Created`: Request succeeded.
- `400 Bad Request`: Validation failure (active orders exist, invalid category, negative stock, invalid image format/size).
- `401 Unauthorized`: Missing or invalid JWT session token.
- `404 Not Found`: Subcategory not found.
- `500 Internal Server Error`: Server or database query error.

