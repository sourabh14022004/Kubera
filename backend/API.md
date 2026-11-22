# Kubera Backend API Documentation

Base URL: `http://localhost:5000`

---

## Table of Contents
- [Health Check](#health-check)
- [Authentication](#authentication)
- [Storage Module](#storage-module)
  - [1. Get All Storage Racks](#1-get-all-storage-racks)
  - [2. Get Storage Rack by ID](#2-get-storage-rack-by-id)
  - [3. Get Storage Drawer by ID](#3-get-storage-drawer-by-id)
  - [4. Create Storage Rack](#4-create-storage-rack)
  - [5. Retire Storage Rack](#5-retire-storage-rack)
  - [6. Restore Storage Rack](#6-restore-storage-rack)
  - [7. Delete Storage Rack](#7-delete-storage-rack)
- [Component Categories Module](#component-categories-module)
  - [1. Get All Categories](#1-get-all-categories)
  - [2. Create Category](#2-create-category)
  - [3. Update Category](#3-update-category)
  - [4. Deactivate Category](#4-deactivate-category)
  - [5. Activate Category](#5-activate-category)
  - [6. Delete Category](#6-delete-category)
- [Components Module](#components-module)
  - [1. Get All Components (Search & Filter)](#1-get-all-components-search--filter)
  - [2. Create Component](#2-create-component)
  - [3. Update Component](#3-update-component)
  - [4. Deactivate Component](#4-deactivate-component)
  - [5. Activate Component](#5-activate-component)
- [Assets Module](#assets-module)
  - [1. Get All Assets (Search & Filter)](#1-get-all-assets-search--filter)
  - [2. Register Asset](#2-register-asset)
  - [3. Checkout Asset](#3-checkout-asset)
  - [4. Return Asset](#4-return-asset)
- [Quick Reference](#quick-reference)

---

## Health Check

### `GET /api/health`
Checks whether the backend server is running.

- **URL:** `http://localhost:5000/api/health`
- **Method:** `GET`
- **Auth Required:** No (Public)
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "your api is running, tum maje karo"
  }
  ```

---

## Authentication

### `GET /api/auth/me`
Fetches the currently authenticated user's profile and assigned roles from the Kubera database.

- **URL:** `http://localhost:5000/api/auth/me`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Headers:**
  ```http
  Authorization: Bearer <token>
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "User authenticate ho gaya hai",
    "user": {
      "id": "019318b2-5f6b-7c12-9c12-0123456789ab",
      "name": "John Doe",
      "email": "user@example.com",
      "authType": "UNIVERSITY",
      "isActive": true,
      "roles": ["SUPER_ADMIN"]
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Token missing, invalid, expired, or user not recognized.

---

## Storage Module

> **Note:** All `/api/storage/*` endpoints require authentication via `Authorization: Bearer <token>`.

### 1. Get All Storage Racks
Retrieve all storage racks with their nested drawers and active components, formatted with human-readable location codes (`COLOR-Rxx-Cxx`).

- **URL:** `http://localhost:5000/api/storage/racks`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Allowed Values | Description |
  |-----------|------|----------|---------|----------------|-------------|
  | `status` | string | No | `ACTIVE` | `ACTIVE`, `RETIRED`, `ALL` | Filters racks by their status |

- **Example Requests:**
  - Default / Active racks:
    `GET http://localhost:5000/api/storage/racks`
    or `GET http://localhost:5000/api/storage/racks?status=ACTIVE`
  - Retired racks:
    `GET http://localhost:5000/api/storage/racks?status=RETIRED`
  - All racks (both active and retired):
    `GET http://localhost:5000/api/storage/racks?status=ALL`

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "e962cf94-4d83-42e7-a9a3-5c8e310022f1",
        "color": "GREEN",
        "drawersPerRack": 3,
        "rackNumber": 1,
        "status": "ACTIVE",
        "locationCode": "GREEN-R03-C01",
        "drawers": [
          {
            "id": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
            "drawerNumber": 1,
            "locationCode": "GREEN-R03-C01-D01",
            "components": [
              {
                "id": "a4d3f211-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
                "code": "CMP-001",
                "name": "Arduino Uno R3",
                "trackingType": "INDIVIDUAL",
                "quantityAvailable": 5,
                "unit": "PIECE",
                "minimumStock": 2
              }
            ]
          }
        ]
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid status query parameter.
  - `401 Unauthorized`: Token missing or invalid.

---

### 2. Get Storage Rack by ID
Fetch a single storage rack by UUID with its drawers, active components, and location codes.

- **URL:** `http://localhost:5000/api/storage/racks/:rackId`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Route Parameters:**
  - `rackId` (UUID, required): Storage rack unique ID.
- **Example Request:**
  `GET http://localhost:5000/api/storage/racks/e962cf94-4d83-42e7-a9a3-5c8e310022f1`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e962cf94-4d83-42e7-a9a3-5c8e310022f1",
      "color": "GREEN",
      "drawersPerRack": 3,
      "rackNumber": 1,
      "status": "ACTIVE",
      "locationCode": "GREEN-R03-C01",
      "drawers": [...]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid rack ID format (must be UUID).
  - `401 Unauthorized`: Unauthorized access.
  - `404 Not Found`: Storage rack not found.

---

### 3. Get Storage Drawer by ID
Fetch details of a specific storage drawer, including its parent rack location code and components with categories.

- **URL:** `http://localhost:5000/api/storage/drawers/:drawerId`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Route Parameters:**
  - `drawerId` (UUID, required): Storage drawer unique ID.
- **Example Request:**
  `GET http://localhost:5000/api/storage/drawers/b3e5cf71-2b81-432d-94c6-e9185a0341e0`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
      "drawerNumber": 1,
      "locationCode": "GREEN-R03-C01-D01",
      "rack": {
        "id": "e962cf94-4d83-42e7-a9a3-5c8e310022f1",
        "color": "GREEN",
        "drawersPerRack": 3,
        "rackNumber": 1,
        "locationCode": "GREEN-R03-C01"
      },
      "components": [
        {
          "id": "a4d3f211-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
          "code": "CMP-001",
          "name": "Arduino Uno R3",
          "description": "Microcontroller board",
          "trackingType": "INDIVIDUAL",
          "quantityAvailable": 5,
          "unit": "PIECE",
          "minimumStock": 2,
          "category": {
            "id": "c1b2a3d4-e5f6-7890-abcd-ef0123456789",
            "name": "Microcontrollers"
          }
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid drawer ID format (must be UUID).
  - `401 Unauthorized`: Unauthorized access.
  - `404 Not Found`: Storage drawer not found.

---

### 4. Create Storage Rack
Create a new physical storage rack unit and automatically initialize its drawers.

- **URL:** `http://localhost:5000/api/storage/racks`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body:**
  ```json
  {
    "color": "GREEN",
    "drawersPerRack": 3
  }
  ```
  *Allowed Color & Drawer Combinations:*
  - `GREEN`: `3`
  - `BLACK`: `2`, `3`, or `4`
  - `ORANGE`: `2`

- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Storage rack created successfully.",
    "data": {
      "id": "f831bca0-5e92-41d8-a1c2-6d7e420133a2",
      "color": "GREEN",
      "drawersPerRack": 3,
      "rackNumber": 4,
      "status": "ACTIVE",
      "locationCode": "GREEN-R03-C04",
      "drawers": [...]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid storage color or invalid drawer count for that color.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: User does not possess the required role.

---

### 5. Retire Storage Rack
Retire an active storage rack. Rack must not contain any active components.

- **URL:** `http://localhost:5000/api/storage/racks/:rackId/retire`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `rackId` (UUID, required): Storage rack unique ID.
- **Example Request:**
  `PATCH http://localhost:5000/api/storage/racks/e962cf94-4d83-42e7-a9a3-5c8e310022f1/retire`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Storage rack retired successfully.",
    "data": {
      "id": "e962cf94-4d83-42e7-a9a3-5c8e310022f1",
      "color": "GREEN",
      "drawersPerRack": 3,
      "rackNumber": 1,
      "status": "RETIRED",
      "locationCode": "GREEN-R03-C01",
      "drawers": [...]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid rack ID.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Storage rack not found.
  - `409 Conflict`: 
    - Rack is already retired (`"This rack is already retired."`)
    - Rack still has components (`"Cannot retire a rack containing components."`, includes `componentCount`)

---

### 6. Restore Storage Rack
Restore a retired storage rack back to `ACTIVE` status.

- **URL:** `http://localhost:5000/api/storage/racks/:rackId/restore`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `rackId` (UUID, required): Storage rack unique ID.
- **Example Request:**
  `PATCH http://localhost:5000/api/storage/racks/e962cf94-4d83-42e7-a9a3-5c8e310022f1/restore`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Rack restored successfully.",
    "data": {
      "id": "e962cf94-4d83-42e7-a9a3-5c8e310022f1",
      "color": "GREEN",
      "drawersPerRack": 3,
      "rackNumber": 1,
      "status": "ACTIVE",
      "locationCode": "GREEN-R03-C01",
      "drawers": [...]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid rack ID.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Rack not found.
  - `409 Conflict`: Rack is already active (`"Rack is already active."`).

---

### 7. Delete Storage Rack
Permanently delete a storage rack and its empty drawers. A rack cannot be deleted if it contains components or is referenced by other database records.

- **URL:** `http://localhost:5000/api/storage/racks/:rackId`
- **Method:** `DELETE`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `rackId` (UUID, required): Storage rack unique ID.
- **Example Request:**
  `DELETE http://localhost:5000/api/storage/racks/e962cf94-4d83-42e7-a9a3-5c8e310022f1`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Rack and its empty drawers deleted successfully."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid rack ID format.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Rack not found (`"Rack not found."`).
  - `409 Conflict`:
    - Rack contains components (`"Rack cannot be deleted because it contains components."`, returns `componentCount`)
    - Rack is referenced by existing records (`"Rack cannot be deleted because it is referenced by existing records."`)
  - `500 Internal Server Error`: Server failure.

---

## Component Categories Module

> **Note:** All `/api/components/categories/*` endpoints require authentication via `Authorization: Bearer <token>`.

### 1. Get All Categories
Retrieve categories along with component counts. By default, only active categories are returned.

- **URL:** `http://localhost:5000/api/components/categories`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Allowed Values | Description |
  |-----------|------|----------|---------|----------------|-------------|
  | `status` | string | No | `ACTIVE` | `ACTIVE`, `INACTIVE`, `ALL` | Filters categories by status |

- **Example Requests:**
  - Active categories only (excludes inactive):
    `GET http://localhost:5000/api/components/categories`
    or `GET http://localhost:5000/api/components/categories?status=ACTIVE`
  - Inactive categories only:
    `GET http://localhost:5000/api/components/categories?status=INACTIVE`
  - All categories (includes inactive):
    `GET http://localhost:5000/api/components/categories?status=ALL`

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
        "name": "Microcontrollers",
        "description": "Development boards and MCUs",
        "isActive": true,
        "createdAt": "2026-11-16T08:00:00.000Z",
        "updatedAt": "2026-11-16T08:00:00.000Z",
        "_count": {
          "components": 8
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid status parameter (must be `ACTIVE`, `INACTIVE`, or `ALL`).
  - `401 Unauthorized`: Authentication required.

---

### 2. Create Category
Create a new component category.

- **URL:** `http://localhost:5000/api/components/categories`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body:**
  ```json
  {
    "name": "Sensors",
    "description": "Analog and digital sensors"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Category created successfully.",
    "data": {
      "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
      "name": "Sensors",
      "description": "Analog and digital sensors",
      "isActive": true,
      "createdAt": "2026-11-16T08:00:00.000Z",
      "updatedAt": "2026-11-16T08:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Category name is missing or invalid description format.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `409 Conflict`: A category with this name already exists.

---

### 3. Update Category
Update an existing category's name and/or description.

- **URL:** `http://localhost:5000/api/components/categories/:categoryId`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `categoryId` (UUID, required): Category unique ID.
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body:** (Provide at least one field)
  ```json
  {
    "name": "Sensors & Modules",
    "description": "Updated description"
  }
  ```
- **Example Request:**
  `PATCH http://localhost:5000/api/components/categories/7b13e921-2a6c-48d4-954f-6d55981907cb`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Category updated successfully.",
    "data": {
      "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
      "name": "Sensors & Modules",
      "description": "Updated description",
      "isActive": true,
      "createdAt": "2026-11-16T08:00:00.000Z",
      "updatedAt": "2026-11-16T08:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid category ID or invalid update body (empty name or no fields provided).
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Category not found.
  - `409 Conflict`: Another category with this name already exists.

---

### 4. Deactivate Category
Soft-deactivate a category (`isActive = false`) without deleting any of its assigned components.

- **URL:** `http://localhost:5000/api/components/categories/:categoryId/deactivate`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `categoryId` (UUID, required): Category unique ID.
- **Example Request:**
  `PATCH http://localhost:5000/api/components/categories/7b13e921-2a6c-48d4-954f-6d55981907cb/deactivate`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Category deactivated successfully.",
    "data": {
      "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
      "name": "Sensors & Modules",
      "description": "Updated description",
      "isActive": false,
      "createdAt": "2026-11-16T08:00:00.000Z",
      "updatedAt": "2026-11-16T08:45:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid category ID.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Category not found.
  - `409 Conflict`: Category is already inactive (`"Category is already inactive."`).

---

### 5. Activate Category
Re-activate a previously deactivated category (`isActive = true`).

- **URL:** `http://localhost:5000/api/components/categories/:categoryId/activate`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `categoryId` (UUID, required): Category unique ID.
- **Example Request:**
  `PATCH http://localhost:5000/api/components/categories/7b13e921-2a6c-48d4-954f-6d55981907cb/activate`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Category activated successfully.",
    "data": {
      "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
      "name": "Sensors & Modules",
      "description": "Updated description",
      "isActive": true,
      "createdAt": "2026-11-16T08:00:00.000Z",
      "updatedAt": "2026-11-16T09:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid category ID.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Category not found.
  - `409 Conflict`: Category is already active (`"Category is already active."`).
  - `500 Internal Server Error`: Server failure.

---

### 6. Delete Category
Permanently delete an empty category. Cannot delete if it still has components or is referenced.

- **URL:** `http://localhost:5000/api/components/categories/:categoryId`
- **Method:** `DELETE`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, or `CLUB_PRESIDENT`
- **Route Parameters:**
  - `categoryId` (UUID, required): Category unique ID.
- **Example Request:**
  `DELETE http://localhost:5000/api/components/categories/7b13e921-2a6c-48d4-954f-6d55981907cb`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Category deleted successfully."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid category ID format.
  - `401 Unauthorized`: Authentication required.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: Category not found.
  - `409 Conflict`:
    - Category contains components (`"Category cannot be deleted because it contains components."`, returns `componentCount`)
    - Category is referenced by existing database records
  - `500 Internal Server Error`: Server failure.

---

## Components Module

> **Note:** All `/api/components/*` endpoints require authentication via `Authorization: Bearer <token>`.

### 1. Get All Components (Search & Filter)
Retrieve a paginated list of components with support for text search, filtering by category, tracking type, storage drawer, and active status. Automatically computes human-readable location codes (`COLOR-Rxx-Cxx-Dxx`) for items assigned to active storage drawers.

- **URL:** `http://localhost:5000/api/components`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Allowed Values / Format | Description |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `search` | string | No | - | Text | Case-insensitive substring search matching component `name` or `code`. |
  | `trackingType` | string | No | - | `BULK`, `INDIVIDUAL` | Filters components by tracking mechanism. |
  | `categoryId` | string (UUID) | No | - | UUID | Filters components belonging to a specific category. |
  | `storageDrawerId` | string (UUID) | No | - | UUID | Filters components stored in a specific drawer. |
  | `status` | string | No | `ACTIVE` | `ACTIVE`, `INACTIVE`, `ALL` | Filters components by active status. |
  | `stockStatus` | string | No | - | `LOW_STOCK`, `OUT_OF_STOCK`, `IN_STOCK` | Filters `BULK` tracking components by stock availability level. |
  | `page` | number | No | `1` | Integer >= 1 | Page number for pagination. |
  | `limit` | number | No | `20` | Integer 1 to 100 | Number of components returned per page. |

- **Example Requests:**
  - Search by keyword:
    `GET http://localhost:5000/api/components?search=resistor`
  - Filter by `BULK` tracking:
    `GET http://localhost:5000/api/components?trackingType=BULK`
  - Filter by `INDIVIDUAL` tracking:
    `GET http://localhost:5000/api/components?trackingType=INDIVIDUAL`
  - Filter by category UUID:
    `GET http://localhost:5000/api/components?categoryId=b7c29241-e6f8-4143-afc5-8fd30f34f9d9`
  - Filter by stock status (`LOW_STOCK`):
    `GET http://localhost:5000/api/components?stockStatus=LOW_STOCK`
  - Filter by stock status (`OUT_OF_STOCK`):
    `GET http://localhost:5000/api/components?stockStatus=OUT_OF_STOCK`
  - Filter by stock status (`IN_STOCK`):
    `GET http://localhost:5000/api/components?stockStatus=IN_STOCK`
  - Custom pagination:
    `GET http://localhost:5000/api/components?page=1&limit=10`
  - Combined search, filter & pagination:
    `GET http://localhost:5000/api/components?search=resistor&trackingType=BULK&stockStatus=LOW_STOCK&page=1&limit=10`

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 1,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    },
    "data": [
      {
        "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
        "code": "RES-10K-025W",
        "name": "10k Ohm Resistor 1/4W",
        "description": "Through-hole resistor pack",
        "categoryId": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
        "trackingType": "BULK",
        "quantityAvailable": 100,
        "unit": "pcs",
        "minimumStock": 20,
        "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
        "isActive": true,
        "createdAt": "2026-11-17T07:00:00.000Z",
        "updatedAt": "2026-11-17T07:00:00.000Z",
        "locationCode": "GREEN-R03-C01-D01",
        "category": {
          "id": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
          "name": "Resistors"
        },
        "storageDrawer": {
          "id": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
          "drawerNumber": 1,
          "rack": {
            "color": "GREEN",
            "drawersPerRack": 3,
            "rackNumber": 1,
            "status": "ACTIVE"
          }
        },
        "_count": {
          "assets": 0,
          "movements": 1
        }
      }
    ]
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Invalid query parameters.` (array or non-string query parameter values)
    - `Status must be ACTIVE, INACTIVE, or ALL.`
    - `Tracking type must be BULK or INDIVIDUAL.`
    - `Stock status must be LOW_STOCK, OUT_OF_STOCK, or IN_STOCK.`
    - `Invalid category ID.` (malformed UUID)
    - `Invalid storage drawer ID.` (malformed UUID)
    - `Page must be positive and limit must be between 1 and 100.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `500 Internal Server Error`: Internal server error.

---

### 2. Create Component
Register a new component under an active category. Supports both bulk inventory (tracked by quantity) and individual serialized assets. If `initialQuantity` is provided for bulk tracking, an initial `STOCK_IN` inventory movement is automatically recorded.

- **URL:** `http://localhost:5000/api/components`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body Parameters:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `code` | string | Yes | Unique component code (e.g. `"ARD-UNO-R3"`). Trimmed, non-empty. |
  | `name` | string | Yes | Component name (e.g. `"Arduino Uno R3"`). Trimmed, non-empty. |
  | `categoryId` | string (UUID) | Yes | ID of an active category. |
  | `trackingType` | string | Yes | Inventory tracking type: `"BULK"` or `"INDIVIDUAL"`. |
  | `description` | string \| null | No | Optional description text. |
  | `initialQuantity` | number (integer) | No | Initial stock quantity (>= 0). **Valid only for `BULK` tracking**. Automatically creates an initial `STOCK_IN` movement. Must **not** be passed for `INDIVIDUAL` tracking. |
  | `unit` | string | No | Unit of measurement (e.g. `"pcs"`, `"meters"`). Default: `"pcs"`. |
  | `minimumStock` | number (integer) | No | Low stock alert threshold (>= 0). Default: `0`. |
  | `storageDrawerId` | string (UUID) \| null | No | Assigned storage drawer ID. Must belong to an `ACTIVE` rack. |

- **Example Request (BULK Tracking):**
  ```json
  {
    "code": "RES-10K-025W",
    "name": "10k Ohm Resistor 1/4W",
    "description": "Through-hole resistor pack",
    "categoryId": "7b13e921-2a6c-48d4-954f-6d55981907cb",
    "trackingType": "BULK",
    "initialQuantity": 100,
    "unit": "pcs",
    "minimumStock": 20,
    "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0"
  }
  ```

- **Example Request (INDIVIDUAL Tracking):**
  ```json
  {
    "code": "ARD-UNO-R3",
    "name": "Arduino Uno R3",
    "description": "ATmega328P development board",
    "categoryId": "7b13e921-2a6c-48d4-954f-6d55981907cb",
    "trackingType": "INDIVIDUAL",
    "unit": "pcs",
    "minimumStock": 2,
    "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0"
  }
  ```

- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Component created successfully.",
    "data": {
      "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
      "code": "ARD-UNO-R3",
      "name": "Arduino Uno R3",
      "description": "ATmega328P development board",
      "categoryId": "7b13e921-2a6c-48d4-954f-6d55981907cb",
      "trackingType": "INDIVIDUAL",
      "quantityAvailable": null,
      "unit": "pcs",
      "minimumStock": 2,
      "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
      "isActive": true,
      "createdAt": "2026-11-17T07:00:00.000Z",
      "updatedAt": "2026-11-17T07:00:00.000Z",
      "category": {
        "id": "7b13e921-2a6c-48d4-954f-6d55981907cb",
        "name": "Microcontrollers"
      }
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - Missing required fields (`code`, `name`, `categoryId`, `trackingType`)
    - `trackingType` is not `"BULK"` or `"INDIVIDUAL"`
    - Invalid UUID for `categoryId` or `storageDrawerId`
    - Negative integer for `initialQuantity` or `minimumStock`
    - `initialQuantity` passed for `"INDIVIDUAL"` tracking type (`"Initial quantity is not applicable to INDIVIDUAL components. Register physical assets separately."`)
  - `401 Unauthorized`: Token missing, invalid, or authenticated Kubera user not found.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`:
    - Category not found (`"Category not found."`)
    - Storage drawer not found (`"Storage drawer not found."`)
  - `409 Conflict`:
    - Category is inactive (`"Cannot create a component under an inactive category."`)
    - Assigned drawer belongs to a retired rack (`"Cannot assign a component to a retired rack."`)
    - Component code already exists (`"A component with this code already exists."`)
    - Referenced foreign key record missing (`"A referenced record no longer exists."`)
  - `500 Internal Server Error`: Internal server error.

---

### 3. Update Component
Update an existing component's metadata, category assignment, measurement unit, minimum stock threshold, or assigned storage drawer.

- **URL:** `http://localhost:5000/api/components/:componentId`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Route Parameters:**
  - `componentId` (UUID, required): Unique ID of the component to update.
- **Request Body Parameters:** (Provide at least one field; extraneous fields are rejected)
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `code` | string | No | Unique component code (non-empty string). |
  | `name` | string | No | Component name (non-empty string). |
  | `description` | string \| null | No | Optional description text or `null` to clear. |
  | `categoryId` | string (UUID) | No | ID of an active category. |
  | `unit` | string | No | Unit of measurement (non-empty string, e.g. `"pcs"`). |
  | `minimumStock` | number (integer) | No | Low stock alert threshold (non-negative integer >= 0). |
  | `storageDrawerId` | string (UUID) \| null | No | Assigned storage drawer ID (must belong to an `ACTIVE` rack), or `null` to unassign drawer. |

- **Example Request:**
  `PATCH http://localhost:5000/api/components/c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a`
  ```json
  {
    "name": "10k Ohm Resistor 1/2W",
    "minimumStock": 50,
    "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0"
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Component updated successfully.",
    "data": {
      "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
      "code": "RES-10K-025W",
      "name": "10k Ohm Resistor 1/2W",
      "description": "Through-hole resistor pack",
      "categoryId": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
      "trackingType": "BULK",
      "quantityAvailable": 100,
      "unit": "pcs",
      "minimumStock": 50,
      "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
      "isActive": true,
      "createdAt": "2026-11-17T07:00:00.000Z",
      "updatedAt": "2026-11-18T14:30:00.000Z",
      "category": {
        "id": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
        "name": "Resistors"
      }
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Invalid component ID.` (malformed UUID)
    - `Invalid request body.`
    - `Unsupported fields in request body.` (includes `fields` array of invalid keys)
    - `Provide at least one field to update.`
    - `Component code must be a non-empty string.`
    - `Component name must be a non-empty string.`
    - `Description must be a string or null.`
    - `Invalid category ID.`
    - `Unit must be a non-empty string.`
    - `Minimum stock must be a non-negative integer.`
    - `Invalid storage drawer ID.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`:
    - `Component not found.`
    - `Category not found.`
    - `Storage drawer not found.`
  - `409 Conflict`:
    - `Cannot assign an inactive category.`
    - `Cannot assign a component to a retired rack.`
    - `A component with this code already exists.`
    - `A referenced record no longer exists.`
  - `500 Internal Server Error`: Internal server error.

---

### 4. Deactivate Component
Soft-deactivate a component (`isActive = false`). A component cannot be deactivated if it currently has outstanding active loans or checked-out individual assets.

- **URL:** `http://localhost:5000/api/components/:componentId/deactivate`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Route Parameters:**
  - `componentId` (UUID, required): Unique ID of the component to deactivate.
- **Example Request:**
  `PATCH http://localhost:5000/api/components/c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a/deactivate`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Component deactivated successfully.",
    "data": {
      "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
      "code": "RES-10K-025W",
      "name": "10k Ohm Resistor 1/4W",
      "description": "Through-hole resistor pack",
      "categoryId": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
      "trackingType": "BULK",
      "quantityAvailable": 100,
      "unit": "pcs",
      "minimumStock": 20,
      "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
      "isActive": false,
      "createdAt": "2026-11-17T07:00:00.000Z",
      "updatedAt": "2026-11-18T15:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `Invalid component ID.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: `Component not found.`
  - `409 Conflict`:
    - `Component is already inactive..`
    - `Component has outstanding loans and cannot be deactivated.` (returns `outstandingLoanQuantity` and `checkedOutAssetCount`)
      ```json
      {
        "success": false,
        "message": "Component has outstanding loans and cannot be deactivated.",
        "outstandingLoanQuantity": 2,
        "checkedOutAssetCount": 1
      }
      ```
  - `500 Internal Server Error`: Server failure.

---

### 5. Activate Component
Restore an inactive component back to active status (`isActive = true`).

- **URL:** `http://localhost:5000/api/components/:componentId/activate`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Route Parameters:**
  - `componentId` (UUID, required): Unique ID of the component to activate.
- **Example Request:**
  `PATCH http://localhost:5000/api/components/c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a/activate`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Component activated successfully.",
    "data": {
      "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
      "code": "RES-10K-025W",
      "name": "10k Ohm Resistor 1/4W",
      "description": "Through-hole resistor pack",
      "categoryId": "b7c29241-e6f8-4143-afc5-8fd30f34f9d9",
      "trackingType": "BULK",
      "quantityAvailable": 100,
      "unit": "pcs",
      "minimumStock": 20,
      "storageDrawerId": "b3e5cf71-2b81-432d-94c6-e9185a0341e0",
      "isActive": true,
      "createdAt": "2026-11-17T07:00:00.000Z",
      "updatedAt": "2026-11-18T15:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `Invalid component Id..`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: `Component not Found..`
  - `409 Conflict`: `Component is already active.`
  - `500 Internal Server Error`: Internal server error.

---

## Assets Module

> **Note:** All `/api/assets/*` endpoints require authentication via `Authorization: Bearer <token>`.

### 1. Get All Assets (Search & Filter)
Retrieve a paginated list of physical serialized assets with support for search by asset tag or serial number, filtering by parent component ID, and filtering by asset status. Automatically resolves the parent component and computes the human-readable storage location code (`COLOR-Rxx-Cxx-Dxx`) if assigned to an active storage drawer.

- **URL:** `http://localhost:5000/api/assets`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Allowed Values / Format | Description |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `search` | string | No | - | Text | Case-insensitive substring search matching `assetTag` or `serialNumber`. |
  | `componentId` | string (UUID) | No | - | UUID | Filters assets belonging to a specific component. |
  | `status` | string | No | `ALL` | `AVAILABLE`, `CHECKED_OUT`, `UNDER_MAINTENANCE`, `DAMAGED`, `LOST`, `RETIRED`, `ALL` | Filters assets by status. |
  | `page` | number | No | `1` | Integer >= 1 | Page number for pagination. |
  | `limit` | number | No | `20` | Integer 1 to 100 | Number of assets returned per page. |

- **Example Requests:**
  - Get all assets (default pagination):
    `GET http://localhost:5000/api/assets`
  - Search by asset tag or serial number:
    `GET http://localhost:5000/api/assets?search=AST-ARD`
  - Filter by parent component ID:
    `GET http://localhost:5000/api/assets?componentId=c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a`
  - Filter by asset status:
    `GET http://localhost:5000/api/assets?status=AVAILABLE`
    or `GET http://localhost:5000/api/assets?status=CHECKED_OUT`
  - Combined search, filter & pagination:
    `GET http://localhost:5000/api/assets?search=AST-ARD&status=AVAILABLE&page=1&limit=10`

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Assets retrieved successfully.",
    "data": [
      {
        "id": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
        "componentId": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
        "assetTag": "AST-ARD-001",
        "serialNumber": "SN-987654321",
        "status": "AVAILABLE",
        "checkedOutToId": null,
        "checkedOutAt": null,
        "acquiredAt": "2026-11-20T10:00:00.000Z",
        "notes": "Purchased for robotics kit",
        "createdAt": "2026-11-21T07:00:00.000Z",
        "updatedAt": "2026-11-21T07:00:00.000Z",
        "component": {
          "id": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
          "code": "ARD-UNO-R3",
          "name": "Arduino Uno R3",
          "trackingType": "INDIVIDUAL",
          "storageDrawer": {
            "drawerNumber": 1,
            "rack": {
              "color": "GREEN",
              "drawersPerRack": 3,
              "rackNumber": 1
            }
          }
        },
        "locationCode": "GREEN-R03-C01-D01"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Query parameters must be single string values.`
    - `Invalid component ID.` (malformed UUID)
    - `Invalid asset status.`
    - `Page must be positive and limit must be between 1 and 100.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `500 Internal Server Error`: Internal server error.

---

### 2. Register Asset
Register a new physical serialized asset under an active component configured with `INDIVIDUAL` tracking type. Automatically creates an initial `STOCK_IN` inventory movement record.

- **URL:** `http://localhost:5000/api/assets`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body Parameters:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `componentId` | string (UUID) | Yes | ID of an active component with tracking type `INDIVIDUAL`. |
  | `assetTag` | string | Yes | Unique asset tag identifier (e.g. `"AST-ARD-001"`). Non-empty string. |
  | `serialNumber` | string | No | Optional manufacturer serial number. Non-empty string if provided. Must be unique. |
  | `acquiredAt` | string (ISO Date) | No | Optional acquisition date string (e.g. `"2026-11-20T10:00:00.000Z"`). |
  | `notes` | string | No | Optional asset notes or condition remarks. |

- **Example Request:**
  ```json
  {
    "componentId": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
    "assetTag": "AST-ARD-001",
    "serialNumber": "SN-987654321",
    "acquiredAt": "2026-11-20T10:00:00.000Z",
    "notes": "Purchased for robotics kit"
  }
  ```

- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Asset registered successfully.",
    "data": {
      "id": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
      "componentId": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
      "assetTag": "AST-ARD-001",
      "serialNumber": "SN-987654321",
      "status": "AVAILABLE",
      "checkedOutToId": null,
      "checkedOutAt": null,
      "acquiredAt": "2026-11-20T10:00:00.000Z",
      "notes": "Purchased for robotics kit",
      "createdAt": "2026-11-21T07:00:00.000Z",
      "updatedAt": "2026-11-21T07:00:00.000Z"
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Invalid request body.`
    - `Invalid component Id / A valid component id required. `
    - `Asset tag is required.`
    - `Serial number must be a non-empty string.`
    - `Acquired date must be a valid date string.`
    - `Notes must be a string.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: `Component not found.`
  - `409 Conflict`:
    - `Cannot register assets under an inactive component.`
    - `Assets can only be registered for INDIVIDUAL components.`
    - `Asset tag or serial number already exists.`
  - `500 Internal Server Error`: Internal server error.

---

### 3. Checkout Asset
Issue an available individual asset to an active club member. Atomically marks the asset as `CHECKED_OUT`, creates an `InventoryLoan` record, and logs a `CHECKOUT` inventory movement.

- **URL:** `http://localhost:5000/api/assets/:assetId/checkout`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Route Parameters:**
  - `assetId` (UUID, required): Unique ID of the asset to check out.
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body Parameters:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `memberId` | string (UUID) | Yes | User ID of the active member borrowing the asset. |
  | `dueAt` | string (ISO Date) | No | Optional expected return date. Must be a valid future date. |
  | `note` | string | No | Optional checkout note/memo. |

- **Example Request:**
  `POST http://localhost:5000/api/assets/e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b/checkout`
  ```json
  {
    "memberId": "019318b2-5f6b-7c12-9c12-0123456789ab",
    "dueAt": "2026-11-28T18:00:00.000Z",
    "note": "Borrowed for robotics competition"
  }
  ```

- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Asset checked out successfully.",
    "data": {
      "assetId": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
      "assetTag": "AST-ARD-001",
      "loan": {
        "id": "f5a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
        "componentId": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
        "assetId": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
        "memberId": "019318b2-5f6b-7c12-9c12-0123456789ab",
        "issuedById": "019318b2-5f6b-7c12-9c12-9876543210fe",
        "quantityBorrowed": 1,
        "quantityReturned": 0,
        "quantityWrittenOff": 0,
        "checkedOutAt": "2026-11-21T08:00:00.000Z",
        "dueAt": "2026-11-28T18:00:00.000Z",
        "note": "Borrowed for robotics competition",
        "createdAt": "2026-11-21T08:00:00.000Z",
        "updatedAt": "2026-11-21T08:00:00.000Z"
      }
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Invalid asset ID.` (malformed UUID)
    - `Invalid request body.`
    - `A valid member ID is required.`
    - `Due date must be a valid future date.`
    - `Note must be a string.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`:
    - `Asset not found.`
    - `Member not found.`
  - `409 Conflict`:
    - `Cannot checkout an asset under an inactive component.`
    - `This operation requires an INDIVIDUAL component.`
    - `Cannot issue an asset to an inactive member.`
    - `Asset is not currently available for checkout.`
  - `500 Internal Server Error`: Internal server error.

---

### 4. Return Asset
Record the return of an individual asset. Atomically sets the asset status back to `AVAILABLE`, increments `quantityReturned` on the corresponding active loan, and logs a `RETURN` inventory movement.

- **URL:** `http://localhost:5000/api/assets/:assetId/return`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <token>`)
- **Required Roles:** `SUPER_ADMIN`, `ADMIN`, `CLUB_PRESIDENT`, or `VICE_PRESIDENT`
- **Route Parameters:**
  - `assetId` (UUID, required): Unique ID of the asset being returned.
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
- **Request Body Parameters:** (Optional)
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `note` | string | No | Optional note regarding the return condition. |

- **Example Request:**
  `PATCH http://localhost:5000/api/assets/e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b/return`
  ```json
  {
    "note": "Returned in perfect working condition"
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Asset returned successfully.",
    "data": {
      "assetId": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
      "assetTag": "AST-ARD-001",
      "loan": {
        "id": "f5a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
        "componentId": "c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a",
        "assetId": "e4b6c31a-5d2a-4a21-9952-1c2d3e4f5a6b",
        "memberId": "019318b2-5f6b-7c12-9c12-0123456789ab",
        "issuedById": "019318b2-5f6b-7c12-9c12-9876543210fe",
        "quantityBorrowed": 1,
        "quantityReturned": 1,
        "quantityWrittenOff": 0,
        "checkedOutAt": "2026-11-21T08:00:00.000Z",
        "dueAt": "2026-11-28T18:00:00.000Z",
        "note": "Returned in perfect working condition",
        "createdAt": "2026-11-21T08:00:00.000Z",
        "updatedAt": "2026-11-21T09:30:00.000Z"
      }
    }
  }
  ```

- **Error Responses:**
  - `400 Bad Request`:
    - `Invalid asset ID.` (malformed UUID)
    - `Invalid request body.`
    - `Note must be a string.`
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Insufficient role permissions.
  - `404 Not Found`: `Asset not found.`
  - `409 Conflict`:
    - `Asset is not currently checked out.`
    - `No outstanding loan was found for this asset.`
  - `500 Internal Server Error`: Internal server error.

---

## Quick Reference

```http
### Health Check
GET http://localhost:5000/api/health

### Auth
GET http://localhost:5000/api/auth/me
Authorization: Bearer <token>

### Storage - Get Racks (Default / Active)
GET http://localhost:5000/api/storage/racks
GET http://localhost:5000/api/storage/racks?status=ACTIVE
Authorization: Bearer <token>

### Storage - Get Racks (Retired Only)
GET http://localhost:5000/api/storage/racks?status=RETIRED
Authorization: Bearer <token>

### Storage - Get Racks (All Racks)
GET http://localhost:5000/api/storage/racks?status=ALL
Authorization: Bearer <token>

### Storage - Get Rack by ID
GET http://localhost:5000/api/storage/racks/:rackId
Authorization: Bearer <token>

### Storage - Get Drawer by ID
GET http://localhost:5000/api/storage/drawers/:drawerId
Authorization: Bearer <token>

### Storage - Create Rack
POST http://localhost:5000/api/storage/racks
Authorization: Bearer <token>
Content-Type: application/json

{
  "color": "GREEN",
  "drawersPerRack": 3
}

### Storage - Retire Rack
PATCH http://localhost:5000/api/storage/racks/:rackId/retire
Authorization: Bearer <token>

### Storage - Restore Rack
PATCH http://localhost:5000/api/storage/racks/:rackId/restore
Authorization: Bearer <token>

### Storage - Delete Rack
DELETE http://localhost:5000/api/storage/racks/:rackId
Authorization: Bearer <token>

### Categories - Get All (Active Only / Excludes Inactive)
GET http://localhost:5000/api/components/categories
GET http://localhost:5000/api/components/categories?status=ACTIVE
Authorization: Bearer <token>

### Categories - Get All (Includes Inactive)
GET http://localhost:5000/api/components/categories?status=ALL
Authorization: Bearer <token>

### Categories - Get Inactive Only
GET http://localhost:5000/api/components/categories?status=INACTIVE
Authorization: Bearer <token>

### Categories - Create Category
POST http://localhost:5000/api/components/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sensors",
  "description": "Analog and digital sensors"
}

### Categories - Update Category
PATCH http://localhost:5000/api/components/categories/:categoryId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sensors & Modules",
  "description": "Updated description"
}

### Categories - Deactivate Category
PATCH http://localhost:5000/api/components/categories/:categoryId/deactivate
Authorization: Bearer <token>

### Categories - Activate Category
PATCH http://localhost:5000/api/components/categories/:categoryId/activate
Authorization: Bearer <token>

### Categories - Delete Category
DELETE http://localhost:5000/api/components/categories/:categoryId
Authorization: Bearer <token>

### Components - Get All (Paginated)
GET http://localhost:5000/api/components?page=1&limit=10
Authorization: Bearer <token>

### Components - Search by Keyword (Name or Code)
GET http://localhost:5000/api/components?search=resistor
Authorization: Bearer <token>

### Components - Filter by Tracking Type (BULK)
GET http://localhost:5000/api/components?trackingType=BULK
Authorization: Bearer <token>

### Components - Filter by Tracking Type (INDIVIDUAL)
GET http://localhost:5000/api/components?trackingType=INDIVIDUAL
Authorization: Bearer <token>

### Components - Filter by Category
GET http://localhost:5000/api/components?categoryId=b7c29241-e6f8-4143-afc5-8fd30f34f9d9
Authorization: Bearer <token>

### Components - Filter by Stock Status (LOW_STOCK / OUT_OF_STOCK / IN_STOCK)
GET http://localhost:5000/api/components?stockStatus=LOW_STOCK
Authorization: Bearer <token>

### Components - Combined Search, Filter & Pagination
GET http://localhost:5000/api/components?search=resistor&trackingType=BULK&stockStatus=LOW_STOCK&page=1&limit=10
Authorization: Bearer <token>

### Components - Create Component (BULK)
POST http://localhost:5000/api/components
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "RES-10K-025W",
  "name": "10k Ohm Resistor 1/4W",
  "description": "Through-hole resistor pack",
  "categoryId": "<category_uuid>",
  "trackingType": "BULK",
  "initialQuantity": 100,
  "unit": "pcs",
  "minimumStock": 20,
  "storageDrawerId": "<drawer_uuid>"
}

### Components - Create Component (INDIVIDUAL)
POST http://localhost:5000/api/components
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "ARD-UNO-R3",
  "name": "Arduino Uno R3",
  "description": "ATmega328P development board",
  "categoryId": "<category_uuid>",
  "trackingType": "INDIVIDUAL",
  "unit": "pcs",
  "minimumStock": 2,
  "storageDrawerId": "<drawer_uuid>"
}

### Components - Update Component
PATCH http://localhost:5000/api/components/:componentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "10k Ohm Resistor 1/2W",
  "minimumStock": 50,
  "storageDrawerId": "<drawer_uuid>"
}

### Components - Deactivate Component
PATCH http://localhost:5000/api/components/:componentId/deactivate
Authorization: Bearer <token>

### Components - Activate Component
PATCH http://localhost:5000/api/components/:componentId/activate
Authorization: Bearer <token>

### Assets - Get All (Paginated)
GET http://localhost:5000/api/assets?page=1&limit=20
Authorization: Bearer <token>

### Assets - Search by Tag or Serial
GET http://localhost:5000/api/assets?search=AST-ARD
Authorization: Bearer <token>

### Assets - Filter by Status
GET http://localhost:5000/api/assets?status=AVAILABLE
Authorization: Bearer <token>

### Assets - Filter by Component ID
GET http://localhost:5000/api/assets?componentId=c2a9df34-8c7e-4123-9a1b-4f5e6d7c8b9a
Authorization: Bearer <token>

### Assets - Combined Search, Filter & Pagination
GET http://localhost:5000/api/assets?search=AST-ARD&status=AVAILABLE&page=1&limit=10
Authorization: Bearer <token>

### Assets - Register Asset
POST http://localhost:5000/api/assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "componentId": "<component_uuid>",
  "assetTag": "AST-ARD-001",
  "serialNumber": "SN-987654321",
  "acquiredAt": "2026-11-20T10:00:00.000Z",
  "notes": "Purchased for robotics kit"
}

### Assets - Checkout Asset
POST http://localhost:5000/api/assets/:assetId/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": "<member_user_uuid>",
  "dueAt": "2026-11-28T18:00:00.000Z",
  "note": "Borrowed for robotics competition"
}

### Assets - Return Asset
PATCH http://localhost:5000/api/assets/:assetId/return
Authorization: Bearer <token>
Content-Type: application/json

{
  "note": "Returned in perfect working condition"
}
```
