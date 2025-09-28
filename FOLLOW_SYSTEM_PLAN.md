# Replyke Follow System - Design & Implementation Plan

## Overview

This document outlines the design and implementation of the Follow system in the Replyke social features framework. Follows provide one-way relationship functionality similar to Twitter/X follows, allowing users to subscribe to content from other users without requiring mutual agreement.

## Current State Analysis

### Follow System Architecture

- **Model**: `Follow` (`src/models/Follow.ts`)
- **Type**: One-way relationships (unidirectional)
- **Fields**: `id`, `projectId`, `followerId`, `followedId`, `createdAt`
- **Associations**:
  - User hasMany Follow as "following" (followerId)
  - User hasMany Follow as "followers" (followedId)

### Key Characteristics

- **Immediate Effect**: No approval workflow required
- **One-way**: Following someone doesn't create a mutual relationship
- **Public**: Follow relationships are typically visible to others
- **Content Access**: Following grants access to user's content feed

## Database Schema

### Follow Model

```typescript
// src/models/Follow.ts
interface IFollowAttributes {
  id: string;
  projectId: string;
  followerId: string; // User who initiated the follow
  followedId: string; // User being followed
  createdAt: Date; // When the follow was created
}
```

### Database Constraints

```sql
-- Unique constraint to prevent duplicate follows
UNIQUE INDEX idx_follow_unique ON Follows (projectId, followerId, followedId);

-- Optimized indexes for common queries
INDEX idx_follow_follower ON Follows (projectId, followerId);
INDEX idx_follow_followed ON Follows (projectId, followedId);
INDEX idx_follow_created ON Follows (projectId, createdAt);
```

### User Model Associations

```typescript
// In User.associate()
User.hasMany(Follow, {
  foreignKey: "followerId",
  as: "following",
  onDelete: "CASCADE",
});

User.hasMany(Follow, {
  foreignKey: "followedId",
  as: "followers",
  onDelete: "CASCADE",
});
```

## API Design

### Router Structure

```
src/v5/routers/users.ts      // User-centric follow operations
src/v5/routers/follows.ts    // Follow-centric operations
```

### Endpoints

| Method                                                  | Endpoint                         | Controller                    | Description                                   |
| ------------------------------------------------------- | -------------------------------- | ----------------------------- | --------------------------------------------- |
| **User-centric operations (under `/users` router)**     |
| POST                                                    | `/users/:userId/follow`          | `createFollow`                | Follow a user                                 |
| GET                                                     | `/users/:userId/follow`          | `fetchFollowStatus`           | Get follow status with user                   |
| DELETE                                                  | `/users/:userId/follow`          | `deleteFollowByUserId`        | Unfollow a user                               |
| GET                                                     | `/users/:userId/followers`       | `fetchFollowersByUserId`      | Get followers of specific user                |
| GET                                                     | `/users/:userId/followers-count` | `fetchFollowersCountByUserId` | Get user's followers count                    |
| GET                                                     | `/users/:userId/following`       | `fetchFollowingByUserId`      | Get who specific user follows                 |
| GET                                                     | `/users/:userId/following-count` | `fetchFollowingCountByUserId` | Get user's following count                    |
| **Follow-centric operations (under `/follows` router)** |
| GET                                                     | `/follows/following`             | `fetchFollowing`              | List accounts I follow (logged-in user)       |
| GET                                                     | `/follows/followers`             | `fetchFollowers`              | List accounts that follow me (logged-in user) |
| GET                                                     | `/follows/following-count`       | `fetchFollowingCount`         | Get my following count (logged-in user)       |
| GET                                                     | `/follows/followers-count`       | `fetchFollowersCount`         | Get my followers count (logged-in user)       |
| DELETE                                                  | `/follows/:followId`             | `deleteFollow`                | Unfollow by follow ID                         |

## API Documentation

### Base URLs

Follow endpoints are split across two routers under the `/v5/` namespace:

```
User-centric operations: https://your-api-domain.com/v5/users
Follow-centric operations: https://your-api-domain.com/v5/follows
```

### Authentication

Almost all endpoints require user authentication via the `requireUserAuth` middleware (exceptions: fetchFollowersByUserId, fetchFollowersCountByUserId, fetchFollowingByUserId, fetchFollowingCountByUserId). Include the user's JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Rate Limiting

- Follow/unfollow actions: 75 requests per 5 minutes
- List and count endpoints: 100 requests per 5 minutes

### Content Type

All requests should include:

```
Content-Type: application/json
```

### 1. Follow User

**Endpoint:** `POST /v5/users/:userId/follow`

**Path Parameters:**

