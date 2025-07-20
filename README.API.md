# QuickCheck API Documentation

## Overview

The QuickCheck API provides endpoints for managing vehicle inspections, photo uploads, and data retrieval. This documentation outlines the available endpoints, request/response formats, and data structures.

## Base URL

```
https://api.quickcheck.com/v1
```

## Authentication

All API requests require authentication using a Bearer token:

```
Authorization: Bearer <your_token>
```

## Data Types

### Inspection Status Types
```typescript
type WindshieldCondition = 'good' | 'bad';
type WiperBladeCondition = 'good' | 'front_minor' | 'front_moderate' | 'front_major' | 'rear_minor' | 'rear_moderate' | 'rear_major';
type WasherSquirterCondition = 'good' | 'leaking' | 'not_working' | 'no_pump_sound';
type StateInspectionStatus = 'expired' | 'this_year' | 'next_year' | 'year_after';
type WasherFluidCondition = 'full' | 'leaking' | 'not_working' | 'no_pump_sound';
type EngineAirFilterCondition = 'good' | 'next_oil_change' | 'highly_recommended' | 'today' | 'animal_related';
type BatteryCondition = 'good' | 'warning' | 'bad' | 'na' | 'terminal_cleaning' | 'less_than_5yr';
type TireCondition = 'good' | 'warning' | 'bad' | 'over_7yr' | 'over_6yr' | 'inner_wear' | 'outer_wear' | 'wear_indicator' | 'separated' | 'dry_rotted' | 'na' | 'no_spare';
type BrakeCondition = 'good' | 'soon' | 'very_soon' | 'today' | 'metal_to_metal' | 'rotors' | 'pull_wheels' | 'drums_not_checked';
type StaticStickerStatus = 'good' | 'not_oil_change' | 'need_sticker';
type DrainPlugType = 'metal' | 'plastic';
type TireRepairStatus = 'repairable' | 'not_tire_repair' | 'non_repairable';
type TPMSType = 'not_check' | 'bad_sensor';
type TireRotationStatus = 'good' | 'bad';
type TreadCondition = 'green' | 'yellow' | 'red';
```

### Data Structures

#### ImageUpload
```typescript
interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
}
```

#### TireTread
```typescript
interface TireTread {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  inner_edge_condition: TreadCondition;
  inner_condition: TreadCondition;
  center_condition: TreadCondition;
  outer_condition: TreadCondition;
  outer_edge_condition: TreadCondition;
}
```

#### TirePhoto
```typescript
interface TirePhoto {
  type: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'front_brakes' | 'rear_brakes';
  photos: ImageUpload[];
}
```

#### TireComment
```typescript
interface TireComment {
  position: 'driver_front' | 'passenger_front' | 'driver_rear' | 'passenger_rear' | 'spare';
  comment: string;
}
```

#### TireDate
```typescript
interface TireDate {
  position: 'driver_front' | 'passenger_front' | 'driver_rear' | 'passenger_rear' | 'spare';
  tire_date: string;
}
```

## Endpoints

### Inspections

#### Create Inspection
```http
POST /inspections
```

Request Body:
```json
{
  "vin": "string",
  "date": "string",
  "user": "string",
  "mileage": "string",
  "windshield_condition": "WindshieldCondition",
  "wiper_blades": "WiperBladeCondition",
  "washer_squirters": "WasherSquirterCondition",
  "dash_lights_photos": "ImageUpload[]",
  "tpms_placard": "ImageUpload[]",
  "state_inspection_status": "StateInspectionStatus",
  "state_inspection_month": "number",
  "washer_fluid": "WasherFluidCondition",
  "washer_fluid_photo": "ImageUpload[]",
  "engine_air_filter": "EngineAirFilterCondition",
  "engine_air_filter_photo": "ImageUpload[]",
  "battery_condition": "BatteryCondition",
  "battery_photos": "ImageUpload[]",
  "tpms_tool_photo": "ImageUpload[]",
  "passenger_front_tire": "TireCondition",
  "driver_front_tire": "TireCondition",
  "driver_rear_tire": "TireCondition",
  "passenger_rear_tire": "TireCondition",
  "spare_tire": "TireCondition",
  "front_brakes": "ImageUpload[]",
  "rear_brakes": "ImageUpload[]",
  "tire_photos": "TirePhoto[]",
  "tire_repair_status": "TireRepairStatus",
  "tire_repair_zones": "TireRepairZone[]",
  "tpms_type": "TPMSType",
  "tpms_zones": "TPMSZone[]",
  "tire_rotation": "TireRotationStatus",
  "static_sticker": "StaticStickerStatus",
  "drain_plug_type": "DrainPlugType",
  "notes": "string",
  "tire_comments": "TireComment[]",
  "tire_dates": "TireDate[]"
}
```

