# Checkout Details API Documentation

## GET `/api/cart/get-check-out-details` — `getCheckOutDetails`

Returns checkout-ready data for the authenticated user: their default delivery
address and the payment methods configured in the `PaymentMethod` table.

### Authentication

Authentication is required. Send a valid `user_token` cookie or an
`Authorization: Bearer <token>` header. Supplying `userId` does not authenticate
this endpoint.

### Successful response (`200 OK`)

```json
{
  "success": true,
  "message": "Checkout details fetched successfully",
  "data": {
    "deliveryAddress": {
      "id": 1,
      "fullName": "John Doe",
      "phoneNumber": "9876543210",
      "addressLine1": "123 Main Street",
      "addressLine2": "Near Market",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "postalCode": "600001"
    },
    "paymentMethods": [
      {
        "id": 1,
        "paymentType": "COD",
        "description": "Pay when your fresh produce arrives at your door. We accept exact cash or card via our driver's terminal."
      }
    ]
  }
}
```

`addressLine1` is the saved building/house name, `addressLine2` is the saved
street name, and `postalCode` is the saved pincode.

### Error responses

Missing or invalid authentication returns `401 Unauthorized`:

```json
{ "error": "User identification required. Please log in." }
```

If no default address exists, checkout is blocked with `400 Bad Request` and no
payment methods are returned:

```json
{
  "success": false,
  "message": "Default delivery address not found. Please add or select a default address before proceeding with checkout."
}
```