- `userId`: ID of the user to follow

**Success Response (201):**

```json
{
  "id": "follow-uuid",
  "followerId": "current-user-id",
  "followedId": "target-user-id",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**

- `400` - Invalid or missing userId
- `400` - Cannot follow yourself
- `404` - User not found
- `409` - Already following this user

### 2. Get Follow Status

**Endpoint:** `GET /v5/users/:userId/follow`

**Path Parameters:**

- `userId`: ID of the user to check follow status with

**Description:** Check if the current user follows the specified user

**Success Responses:**

Following user:

```json
{
  "isFollowing": true,
  "followId": "follow-uuid",
  "followedAt": "2024-01-01T12:00:00.000Z"
}
```

Not following user:

```json
{
  "isFollowing": false
}
```

**Error Responses:**

- `400` - Invalid userId
- `400` - Cannot check follow status with yourself

### 3. Unfollow User

**Endpoint:** `DELETE /v5/users/:userId/follow`

**Path Parameters:**

- `userId`: ID of the user to unfollow

**Success Response (200):**

```json
{
  "message": "User unfollowed successfully."
}
```

**Error Responses:**

- `400` - Invalid userId
- `400` - Cannot unfollow yourself
- `404` - Not currently following this user

### 4. Get User Following Count

**Endpoint:** `GET /v5/users/:userId/following-count`

**Path Parameters:**

- `userId`: ID of the user to get following count for

**Description:** Get the count of accounts a specific user follows (public endpoint)

**Success Response (200):**

```json
{
  "count": 156
}
```

### 5. Get User Followers Count

**Endpoint:** `GET /v5/users/:userId/followers-count`

**Path Parameters:**

- `userId`: ID of the user to get followers count for

**Description:** Get the count of followers for a specific user (public endpoint)

**Success Response (200):**

```json
{
  "count": 342
}
```

### 6. Get User Followers List

**Endpoint:** `GET /v5/users/:userId/followers?page=1&limit=20`

**Path Parameters:**

- `userId`: ID of the user to get followers for

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Description:** Get list of accounts that follow a specific user (public endpoint)

**Success Response (200):**

```json
{
  "followers": [
    {
      "followId": "follow-uuid",
      "user": {
        "id": "user-uuid",
        "name": "Jane Smith",
        "username": "janesmith",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Product Manager",
        "reputation": 200
      },
      "followedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 18,
    "totalCount": 342,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 7. Get User Following List

**Endpoint:** `GET /v5/users/:userId/following?page=1&limit=20`

**Path Parameters:**

- `userId`: ID of the user to get following list for

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Description:** Get list of accounts a specific user follows (public endpoint)

**Success Response (200):**

```json
{
  "following": [
    {
      "followId": "follow-uuid",
      "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Software Engineer",
        "reputation": 150
      },
      "followedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 8,
    "totalCount": 156,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 8. Get My Following Count (Logged-in User)

**Endpoint:** `GET /v5/follows/following-count`

**Description:** Get the count of accounts the current user follows

**Success Response (200):**

```json
{
  "count": 156
}
```

### 9. Get My Followers Count (Logged-in User)

**Endpoint:** `GET /v5/follows/followers-count`

**Description:** Get the count of followers for the current user

**Success Response (200):**

```json
{
  "count": 342
}
```

### 10. Get My Following List (Logged-in User)

**Endpoint:** `GET /v5/follows/following?page=1&limit=20`

**Description:** Get list of accounts the current user follows

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**

```json
{
  "following": [
    {
      "followId": "follow-uuid",
      "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Software Engineer",
        "reputation": 150
      },
      "followedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 8,
    "totalCount": 156,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 11. Get My Followers List (Logged-in User)

**Endpoint:** `GET /v5/follows/followers?page=1&limit=20`

**Description:** Get list of accounts that follow the current user

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Success Response (200):**

```json
{
  "followers": [
    {
      "followId": "follow-uuid",
      "user": {
        "id": "user-uuid",
        "name": "Jane Smith",
        "username": "janesmith",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Product Manager",
        "reputation": 200
      },
      "followedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 18,
    "totalCount": 342,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

### 12. Unfollow by Follow ID

**Endpoint:** `DELETE /v5/follows/:followId`

**Path Parameters:**

- `followId`: ID of the follow relationship to remove

**Description:** Remove a specific follow relationship by its ID

**Success Response (200):**

```json
{
  "message": "Follow removed successfully."
}
```

**Error Responses:**

- `400` - Invalid followId
- `403` - Unauthorized (not your follow relationship)
- `404` - Follow relationship not found

### Error Codes Reference

| Code                       | Description                    |
| -------------------------- | ------------------------------ |
| `follow/invalid-user-id`   | Missing or invalid userId      |
| `follow/self-follow`       | Cannot follow yourself         |
| `follow/user-not-found`    | User doesn't exist             |
| `follow/already-following` | Already following this user    |
| `follow/not-following`     | Not currently following user   |
| `follow/invalid-follow-id` | Invalid follow ID              |
| `follow/unauthorized`      | User not authorized for action |
| `follow/not-found`         | Follow relationship not found  |
| `follow/server-error`      | Internal server error          |

### Controller Architecture

Following the project's resource-centric pattern with clear separation:

```
src/v5/controllers/
├── users/follows/                      # User-centric operations
│   ├── createFollow.ts                 # Follow a user
│   ├── deleteFollowByUserId.ts         # Unfollow a user
│   ├── fetchFollowStatus.ts            # Check follow status with user
│   ├── fetchFollowersByUserId.ts       # Get followers of specific user
│   ├── fetchFollowersCountByUserId.ts  # Get followers count for specific user
│   ├── fetchFollowingByUserId.ts       # Get following of specific user
│   └── fetchFollowingCountByUserId.ts  # Get following count for specific user
└── follows/                            # Follow-centric operations
    ├── fetchFollowing.ts               # List accounts I follow (logged-in user)
    ├── fetchFollowers.ts               # List accounts that follow me (logged-in user)
    ├── fetchFollowersCount.ts          # Get my followers count (logged-in user)
    ├── fetchFollowingCount.ts          # Get my following count (logged-in user)
    └── deleteFollow.ts                 # Unfollow by follow ID
```

### API Reorganization

The follow API follows a **resource-centric pattern** for maximum clarity and flexibility:

**User-centric operations** (user as main resource) under `/users` router:

- `POST /users/:userId/follow` - Follow user
- `GET /users/:userId/follow` - Check follow status with user
- `DELETE /users/:userId/follow` - Unfollow user
- `GET /users/:userId/followers` - Get followers of specific user
- `GET /users/:userId/followers-count` - Get followers count for specific user
- `GET /users/:userId/following` - Get who specific user follows
- `GET /users/:userId/following-count` - Get following count for specific user

**Follow-centric operations** (follow as main resource) under `/follows` router:

- `GET /follows/following` - List accounts I follow (logged-in user)
- `GET /follows/followers` - List accounts that follow me (logged-in user)
- `GET /follows/following-count` - Get my following count (logged-in user)
- `GET /follows/followers-count` - Get my followers count (logged-in user)
- `DELETE /follows/:followId` - Remove specific follow relationship

This provides developers **choice**: use user-centric when thinking about users, follow-centric when managing follow entities directly or getting list views.

## Business Logic & Workflows

### 1. Follow User Flow

```
User A → Follow Request → User B
          ↓
    Immediate Follow
          ↓
    No Notification (configurable)
```

**Process:**

1. Validate target user exists
2. Check not following yourself
3. Check not already following
4. Create follow relationship
5. Return follow details

### 2. Unfollow User Flow

```
User A → Unfollow Request → User B
           ↓
    Remove Follow Record
           ↓
    No Notification
```

**Process:**

1. Find existing follow relationship
2. Verify ownership
3. Delete follow record
4. Return success confirmation

### 3. Data Privacy & Security

**User Data Protection:**

- Exclude sensitive fields from API responses
- Fields excluded: `hash`, `salt`, `email`, `isVerified`, `isActive`, `lastActive`, `secureMetadata`

**Authorization Rules:**

- Users can only manage their own follows
- Follow lists are public (configurable)
- Count endpoints are public

## Implementation Notes

### Performance Considerations

- Implement pagination for all list endpoints
- Use database indexes for optimal query performance
- Consider caching for frequently accessed counts

### Scalability Features

- Efficient bidirectional lookups with proper indexing
- Optimized queries using Sequelize associations
- Rate limiting to prevent abuse

### Future Enhancements

- Private follow relationships
- Follow request notifications
- Mutual follow detection
- Follow recommendations
- Batch follow operations

## Migration Strategy

### For Existing Projects

1. Follow system is already established - no migration needed
2. New list endpoints are additions to existing functionality
3. Existing count endpoints remain unchanged for backward compatibility

### New Implementations

1. Ensure Follow model is properly configured
2. Set up router imports for both user and follow endpoints
3. Configure rate limiting as per requirements
4. Test all endpoints for proper functionality

This document provides comprehensive guidance for implementing and maintaining the Follow system in Replyke applications.
