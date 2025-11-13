# Metadata Sorting Feature - SDK Implementation Guide

## Overview

The `fetchManyEntities` endpoint now supports sorting by properties stored inside the `metadata` JSONB field. This allows applications to sort entities by custom properties that are specific to their use case.

## Feature Summary

- **Endpoint**: `GET /v6/entities`
- **New Parameters**:
  - `sortBy`: Accepts `metadata.<propertyName>` pattern
  - `sortDir`: Specifies sort direction (`asc` or `desc`)

## API Parameters

### `sortBy` Parameter

The `sortBy` parameter now accepts metadata property paths in addition to the existing sort options.

**Existing sort options** (still supported):
- `hot` - Sort by score (default)
- `top` - Sort by net votes (upvotes - downvotes)
- `controversial` - Sort by vote controversy algorithm
- Default behavior - Sort by `createdAt DESC`

**New metadata sorting format**:
- `metadata.<propertyName>` - Sort by a property inside the metadata object

**Examples**:
- `sortBy=metadata.memberCount`
- `sortBy=metadata.rating`
- `sortBy=metadata.priority`
- `sortBy=metadata.viewCount`

### `sortDir` Parameter

Controls the sort direction when using metadata sorting.

**Values**:
- `desc` - Descending order (highest to lowest) - **DEFAULT**
- `asc` - Ascending order (lowest to highest)

**Note**: The `sortDir` parameter is optional and defaults to `desc` if not provided.

## Property Name Requirements

Metadata property names must follow these rules:
- **Allowed characters**: Letters (a-z, A-Z), numbers (0-9), and underscores (_)
- **Regex pattern**: `/^[a-zA-Z0-9_]+$/`
- **Invalid characters**: Spaces, hyphens, dots, special characters

**Valid examples**:
- ✅ `memberCount`
- ✅ `rating_average`
- ✅ `priority2024`

**Invalid examples**:
- ❌ `member-count` (contains hyphen)
- ❌ `member count` (contains space)
- ❌ `member.count` (contains dot)

## Data Type Support

**Current Implementation**:
- Metadata values are cast to `::numeric` (PostgreSQL numeric type)
- Supports integers and floating-point numbers

**Supported value examples**:
```json
{
  "memberCount": 1500,
  "rating": 4.7,
  "priority": 10
}
```

**Unsupported** (will cause SQL errors):
```json
{
  "category": "Technology",  // Text values not supported
  "isActive": true,          // Boolean values not supported
  "createdDate": "2024-01-01" // Date strings not supported
}
```

> **Note**: Future versions may support additional data types. For now, only numeric values are supported.

## NULL Handling

Entities that **do not have** the specified metadata property will:
- Always sort to the **end of the results**
- Appear after all entities that have the property
- This behavior uses PostgreSQL's `NULLS LAST` directive

**Example**:
If sorting by `metadata.memberCount DESC`:
1. Entity with `memberCount: 5000` (first)
2. Entity with `memberCount: 1000`
3. Entity with `memberCount: 50`
4. Entity without `memberCount` property (last)
5. Entity without `memberCount` property (last)

## SDK Implementation Examples

### JavaScript/TypeScript SDK

```typescript
interface FetchEntitiesOptions {
  page?: number;
  limit?: number;
  sortBy?: string | 'hot' | 'top' | 'controversial' | `metadata.${string}`;
  sortDir?: 'asc' | 'desc';
  // ... other existing parameters
}

// Usage example
const entities = await replyke.entities.fetchMany({
  sortBy: 'metadata.memberCount',
  sortDir: 'desc',
  limit: 20
});
```

### Python SDK

```python
def fetch_entities(
    sort_by: str = "hot",
    sort_dir: str = "desc",
    page: int = 1,
    limit: int = 10,
    **kwargs
) -> List[Entity]:
    """
    Fetch entities with optional metadata sorting.

    Args:
        sort_by: Sort criteria. Can be 'hot', 'top', 'controversial',
                 or 'metadata.<property_name>'
        sort_dir: Sort direction ('asc' or 'desc'). Default: 'desc'
    """
    pass

# Usage example
entities = client.entities.fetch_many(
    sort_by="metadata.memberCount",
    sort_dir="desc",
    limit=20
)
```

### REST API Examples

#### Example 1: Sort WhatsApp communities by member count (descending)

```http
GET /v6/entities?sortBy=metadata.memberCount&sortDir=desc&limit=20
```

**Response**: Returns entities sorted by member count, highest first. Entities without `memberCount` appear at the end.

#### Example 2: Sort items by priority (ascending)

```http
GET /v6/entities?sortBy=metadata.priority&sortDir=asc&limit=10
```

**Response**: Returns entities sorted by priority, lowest first.

#### Example 3: Sort by rating with pagination

```http
GET /v6/entities?sortBy=metadata.rating&sortDir=desc&page=2&limit=50
```

**Response**: Returns page 2 of entities sorted by rating (highest to lowest).

#### Example 4: Combine with existing filters

```http
GET /v6/entities?sortBy=metadata.memberCount&sortDir=desc&sourceId=main-feed&timeFrame=week
```

