# Replyke Connection System - Design & Implementation Plan

## Overview

This document outlines the design and implementation plan for adding bidirectional "Connection" relationships to the Replyke social features framework. Connections complement the existing one-way "Follow" system by providing mutual friend/connection functionality similar to Facebook friends or LinkedIn connections.

## Current State Analysis

### Existing Follow System
- **Model**: `Follow` (`src/models/Follow.ts`)
- **Type**: One-way relationships
- **Fields**: `id`, `projectId`, `followerId`, `followedId`, `createdAt`
- **Associations**:
  - User hasMany Follow as "following" (followerId)
  - User hasMany Follow as "followers" (followedId)

### Limitations
- No mutual relationship requirement
- No request/approval workflow
- No way to establish bidirectional "friend" relationships
- Limited social graph functionality

## Connection System Design

### Core Concept
Connections are **bidirectional relationships** that require **mutual agreement** between two users. Unlike follows, connections represent equal partnerships similar to friendships or professional connections.

### Key Design Principles

1. **Single Model Approach**: Use one `Connection` model to handle both requests and established connections
2. **Complete History**: Maintain full interaction history (requests, responses, status changes)
3. **Duplicate Prevention**: Prevent multiple active requests between same users
4. **Industry Standards**: Follow patterns from Facebook, LinkedIn, and other major platforms

## Database Schema

### Connection Model

```typescript
// src/models/Connection.ts
interface IConnectionAttributes {
  id: string;
  projectId: string;
  requesterId: string;    // User who initiated the connection request
  receiverId: string;     // User who received the connection request
  status: 'pending' | 'accepted' | 'declined';
  message?: string;       // Optional message with connection request
  respondedAt?: Date;     // When the request was responded to (accept/decline)
  createdAt: Date;        // When the request was sent
}
```

### Status Definitions

| Status | Description | Initiator | Receiver | Notes |
|--------|-------------|-----------|----------|-------|
| `pending` | Request sent, awaiting response | Can withdraw | Can accept/decline | Active request state |
| `accepted` | Connection established | Equal partners | Equal partners | Bidirectional relationship |
| `declined` | Request rejected | Cannot re-request | Can delete & create new request | After decline, only receiver can re-initiate |

### Database Constraints

```sql
-- Unique constraint to prevent duplicate requests
UNIQUE INDEX idx_connection_unique ON Connections (projectId, requesterId, receiverId);

-- Optimized indexes for common queries
INDEX idx_connection_requester ON Connections (projectId, requesterId, status);
INDEX idx_connection_receiver ON Connections (projectId, receiverId, status);
INDEX idx_connection_status ON Connections (projectId, status);
INDEX idx_connection_created ON Connections (projectId, createdAt);
```

### User Model Associations

```typescript
// In User.associate()
User.hasMany(Connection, {
  foreignKey: "requesterId",
  as: "sentConnections",
  onDelete: "CASCADE"
});

User.hasMany(Connection, {
  foreignKey: "receiverId",
  as: "receivedConnections",
  onDelete: "CASCADE"
});
```

## API Design

### Router Structure
```
src/v5/routers/users.ts      // User-centric connection operations
src/v5/routers/connections.ts  // Connection list operations
```

### Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| **User-centric operations (under `/users` router)** |
| POST | `/users/:userId/connection` | `requestConnection` | Send connection request to user |
| GET | `/users/:userId/connection` | `fetchConnectionStatus` | Get connection status with user |
| DELETE | `/users/:userId/connection` | `removeConnectionByUserId` | Decline/withdraw/disconnect with user |
| GET | `/users/:userId/connections` | `fetchConnectionsByUserId` | Get connections of specific user |
| GET | `/users/:userId/connections-count` | `fetchConnectionsCountByUserId` | Get connections count for specific user |
| **Connection-centric operations (under `/connections` router)** |
| GET | `/connections` | `fetchConnections` | List established connections |
| GET | `/connections/count` | `fetchConnectionsCount` | Get connections count |
| GET | `/connections/pending/sent` | `fetchSentPendingConnections` | List sent pending requests |
| GET | `/connections/pending/received` | `fetchReceivedPendingConnections` | List received pending requests |
| PUT | `/connections/:connectionId/accept` | `acceptConnection` | Accept specific connection |
| PUT | `/connections/:connectionId/decline` | `declineConnection` | Decline specific connection |
| DELETE | `/connections/:connectionId` | `removeConnection` | Remove specific connection |

