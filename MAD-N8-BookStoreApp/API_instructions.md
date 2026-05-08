# Backend API Summary

This document summarizes the backend APIs used by the BookStore Android app. The default base URL is:

```text
http://localhost:3000/api
```

Use `Authorization: Bearer <token>` for protected APIs after login.

## Authentication

| # | Feature | Method | Endpoint | Notes |
|---|---------|--------|----------|-------|
| 1 | Register | POST | `/auth/register` | Creates a customer and prints an OTP in the backend terminal. |
| 2 | Login | POST | `/auth/login` | Returns a JWT token and user information. |
| 3 | Forgot password | POST | `/auth/forgot-password` | Prints a reset OTP in the backend terminal. |
| 4 | Verify OTP | POST | `/auth/verify-otp` | Returns a temporary reset token. |
| 5 | Change password | POST | `/auth/change-password` | Uses either a login token or a reset token. |

## Books, Reviews, and AI

| # | Feature | Method | Endpoint | Notes |
|---|---------|--------|----------|-------|
| 6 | Categories | GET | `/books/categories` | Returns all book categories. |
| 7 | Book list | GET | `/books` | Supports pagination and optional category filter. |
| 8 | Recommendations | GET | `/books/for-you` | Returns recommended or recent books. |
| 9 | Book detail | GET | `/books/:id` | Returns book data, reviews, rating, and similar books. |
| 10 | Text search | GET | `/books/search?q=...` | Searches by book title and related metadata. |
| 11 | Author detail | GET | `/books/author/:id` | Returns author information. |
| 12 | Books by author | GET | `/books/author/:id/books` | Returns books from one author. |
| 13 | Books by publisher | GET | `/books/publisher/:id/books` | Returns books from one publisher. |
| 14 | Reviews by book | GET | `/review/book/:bookId` | Public read access. |
| 15 | Submit review | POST | `/review` | Requires login token. |
| 16 | AI features | POST | `/ai/...` | Voice, image, and chatbot endpoints. |

## Cart

| # | Feature | Method | Endpoint | Notes |
|---|---------|--------|----------|-------|
| 17 | Get cart | GET | `/cart?customerId=1` | Returns cart items and total amount. |
| 18 | Add to cart | POST | `/cart/add` | Adds or merges item quantity. |
| 19 | Update item | PUT | `/cart/item/:cartItemId` | Quantity `0` removes the item. |
| 20 | Remove item | DELETE | `/cart/item/:cartItemId` | Removes one cart row. |

## Profile

| # | Feature | Method | Endpoint |
|---|---------|--------|----------|
| 21 | Get profile | GET | `/profile?customerId=1` |
| 22 | Update profile | PUT | `/profile` |
| 23 | Get addresses | GET | `/profile/address?customerId=1` |
| 24 | Add address | POST | `/profile/address` |
| 25 | Update address | PUT | `/profile/address/:addressId` |
| 26 | Delete address | DELETE | `/profile/address/:addressId` |
| 27 | Get payment methods | GET | `/profile/payment?customerId=1` |
| 28 | Add payment method | POST | `/profile/payment` |
| 29 | Update payment method | PUT | `/profile/payment/:paymentId` |
| 30 | Delete payment method | DELETE | `/profile/payment/:paymentId` |

## Checkout and Orders

| # | Feature | Method | Endpoint | Notes |
|---|---------|--------|----------|-------|
| 31 | Vouchers | GET | `/checkout-data/vouchers` | Returns active vouchers. |
| 32 | Shipments | GET | `/checkout-data/shipments` | Returns shipping methods. |
| 33 | Validate voucher | POST | `/checkout-data/vouchers/validate` | Calculates the final amount. |
| 34 | Checkout cart | POST | `/order/checkout` | Creates an order from cart items. |
| 35 | Buy now | POST | `/order/buy-now` | Creates an order for one book. |
| 36 | Order history | GET | `/order?customerId=1&status=...` | Optional status filter. |
| 37 | Order detail | GET | `/order/:orderId` | Returns full order information. |
| 38 | Cancel order | PUT | `/order/:orderId/cancel` | Allowed only for pending/processing orders. |

## Screen Mapping

- Home: categories and recommendation APIs.
- Product list: paginated book API.
- Product detail: detail, reviews, and similar books APIs.
- Search: text search plus AI voice/image endpoints.
- Cart: cart read/write APIs.
- Checkout: address, payment, voucher, shipment, and order APIs.
- Profile: profile, address, payment, and password APIs.
