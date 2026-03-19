# API Documentation

This document provides detailed information about the Barber Shop Management System REST API.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10,  // For list endpoints
  "total": 50,  // For paginated endpoints
  "pagination": { // For paginated endpoints
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe", 
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "customer" // optional: customer, barber, admin
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "customer",
    "status": "active"
  }
}
```

#### Login User
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
```
*Requires authentication*

#### Update Profile
```http
PUT /api/auth/profile
```
*Requires authentication*

**Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "bio": "Customer bio"
}
```

#### Change Password
```http
PUT /api/auth/change-password
```
*Requires authentication*

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

#### Logout
```http
POST /api/auth/logout
```

### Services

#### Get All Services
```http
GET /api/services?category=Haircuts&active=true&sort=price&order=asc&page=1&limit=10
```

**Query Parameters:**
- `category` (optional): Filter by service category
- `active` (optional): Filter by active status (true/false)
- `sort` (optional): Sort field (name, price, duration, created_at)
- `order` (optional): Sort order (asc, desc)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "pagination": {
    "page": 1,
    "limit": 10,
    "pages": 5
  },
  "data": [
    {
      "id": 1,
      "name": "Classic Men's Haircut",
      "description": "Traditional haircut with scissors and clipper work",
      "price": 25.00,
      "duration": 45,
      "category": "Haircuts",
      "is_active": true
    }
  ]
}
```

#### Get Single Service
```http
GET /api/services/:id
```

#### Create Service
```http
POST /api/services
```
*Requires authentication (Admin/Barber)*

**Body:**
```json
{
  "name": "New Service",
  "description": "Service description",
  "price": 30.00,
  "duration": 60,
  "category": "Premium Services",
  "image_url": "https://example.com/image.jpg"
}
```

#### Update Service
```http
PUT /api/services/:id
```
*Requires authentication (Admin/Barber)*

#### Delete Service
```http
DELETE /api/services/:id
```
*Requires authentication (Admin only)*

#### Get Service Categories
```http
GET /api/services/categories
```

### Appointments

#### Get Appointments
```http
GET /api/appointments?date=2024-01-01&status=scheduled&barber_id=2&page=1&limit=10
```

*Requires authentication*