## API Documentation

### Base URLs
Connection endpoints are split across two routers under the `/v5/` namespace:
```
User-centric operations: https://your-api-domain.com/v5/users
List operations: https://your-api-domain.com/v5/connections
```

### Authentication
All endpoints require user authentication via the `requireUserAuth` middleware. Include the user's JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Rate Limiting
- Connection requests: 25 requests per 5 minutes
- Other endpoints: 50-100 requests per 5 minutes

### Content Type
All requests should include:
```
Content-Type: application/json
```

### 1. Send Connection Request

**Endpoint:** `POST /v5/users/:userId/connection`

**Path Parameters:**
- `userId`: ID of the user to send connection request to

**Request Body:**
```json
{
  "message": "Optional connection message"
}
```

**Success Response (201):**
```json
{
  "id": "connection-uuid",
  "status": "pending",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid or missing userId
- `400` - Cannot request connection to self
- `404` - User not found
- `409` - Connection already exists (with specific error codes):
  - `connection/request-pending` - Request already pending
  - `connection/already-connected` - Users already connected
  - `connection/request-declined` - Previous request declined, only receiver can re-initiate

### 2. Accept Connection Request

**Endpoint:** `PUT /v5/connections/:connectionId/accept`

**Path Parameters:**
- `connectionId`: ID of the connection to accept

**Description:** Accept a specific pending connection request

**Success Response (200):**
```json
{
  "id": "connection-uuid",
  "status": "accepted",
  "respondedAt": "2024-01-01T12:05:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid connectionId
- `403` - Only receiver can accept requests
- `404` - Pending connection not found

### 3. Decline Connection Request

**Endpoint:** `PUT /v5/connections/:connectionId/decline`

**Path Parameters:**
- `connectionId`: ID of the connection to decline

**Description:** Decline a specific pending connection request

**Success Response (200):**
```json
{
  "id": "connection-uuid",
  "status": "declined",
  "respondedAt": "2024-01-01T12:05:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid connectionId
- `403` - Only receiver can decline requests
- `404` - Pending connection not found

### 4. Remove Connection (User-Centric)

**Endpoint:** `DELETE /v5/users/:userId/connection`

**Path Parameters:**
- `userId`: ID of the user to decline/withdraw/disconnect with

**Description:** This endpoint handles multiple scenarios based on the current connection status:
- **Decline**: If the specified user sent you a pending request, decline it
- **Withdraw**: If you sent a pending request to the specified user, withdraw it
- **Disconnect**: If you're connected with the specified user, remove the connection

**Success Responses (200):**

For decline (when other user sent you a pending request):
```json
{
  "id": "connection-uuid",
  "status": "declined",
  "respondedAt": "2024-01-01T12:05:00.000Z"
}
```

For withdraw (when you sent them a pending request):
```json
{
  "message": "Connection request withdrawn successfully.",
  "action": "withdraw"
}
```

For disconnect (when you're connected):
```json
{
  "message": "Connection removed successfully.",
  "action": "disconnect"
}
```

**Error Responses:**
- `400` - Invalid userId
- `400` - Cannot disconnect from yourself
- `404` - No connection found between these users that can be removed

### 5. Remove Connection (Connection-Centric)

**Endpoint:** `DELETE /v5/connections/:connectionId`

**Path Parameters:**
- `connectionId`: ID of the connection to remove

**Description:** Remove a specific connection (withdraw pending request or disconnect established connection)

**Success Response (200):**
```json
{
  "message": "Connection request withdrawn successfully."
}
// or
{
  "message": "Connection removed successfully."
}
```

**Error Responses:**
- `400` - Invalid connectionId
- `403` - Unauthorized (wrong user for action)
- `404` - Connection not found

### 6. Get Connection Status

**Endpoint:** `GET /v5/users/:userId/connection`

**Path Parameters:**
- `userId`: ID of the user to check connection status with

**Description:** Check the connection status between the current user and the specified user

**Success Responses:**

No connection:
```json
{ "status": "none" }
```

Pending request sent by current user:
```json
{
  "status": "pending",
  "type": "sent",
  "connectionId": "connection-uuid",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

Pending request received by current user:
```json
{
  "status": "pending",
  "type": "received",
  "connectionId": "connection-uuid",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

Connected users:
```json
{
  "status": "connected",
  "connectionId": "connection-uuid",
  "connectedAt": "2024-01-01T12:05:00.000Z",
  "requestedAt": "2024-01-01T12:00:00.000Z"
}
```

Declined request (sent by current user):
```json
{
  "status": "declined",
  "type": "sent",
  "connectionId": "connection-uuid",
  "respondedAt": "2024-01-01T12:05:00.000Z"
}
```

Declined request (received by current user):
```json
{
  "status": "declined",
  "type": "received",
  "connectionId": "connection-uuid",
  "respondedAt": "2024-01-01T12:05:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid userId
- `400` - Cannot check connection status with yourself

### 7. Get Connections Count

**Endpoint:** `GET /v5/connections/count`

**Description:** Get the count of established connections for the current user

**Success Response (200):**
```json
{
  "count": 42
}
```

### 8. Get Established Connections

**Endpoint:** `GET /v5/connections?page=1&limit=20`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "connections": [
    {
      "id": "connection-uuid",
      "connectedUser": {
        "id": "user-uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Software Engineer",
        "reputation": 150
      },
      "connectedAt": "2024-01-01T12:05:00.000Z",
      "requestedAt": "2024-01-01T12:00:00.000Z",
      "message": "Original connection message"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 45,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 9. Get Sent Pending Connection Requests

**Endpoint:** `GET /v5/connections/pending/sent?page=1&limit=20`

**Description:** Get connection requests that the current user has sent to others and are still pending

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "requests": [
    {
      "id": "connection-uuid",
      "type": "sent",
      "user": {
        "id": "user-uuid",
        "name": "Bob Wilson",
        "username": "bobwilson",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Designer",
        "reputation": 120
      },
      "message": "Let's connect!",
      "createdAt": "2024-01-01T11:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 2,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 10. Get Received Pending Connection Requests

**Endpoint:** `GET /v5/connections/pending/received?page=1&limit=20`

**Description:** Get connection requests that others have sent to the current user and are still pending

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "requests": [
    {
      "id": "connection-uuid",
      "type": "received",
      "user": {
        "id": "user-uuid",
        "name": "Jane Smith",
        "username": "janesmith",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Product Manager",
        "reputation": 200
      },
      "message": "Hi! I'd like to connect with you.",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 3,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 11. Get User Connections

**Endpoint:** `GET /v5/users/:userId/connections?page=1&limit=20`

**Path Parameters:**
- `userId`: ID of the user to get connections for

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Description:** Get list of established connections for a specific user (public endpoint)

**Success Response (200):**
```json
{
  "connections": [
    {
      "id": "connection-uuid",
      "connectedUser": {
        "id": "user-uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Software Engineer",
        "reputation": 150
      },
      "connectedAt": "2024-01-01T12:05:00.000Z",
      "requestedAt": "2024-01-01T12:00:00.000Z",
      "message": "Original connection message"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 45,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 12. Get User Connections Count

**Endpoint:** `GET /v5/users/:userId/connections-count`

**Path Parameters:**
- `userId`: ID of the user to get connections count for

**Description:** Get the count of established connections for a specific user (public endpoint)

**Success Response (200):**
```json
{
  "count": 42
}
```

### Error Codes Reference

| Code | Description |
|------|-------------|
| `connection/invalid-receiver-id` | Missing or invalid receiverId |
| `connection/invalid-user-id` | Missing or invalid userId (for status check) |
| `connection/self-request` | Cannot send request to self |
| `connection/self-check` | Cannot check connection status with yourself |
| `connection/user-not-found` | User doesn't exist |
| `connection/already-exists` | Generic connection exists |
| `connection/request-pending` | Request already pending |
| `connection/already-connected` | Users already connected |
| `connection/request-declined` | Previous request declined |
| `connection/invalid-connection-id` | Invalid connection ID |
| `connection/unauthorized` | User not authorized for action |
| `connection/not-found` | Connection not found |
| `connection/unknown-status` | Unknown connection status |
| `connection/server-error` | Internal server error |

### Controller Architecture

Following the project's resource-centric pattern with clear separation:

```
src/v5/controllers/
├── users/connections/                  # User-centric connection operations
│   ├── requestConnection.ts            # Send connection request to user
│   ├── fetchConnectionStatus.ts        # Check connection status with user
│   ├── removeConnectionByUserId.ts     # Decline/withdraw/disconnect with user
│   ├── fetchConnectionsByUserId.ts     # Get connections of specific user
│   └── fetchConnectionsCountByUserId.ts # Get connections count for specific user
└── connections/                        # Connection-centric operations
    ├── acceptConnection.ts             # Accept specific connection
    ├── declineConnection.ts            # Decline specific connection
    ├── removeConnection.ts             # Remove specific connection
    ├── fetchConnections.ts             # List established connections
    ├── fetchConnectionsCount.ts        # Get connections count
    ├── fetchSentPendingConnections.ts  # List sent pending requests
    └── fetchReceivedPendingConnections.ts # List received pending requests
```

### API Reorganization

The connection API follows a **resource-centric pattern** for maximum clarity and flexibility:

**User-centric operations** (user as main resource) under `/users` router:
- Follows: `POST /users/:userId/follow`, `GET /users/:userId/follow`, `DELETE /users/:userId/follow`
- Connections: `POST /users/:userId/connection`, `GET /users/:userId/connection`, `DELETE /users/:userId/connection`

**Connection-centric operations** (connection as main resource) under `/connections` router:
- `GET /connections` - List my connections
- `GET /connections/count` - Get my connections count
- `GET /connections/pending/sent` - List pending requests I sent
- `GET /connections/pending/received` - List pending requests I received
- `PUT /connections/:connectionId/accept` - Accept specific connection
- `PUT /connections/:connectionId/decline` - Decline specific connection
- `DELETE /connections/:connectionId` - Remove specific connection

This provides developers **choice**: use user-centric when thinking about users, connection-centric when managing connection entities directly. Accept/decline operations are only available via connectionId since they operate on specific connection records.

## Business Logic & Workflows

### 1. Connection Request Flow

```
User A → Request Connection → User B
                ↓
          pending status
                ↓
      User B: Accept | Decline
                ↓
         Status Update + Notifications
```

#### Request Validation Rules
- Cannot request connection to self
- Cannot have multiple active requests between same users
- Cannot request if previously blocked
- Cannot request if already connected
- Must be valid users in same project

#### Request Process
1. Validate request (see rules above)
2. Create Connection record with pending status
3. Set createdAt timestamp (automatic)
4. Trigger notification to receiver using `createNotification` helper

### 2. Response Workflows

#### Accept Connection
1. Validate: Only receiver can accept pending requests
2. Update status to accepted
3. Set respondedAt timestamp
4. Create bidirectional relationship
5. Trigger notification to requester only using `createNotification` helper

#### Decline Connection
1. Validate: Only receiver can decline pending requests
2. Update status to "declined"
3. Set respondedAt timestamp
4. Prevent requester from re-requesting (business rule)
5. Allow receiver to delete record and create new request later
6. No notification sent


### 3. Connection Management

#### Withdraw Request
- **Who**: Original requester
- **When**: pending status only
- **Action**: Delete connection record
- **Result**: Allows fresh request later

#### Disconnect
- **Who**: Either connected user
- **When**: accepted status only
- **Action**: Delete connection record
- **Result**: Allows fresh request later

### 4. Query Patterns

#### Get User's Connections
```typescript
// Bidirectional query - user is connected if they are requester OR receiver with accepted status
const connections = await Connection.findAll({
  where: {
    projectId,
    status: 'accepted',
    [Op.or]: [
      { requesterId: userId },
      { receiverId: userId }
    ]
  },
  include: [
    { model: User, as: 'requester' },
    { model: User, as: 'receiver' }
  ]
});
```

#### Get Pending Requests
```typescript
// Received requests
const receivedRequests = await Connection.findAll({
  where: { projectId, receiverId: userId, status: 'pending' },
  order: [['createdAt', 'DESC']]
});

// Sent requests
const sentRequests = await Connection.findAll({
  where: { projectId, requesterId: userId, status: 'pending' },
  order: [['createdAt', 'DESC']]
});
```

## Business Rules & Edge Cases

### 1. Duplicate Prevention
- **Rule**: Only one active Connection record between any two users
- **Implementation**: Unique constraint on (projectId, requesterId, receiverId)
- **Edge Case**: Handle race conditions in request creation

### 2. Re-request Logic
- **After declined**: Only the original receiver can delete the declined record and create a fresh request (role reversal)
- **After WITHDRAW**: Either user can initiate new request (record was deleted)
- **After DISCONNECT**: Either user can initiate new request (record was deleted)
- **Pattern**: Delete previous record and create new one for cleaner data and proper timestamps

### 3. Status Transitions

```
pending → accepted (by receiver)
pending → declined (by receiver)
pending → [DELETED] (by requester - withdraw)
accepted → [DELETED] (by either - disconnect)
declined → [DELETED] (by receiver only - to allow re-request)
```

Invalid transitions:
- declined → accepted (must delete and create new request)
- Cannot change status once responded (except delete for disconnect/re-request)

### 4. Notification Strategy

| Event | Notify Who | Type |
|-------|------------|------|
| Request Sent | Receiver | In-app only |
| Request Accepted | Requester | In-app only |
| Request Declined | No one | None |
| Connection Removed | No one | None |

## Integration Points


### 2. Notification System
Use existing `createNotification` helper and add new interfaces to `IAppNotification.ts`:

#### New Notification Interfaces to Add:
```typescript
// Add to src/interfaces/IAppNotification.ts
export interface ConnectionRequestNotification extends BaseNotificationParams {
  type: "connection-request";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string;
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

export interface ConnectionAcceptedNotification extends BaseNotificationParams {
  type: "connection-accepted";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string; // User who accepted (originally the receiver)
    initiatorName: string | null | undefined;
    initiatorUsername: string | null | undefined;
    initiatorAvatar: string | null | undefined;
  };
}

// Update NotificationParams union type to include:
// | ConnectionRequestNotification
// | ConnectionAcceptedNotification
```

#### Usage in Controllers:
```typescript
// Send connection request notification
import createNotification from "../../../helpers/createNotification";

await createNotification(req, {
  projectId,
  userId: receiverId,
  type: "connection-request",
  action: "open-profile",
  metadata: {
    connectionId: connection.id,
    initiatorId: requesterId,
    initiatorName: requester.name,
    initiatorUsername: requester.username,
    initiatorAvatar: requester.avatar,
  }
});

// Connection accepted notification
await createNotification(req, {
  projectId,
  userId: originalRequesterId,
  type: "connection-accepted",
  action: "open-profile",
  metadata: {
    connectionId: connection.id,
    initiatorId: receiverId,
    initiatorName: receiver.name,
    initiatorUsername: receiver.username,
    initiatorAvatar: receiver.avatar,
  }
});
```

### 3. User Associations
Extend User model with connection helpers:

```typescript
// In User model
async getConnections() {
  // Return all accepted connections for this user
}

async getPendingConnectionRequests() {
  // Return pending requests received by this user
}

async getSentConnectionRequests() {
  // Return pending requests sent by this user
}

async isConnectedTo(otherUserId: string) {
  // Check if connected to specific user
}
```

## Privacy & Security Considerations

### 1. Privacy Controls
- Users should be able to configure who can send them connection requests
- Option to require mutual follows before connection requests
- Ability to block users from sending any requests

### 2. Rate Limiting
- Limit connection requests per user per time period
- Prevent connection request spam

### 3. Data Privacy
- Connection lists may be sensitive - consider privacy settings
- Optional message field should be sanitized
- Consider GDPR implications for connection data

## Performance Considerations

### 1. Database Optimization
- Proper indexing for common query patterns
- Consider denormalization for connection counts
- Efficient bidirectional relationship queries

### 2. Caching Strategy
- Cache user connection lists
- Cache connection counts
- Invalidate cache on status changes

### 3. Scalability
- Consider sharding strategies for large datasets
- Batch operations for bulk connection management

## Migration Strategy

### 1. Database Migration

#### If Connection table doesn't exist (first deployment):
```sql
-- Sequelize will automatically create the table with correct schema
-- No migration needed - just deploy
```

#### If Connection table already exists:
```sql
-- Remove columns if they were previously deployed
ALTER TABLE Connections DROP COLUMN IF EXISTS requestedAt;
ALTER TABLE Connections DROP COLUMN IF EXISTS updatedAt;

-- Ensure correct schema matches implementation:
-- id (UUID, PRIMARY KEY)
-- projectId (UUID, NOT NULL)
-- requesterId (UUID, NOT NULL)
-- receiverId (UUID, NOT NULL)
-- status (ENUM: pending, accepted, declined)
-- message (TEXT, NULLABLE)
-- respondedAt (TIMESTAMP, NULLABLE)
-- createdAt (TIMESTAMP, NOT NULL)
```

#### Required Indexes:
```sql
-- Unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX idx_connection_unique ON Connections (projectId, requesterId, receiverId);

-- Performance indexes
CREATE INDEX idx_connection_requester ON Connections (projectId, requesterId, status);
CREATE INDEX idx_connection_receiver ON Connections (projectId, receiverId, status);
CREATE INDEX idx_connection_status ON Connections (projectId, status);
CREATE INDEX idx_connection_created ON Connections (projectId, createdAt);
```

### 2. Model Registration
Ensure the Connection model is properly registered:
```typescript
// In your model initialization
Connection.initModel(sequelize);
Connection.associate();

// Export from models/index.ts
export { Connection };
```

### 3. Router Registration
Add to your main API router:
```typescript
// In your main router file
import { connectionsRouter } from './v5/routers';
app.use('/v5/connections', connectionsRouter);
```

### 4. API Versioning
- Add new endpoints under existing `/v5/` structure
- Maintain backward compatibility
- Document new endpoints in API documentation

### 5. Feature Rollout
- Implement behind feature flag
- Gradual rollout to projects
- Monitor performance impact

## Client Implementation Notes

### Notification Integration
The system generates notifications for:
- **Connection requests**: Receiver gets `connection-request` notification
- **Connection accepted**: Requester gets `connection-accepted` notification

Notification types to handle in your client:
```typescript
type ConnectionNotifications =
  | "connection-request"
  | "connection-accepted";

// Notification payloads you'll receive
interface ConnectionRequestNotification {
  type: "connection-request";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string;
    initiatorName: string | null;
    initiatorUsername: string | null;
    initiatorAvatar: string | null;
  };
}

interface ConnectionAcceptedNotification {
  type: "connection-accepted";
  action: "open-profile";
  metadata: {
    connectionId: string;
    initiatorId: string; // User who accepted
    initiatorName: string | null;
    initiatorUsername: string | null;
    initiatorAvatar: string | null;
  };
}
```

### State Management Recommendations
```typescript
// Suggested client state structure
interface ConnectionState {
  connections: Connection[];
  pendingReceived: Connection[];  // Connections with status: "pending"
  pendingSent: Connection[];      // Connections with status: "pending"
  loading: boolean;
  pagination: PaginationInfo;
}

// The actual Connection interface matches the API responses
interface Connection {
  id: string;
  connectedUser?: User;    // For established connections
  user?: User;             // For pending requests
  type?: "received" | "sent";  // For pending requests
  message?: string;
  createdAt?: string;      // For pending requests (when request was made)
  requestedAt?: string;    // For established connections (when request was originally made)
  connectedAt?: string;    // For established connections (when connection was accepted)
}
```

### UI/UX Considerations
- Show badge count for pending received requests
- Distinguish between "sent" and "received" requests in UI
- Provide clear feedback for connection actions
- Handle optimistic updates for better UX
- Show connection status in user profiles
- Use connection status endpoint to show appropriate buttons:
  - "Send Connection Request" (status: "none")
  - "Request Sent" with withdraw option (status: "pending", type: "sent")
  - "Accept/Decline" buttons (status: "pending", type: "received")
  - "Connected" with disconnect option (status: "connected")
  - Handle declined state appropriately (status: "declined")

### Error Handling
Handle specific error codes for better user experience:
- `connection/request-declined`: Show message about who can re-initiate
- `connection/already-connected`: Update UI to show connected state
- `connection/request-pending`: Show existing request status

## Future Enhancements

### 1. User Blocking System
- Separate `Block` model for user-level blocking (not connection-specific)
- Apply to both connections and follows
- Prevent blocked users from sending any requests
- Allow users to block others even after connections are established

### 2. Connection Categories
- Different types of connections (friend, colleague, family)
- Category-specific privacy settings
- Filtered connection lists

### 3. Connection Recommendations
- Suggest connections based on mutual connections
- Import contacts for connection suggestions
- AI-powered connection recommendations

### 4. Advanced Features
- Connection request templates/categories
- Bulk connection management
- Connection analytics and insights

## Implementation Checklist

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] Create Connection model with proper schema
- [x] Set up model associations
- [x] Create TypeScript interfaces
- [x] Add connection notification interfaces

### Phase 2: API Development ✅ COMPLETED
- [x] Implement all connection controllers
- [x] Create router with proper middleware
- [x] Add input validation and sanitization
- [x] Implement proper error handling

### Phase 3: Business Logic ✅ COMPLETED
- [x] Implement all status transition logic
- [x] Add duplicate prevention mechanisms
- [x] Create notification triggers
- [x] Add proper error codes and responses

### Phase 4: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Update API documentation
- [ ] Add usage examples

### Phase 5: Performance & Security
- [ ] Implement rate limiting
- [ ] Add caching layers
- [ ] Security audit and testing
- [ ] Performance optimization

## Conclusion

The Connection system provides a robust foundation for bidirectional relationships in Replyke, following industry best practices while maintaining consistency with the existing codebase architecture. The design prioritizes data integrity, user experience, and system performance while providing flexibility for future enhancements.

This system will enable rich social features like mutual friend networks, collaborative features, and enhanced privacy controls, significantly expanding Replyke's social capabilities beyond the current follow-only model.