**Response**: Returns entities from the past week in the "main-feed" source, sorted by member count.

## Error Handling

### Invalid Property Name

**Request**:
```http
GET /v6/entities?sortBy=metadata.member-count
```

**Response** (500):
```json
{
  "error": "Internal server error.",
  "code": "entity/server-error",
  "details": "Invalid metadata property name: 'member-count'. Only alphanumeric characters and underscores are allowed."
}
```

**SDK Implementation**:
SDKs should optionally validate property names client-side before making the request:
```typescript
function isValidMetadataPropertyName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}
```

### Non-Numeric Value

**Request**:
```http
GET /v6/entities?sortBy=metadata.category
```

If `category` contains non-numeric values (e.g., `"Technology"`), PostgreSQL will throw a casting error.

**Response** (500):
```json
{
  "error": "Internal server error.",
  "code": "entity/server-error",
  "details": "invalid input syntax for type numeric: \"Technology\""
}
```

**SDK Guidance**:
- Document that only numeric metadata properties can be used for sorting
- Consider adding client-side warnings or validation

## SDK Validation Recommendations

### Required Validations

1. **Property name format** (optional but recommended):
   ```typescript
   if (sortBy.startsWith('metadata.')) {
     const propertyName = sortBy.substring(9);
     if (!/^[a-zA-Z0-9_]+$/.test(propertyName)) {
       throw new Error('Invalid metadata property name');
     }
   }
   ```

2. **Sort direction**:
   ```typescript
   if (sortDir && !['asc', 'desc'].includes(sortDir.toLowerCase())) {
     throw new Error('sortDir must be "asc" or "desc"');
   }
   ```

### Optional Enhancements

1. **Type hints for metadata sorting**:
   ```typescript
   interface MetadataSortOptions {
     property: string;
     direction?: 'asc' | 'desc';
   }

   // Usage
   const entities = await client.entities.fetchMany({
     sortByMetadata: {
       property: 'memberCount',
       direction: 'desc'
     }
   });
   ```

2. **Helper methods**:
   ```typescript
   class EntitiesAPI {
     sortByMetadata(propertyName: string, direction: 'asc' | 'desc' = 'desc') {
       return this.fetchMany({
         sortBy: `metadata.${propertyName}`,
         sortDir: direction
       });
     }
   }

   // Usage
   const entities = await client.entities.sortByMetadata('memberCount', 'desc');
   ```

## Testing Recommendations

### Test Cases for SDK

1. **Basic metadata sorting**:
   - Sort by numeric property (ascending)
   - Sort by numeric property (descending)

2. **Edge cases**:
   - Sort with entities that don't have the property (verify they appear at end)
   - Sort with mixed positive/negative numbers
   - Sort with decimal values

3. **Error cases**:
   - Invalid property name characters
   - Non-existent property (should work, entities without it go to end)
   - Non-numeric property values (should return error)

4. **Combination tests**:
   - Metadata sorting + pagination
   - Metadata sorting + filters (sourceId, userId, etc.)
   - Metadata sorting + timeFrame

### Example Test (JavaScript/TypeScript)

```typescript
describe('Metadata Sorting', () => {
  test('should sort entities by metadata.memberCount descending', async () => {
    const entities = await client.entities.fetchMany({
      sortBy: 'metadata.memberCount',
      sortDir: 'desc',
      limit: 10
    });

    // Verify ordering
    for (let i = 0; i < entities.length - 1; i++) {
      const current = entities[i].metadata.memberCount || 0;
      const next = entities[i + 1].metadata.memberCount || 0;
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test('should handle entities without metadata property', async () => {
    const entities = await client.entities.fetchMany({
      sortBy: 'metadata.rating',
      sortDir: 'desc',
      limit: 100
    });

    // Entities with rating should come before those without
    const withRating = entities.filter(e => e.metadata.rating !== undefined);
    const withoutRating = entities.filter(e => e.metadata.rating === undefined);

    expect(entities.slice(0, withRating.length)).toEqual(withRating);
    expect(entities.slice(withRating.length)).toEqual(withoutRating);
  });
});
```

## Backward Compatibility

- **No breaking changes**: Existing sort options (`hot`, `top`, `controversial`) continue to work exactly as before
- **Optional parameters**: Both `sortBy` and `sortDir` are optional
- **Default behavior**: If not specified, defaults to `sortBy=hot` and `sortDir=desc`

## Future Enhancements (Planned)

The following features may be added in future versions:

1. **Multiple data type support**:
   - Text/string sorting (`::text`)
   - Boolean sorting (`::boolean`)
   - Timestamp sorting (`::timestamp`)
   - Type auto-detection or explicit type parameter

2. **Nested property access**:
   - Support for `metadata.nested.property.path`

3. **Multiple sort criteria**:
   - Sort by multiple properties with priority order

## Questions or Issues?

If you encounter any issues implementing this feature in your SDK or have questions about edge cases, please reach out to the Replyke core team.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Related Files**: `src/v6/controllers/entities/fetchManyEntities.ts`