**Query Parameters:**
- `date` (optional): Filter by specific date (ISO format)
- `status` (optional): Filter by status (scheduled, confirmed, in_progress, completed, cancelled, no_show)
- `barber_id` (optional): Filter by barber ID
- `customer_id` (optional): Filter by customer ID (Admin only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 4,
      "barber_id": 2,
      "service_id": 1,
      "appointment_date": "2024-01-01T10:00:00.000Z",
      "end_time": "2024-01-01T10:45:00.000Z",
      "status": "scheduled",
      "price": 25.00,
      "customer_first_name": "David",
      "customer_last_name": "Wilson",
      "barber_first_name": "John",
      "barber_last_name": "Smith",
      "service_name": "Classic Men's Haircut"
    }
  ]
}
```

#### Create Appointment
```http
POST /api/appointments
```
*Requires authentication*

**Body:**
```json
{
  "barber_id": 2,
  "service_id": 1,
  "appointment_date": "2024-01-01T10:00:00.000Z",
  "customer_notes": "Please trim beard as well"
}
```

#### Update Appointment
```http
PUT /api/appointments/:id
```
*Requires authentication*

#### Delete Appointment
```http
DELETE /api/appointments/:id
```
*Requires authentication*

#### Get Available Time Slots
```http
GET /api/appointments/available-slots/:barberId/:date?service_id=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-01",
    "barber_id": 2,
    "service_duration": 45,
    "available_slots": [
      {
        "time": "09:00",
        "datetime": "2024-01-01 09:00:00",
        "available": true
      },
      {
        "time": "09:15", 
        "datetime": "2024-01-01 09:15:00",
        "available": true
      }
    ]
  }
}
```

### Users

#### Get All Users
```http
GET /api/users?role=customer&status=active&search=john&page=1&limit=10
```
*Requires authentication (Admin only)*

#### Get All Barbers
```http
GET /api/users/barbers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@barbershop.com",
      "bio": "Master barber with 15 years of experience",
      "average_rating": "4.8",
      "total_reviews": 125
    }
  ]
}
```

#### Get User by ID
```http
GET /api/users/:id
```
*Requires authentication*

#### Update User
```http
PUT /api/users/:id
```
*Requires authentication*

#### Delete User
```http
DELETE /api/users/:id
```
*Requires authentication (Admin only)*

#### Get User Statistics
```http
GET /api/users/:id/stats
```
*Requires authentication*

### Inventory

#### Get Inventory Items
```http
GET /api/inventory?category=Tools&low_stock=true&search=scissors&page=1&limit=10
```
*Requires authentication (Admin/Barber)*

#### Create Inventory Item
```http
POST /api/inventory
```
*Requires authentication (Admin)*

**Body:**
```json
{
  "name": "Hair Scissors",
  "description": "Professional hair cutting scissors",
  "sku": "SCIS001",
  "category": "Tools",
  "brand": "Jaguar",
  "cost_price": 85.00,
  "selling_price": 120.00,
  "current_stock": 10,
  "minimum_stock": 3,
  "unit": "piece",
  "supplier": "Beauty Supply Co."
}
```

#### Update Inventory Item
```http
PUT /api/inventory/:id
```
*Requires authentication (Admin)*

#### Adjust Stock
```http
POST /api/inventory/:id/adjust
```
*Requires authentication (Admin/Barber)*

**Body:**
```json
{
  "quantity": 5,
  "transaction_type": "purchase", // purchase, usage, adjustment, waste, return
  "unit_cost": 85.00,
  "reference_number": "INV-001",
  "notes": "Restocked from supplier"
}
```

#### Get Low Stock Items
```http
GET /api/inventory/low-stock
```
*Requires authentication (Admin/Barber)*

### Reviews

#### Get Reviews
```http
GET /api/reviews?barber_id=2&service_id=1&rating=5&verified=true&page=1&limit=10
```

#### Create Review
```http
POST /api/reviews
```
*Requires authentication (Customer)*

**Body:**
```json
{
  "barber_id": 2,
  "service_id": 1,
  "appointment_id": 1, // optional
  "rating": 5,
  "comment": "Excellent service!"
}
```

#### Update Review
```http
PUT /api/reviews/:id
```
*Requires authentication*

#### Delete Review
```http
DELETE /api/reviews/:id
```
*Requires authentication*

#### Get Barber Review Statistics
```http
GET /api/reviews/barber/:barberId/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_reviews": 125,
    "average_rating": "4.8",
    "rating_distribution": {
      "5": 80,
      "4": 30,
      "3": 10,
      "2": 3,
      "1": 2
    },
    "service_breakdown": [
      {
        "service_id": 1,
        "service_name": "Classic Men's Haircut",
        "review_count": 50,
        "average_rating": "4.9"
      }
    ]
  }
}
```

#### Get User's Reviews
```http
GET /api/reviews/my-reviews?page=1&limit=10
```
*Requires authentication (Customer)*

## Error Codes

- `400` - Bad Request (validation errors, invalid input)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting:
- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: Additional stricter limits may apply

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response includes:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "pages": 5,
    "total": 50
  }
}
```

## Database Schema Quick Reference

### Key Tables
- `users` - User accounts (customers, barbers, admins)
- `services` - Available services
- `appointments` - Appointment bookings
- `inventory` - Inventory items
- `inventory_transactions` - Stock movements
- `reviews` - Customer reviews
- `staff_schedules` - Staff working hours

## Testing the API

### Using curl

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com","password":"password123"}'

# Login 
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get services (using token from login)
curl -X GET http://localhost:5000/api/services \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman

1. Import the API endpoints into Postman
2. Set up environment variables for base URL and auth token
3. Create a collection with all endpoints
4. Use pre-request scripts to handle authentication

For more detailed examples and advanced usage, refer to the test files in the project repository.