Response:
```json
{
  "id": "string",
  "created_at": "string",
  "status": "success"
}
```

#### Get Inspection
```http
GET /inspections/{id}
```

Response:
```json
{
  "id": "string",
  "vin": "string",
  "date": "string",
  "user": "string",
  "mileage": "string",
  // ... all inspection fields
}
```

#### List Inspections
```http
GET /inspections
```

Query Parameters:
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `vin`: string (optional)
- `date_from`: string (optional)
- `date_to`: string (optional)
- `user_id`: string (optional)

Response:
```json
{
  "data": [
    {
      "id": "string",
      "vin": "string",
      "date": "string",
      "user": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### Update Inspection
```http
PUT /inspections/{id}
```

Request Body: Same as Create Inspection

Response:
```json
{
  "id": "string",
  "updated_at": "string",
  "status": "success"
}
```

### Drafts

#### Save Draft
```http
POST /drafts
```

Request Body:
```json
{
  "draft_data": "object",
  "user_id": "string"
}
```

Response:
```json
{
  "id": "string",
  "created_at": "string",
  "status": "success"
}
```

#### Get Draft
```http
GET /drafts/{id}
```

Response:
```json
{
  "id": "string",
  "draft_data": "object",
  "last_updated": "string"
}
```

#### Update Draft
```http
PUT /drafts/{id}
```

Request Body:
```json
{
  "draft_data": "object"
}
```

Response:
```json
{
  "id": "string",
  "updated_at": "string",
  "status": "success"
}
```

#### Delete Draft
```http
DELETE /drafts/{id}
```

Response:
```json
{
  "status": "success"
}
```

### Photos

#### Upload Photo
```http
POST /photos
```

Request Body:
```json
{
  "type": "string",
  "file": "File",
  "inspection_id": "string"
}
```

Response:
```json
{
  "id": "string",
  "url": "string",
  "type": "string",
  "created_at": "string"
}
```

#### Delete Photo
```http
DELETE /photos/{id}
```

Response:
```json
{
  "status": "success"
}
```

### Tire Comments

#### Add Tire Comment
```http
POST /inspections/{inspection_id}/tire-comments
```

Request Body:
```json
{
  "position": "string",
  "comment": "string"
}
```

Response:
```json
{
  "id": "string",
  "created_at": "string",
  "status": "success"
}
```

#### Get Tire Comments
```http
GET /inspections/{inspection_id}/tire-comments
```

Response:
```json
{
  "data": [
    {
      "id": "string",
      "position": "string",
      "comment": "string",
      "created_at": "string"
    }
  ]
}
```

### Tire Dates

#### Add Tire Date
```http
POST /inspections/{inspection_id}/tire-dates
```

Request Body:
```json
{
  "position": "string",
  "tire_date": "string"
}
```

Response:
```json
{
  "id": "string",
  "created_at": "string",
  "status": "success"
}
```

#### Get Tire Dates
```http
GET /inspections/{inspection_id}/tire-dates
```

Response:
```json
{
  "data": [
    {
      "id": "string",
      "position": "string",
      "tire_date": "string",
      "created_at": "string"
    }
  ]
}
```

### Reports

#### Generate Inspection Report
```http
GET /inspections/{id}/report
```

Query Parameters:
- `format`: string (pdf, html, json) (default: pdf)

Response:
- PDF/HTML file or JSON data

#### Get Inspection Statistics
```http
GET /reports/statistics
```

Query Parameters:
- `date_from`: string (optional)
- `date_to`: string (optional)
- `user_id`: string (optional)

Response:
```json
{
  "total_inspections": "number",
  "inspections_by_status": "object",
  "inspections_by_user": "object",
  "inspections_by_date": "object"
}
```

## Error Responses

All endpoints may return the following error responses:

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

Common error codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- 100 requests per minute per IP address
- 1000 requests per hour per API key

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1620000000
```

## Webhooks

The API supports webhooks for real-time notifications of inspection events:

### Available Events
- `inspection.created`
- `inspection.updated`
- `inspection.deleted`
- `photo.uploaded`
- `photo.deleted`
- `draft.saved`
- `draft.updated`

### Webhook Payload
```json
{
  "event": "string",
  "data": {
    "id": "string",
    // ... event specific data
  },
  "timestamp": "string"
}
```

## SDKs

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Java
- .NET

## Support

For API support, please contact:
- Email: api-support@quickcheck.com
- Documentation: https://docs.quickcheck.com
- Status Page: https://status.quickcheck.com 