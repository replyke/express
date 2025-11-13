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

### `sortType` Parameter

Specifies the data type of the metadata property for optimal sorting behavior.

**Values**:
- `auto` - Automatically detect and handle the property type - **DEFAULT**
- `numeric` - Sort as numbers (integers or decimals)
- `text` - Sort alphabetically (case-insensitive)
- `boolean` - Sort by boolean values (false < true)
- `timestamp` - Sort as timestamps (ISO 8601 or Unix timestamps)

**Notes**:
- The `sortType` parameter is optional and defaults to `auto` if not provided
- `auto` mode provides the best user experience but has ~10-20ms overhead per 1000 rows
- Explicit types (`numeric`, `text`, `boolean`, `timestamp`) provide optimal performance with zero overhead
- Use explicit types for performance-critical queries or when you know the data type

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

The sorting feature supports **four data types** with both auto-detection and explicit type specification:

### Supported Types

#### 1. Numeric (`sortType=numeric`)
- **Values**: Integers and floating-point numbers
- **Sorting**: Natural numeric order (e.g., 1, 2, 10, 100)
- **Examples**: `1500`, `4.7`, `-10`, `3.14159`

```json
{
  "memberCount": 1500,
  "rating": 4.7,
  "priority": 10
}
```

#### 2. Text/String (`sortType=text`)
- **Values**: Text strings
- **Sorting**: Alphabetical, case-insensitive (e.g., "Apple", "banana", "Cherry")
- **Examples**: `"Technology"`, `"Finance"`, `"Healthcare"`

```json
{
  "category": "Technology",
  "status": "active",
  "name": "Community Name"
}
```

#### 3. Boolean (`sortType=boolean`)
- **Values**: Boolean values
- **Sorting**: `false` comes before `true`
- **Examples**: `true`, `false`

```json
{
  "isActive": true,
  "isPremium": false,
  "isVerified": true
}
```

#### 4. Timestamp (`sortType=timestamp`)
- **Values**: ISO 8601 timestamps or Unix timestamps
- **Sorting**: Chronological order (oldest to newest by default)
- **Examples**: `"2024-01-01T00:00:00Z"`, `"2024-11-13T12:30:00Z"`

```json
{
  "lastModified": "2024-11-13T12:30:00Z",
  "createdDate": "2024-01-01T00:00:00Z"
}
```

### Auto-Detection Mode (`sortType=auto`)

When `sortType=auto` (the default), the system automatically detects the property type and sorts accordingly:
- Numbers are sorted numerically
- Strings are sorted alphabetically (case-insensitive)
- Booleans are sorted as false < true

**Example with mixed data**:
```http
# Auto-detects that memberCount is numeric and sorts numerically
GET /v6/entities?sortBy=metadata.memberCount

# Auto-detects that category is text and sorts alphabetically
GET /v6/entities?sortBy=metadata.category
```

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
  sortType?: 'auto' | 'numeric' | 'text' | 'boolean' | 'timestamp';
  // ... other existing parameters
}

// Usage examples

// Auto-detection (default) - simplest approach
const entities1 = await replyke.entities.fetchMany({
  sortBy: 'metadata.memberCount',
  sortDir: 'desc',
  limit: 20
});

// Explicit type for better performance
const entities2 = await replyke.entities.fetchMany({
  sortBy: 'metadata.category',
  sortType: 'text',
  sortDir: 'asc',
  limit: 20
});

// Boolean sorting
const entities3 = await replyke.entities.fetchMany({
  sortBy: 'metadata.isActive',
  sortType: 'boolean',
  sortDir: 'desc',
  limit: 20
});

// Timestamp sorting
const entities4 = await replyke.entities.fetchMany({
  sortBy: 'metadata.lastModified',
  sortType: 'timestamp',
  sortDir: 'desc',
  limit: 20
});
```

### Python SDK

```python
def fetch_entities(
    sort_by: str = "hot",
    sort_dir: str = "desc",
    sort_type: str = "auto",
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
        sort_type: Data type for metadata sorting.
                   Can be 'auto', 'numeric', 'text', 'boolean', 'timestamp'.
                   Default: 'auto'
    """
    pass

# Usage examples

# Auto-detection (default)
entities1 = client.entities.fetch_many(
    sort_by="metadata.memberCount",
    sort_dir="desc",
    limit=20
)

# Explicit text sorting
entities2 = client.entities.fetch_many(
    sort_by="metadata.category",
    sort_type="text",
    sort_dir="asc",
    limit=20
)

# Boolean sorting
entities3 = client.entities.fetch_many(
    sort_by="metadata.isActive",
    sort_type="boolean",
    sort_dir="desc",
    limit=20
)
```

### REST API Examples

#### Example 1: Sort by member count (auto-detection)

```http
GET /v6/entities?sortBy=metadata.memberCount&sortDir=desc&limit=20
```

**Response**: Auto-detects that `memberCount` is numeric and sorts numerically, highest first. Entities without `memberCount` appear at the end.

#### Example 2: Sort by category (explicit text)

```http
GET /v6/entities?sortBy=metadata.category&sortType=text&sortDir=asc&limit=10
```

**Response**: Sorts alphabetically by category, case-insensitive (A-Z).

#### Example 3: Sort by active status (boolean)

```http
GET /v6/entities?sortBy=metadata.isActive&sortType=boolean&sortDir=desc&limit=20
```

**Response**: Active entities (`isActive=true`) appear first, then inactive (`isActive=false`), then entities without the property.

#### Example 4: Sort by last modified date (timestamp)

```http
GET /v6/entities?sortBy=metadata.lastModified&sortType=timestamp&sortDir=desc&limit=20
```

**Response**: Sorts by timestamp, most recently modified first.

#### Example 5: Sort by rating with pagination

```http
GET /v6/entities?sortBy=metadata.rating&sortDir=desc&page=2&limit=50
```

**Response**: Returns page 2 of entities sorted by rating (auto-detected as numeric, highest to lowest).

#### Example 6: Combine with existing filters

```http
GET /v6/entities?sortBy=metadata.memberCount&sortType=numeric&sortDir=desc&sourceId=main-feed&timeFrame=week
```

**Response**: Returns entities from the past week in the "main-feed" source, sorted by member count with explicit numeric type for optimal performance.

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

### Invalid Sort Type

**Request**:
```http
GET /v6/entities?sortBy=metadata.memberCount&sortType=string
```

**Response** (500):
```json
{
  "error": "Internal server error.",
  "code": "entity/server-error",
  "details": "Invalid sortType: 'string'. Must be one of: auto, numeric, text, boolean, timestamp"
}
```

**SDK Implementation**:
```typescript
type SortType = 'auto' | 'numeric' | 'text' | 'boolean' | 'timestamp';

function isValidSortType(type: string): type is SortType {
  return ['auto', 'numeric', 'text', 'boolean', 'timestamp'].includes(type);
}
```

### Type Mismatch (Explicit Type)

**Request**:
```http
GET /v6/entities?sortBy=metadata.category&sortType=numeric
```

If `category` contains text values (e.g., `"Technology"`) but you specify `sortType=numeric`, PostgreSQL will throw a casting error.

**Response** (500):
```json
{
  "error": "Internal server error.",
  "code": "entity/server-error",
  "details": "invalid input syntax for type numeric: \"Technology\""
}
```

**Solution**: Use `sortType=text` or `sortType=auto` instead.

**SDK Guidance**:
- When using explicit types, ensure the metadata property matches the specified type
- Use `sortType=auto` for mixed or unknown data types
- Document type requirements for metadata properties

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

3. **Sort type**:
   ```typescript
   const validTypes = ['auto', 'numeric', 'text', 'boolean', 'timestamp'];
   if (sortType && !validTypes.includes(sortType.toLowerCase())) {
     throw new Error('sortType must be one of: auto, numeric, text, boolean, timestamp');
   }
   ```

### Optional Enhancements

1. **Type hints for metadata sorting**:
   ```typescript
   interface MetadataSortOptions {
     property: string;
     type?: 'auto' | 'numeric' | 'text' | 'boolean' | 'timestamp';
     direction?: 'asc' | 'desc';
   }

   // Usage
   const entities = await client.entities.fetchMany({
     sortByMetadata: {
       property: 'memberCount',
       type: 'numeric',
       direction: 'desc'
     }
   });
   ```

2. **Helper methods**:
   ```typescript
   class EntitiesAPI {
     sortByMetadata(
       propertyName: string,
       options?: {
         type?: 'auto' | 'numeric' | 'text' | 'boolean' | 'timestamp',
         direction?: 'asc' | 'desc'
       }
     ) {
       return this.fetchMany({
         sortBy: `metadata.${propertyName}`,
         sortType: options?.type || 'auto',
         sortDir: options?.direction || 'desc'
       });
     }
   }

   // Usage examples
   const entities1 = await client.entities.sortByMetadata('memberCount');
   const entities2 = await client.entities.sortByMetadata('category', { type: 'text', direction: 'asc' });
   const entities3 = await client.entities.sortByMetadata('isActive', { type: 'boolean' });
   ```

## Testing Recommendations

### Test Cases for SDK

1. **Basic metadata sorting (all types)**:
   - Sort by numeric property (ascending/descending)
   - Sort by text property (ascending/descending, case-insensitive)
   - Sort by boolean property (ascending/descending)
   - Sort by timestamp property (ascending/descending)

2. **Auto-detection tests**:
   - Auto-detect numeric and sort correctly
   - Auto-detect text and sort alphabetically
   - Auto-detect boolean and sort correctly
   - Verify auto-detection handles mixed entity types

3. **Explicit type tests**:
   - Explicit numeric type with numeric data
   - Explicit text type with text data
   - Explicit boolean type with boolean data
   - Explicit timestamp type with timestamp data
   - Type mismatch errors (e.g., numeric type with text data)

4. **Edge cases**:
   - Entities without the specified property (verify they appear at end)
   - Mixed positive/negative numbers
   - Decimal values
   - Case-insensitive text sorting (e.g., "Apple", "banana", "Cherry")
   - Boolean sorting (false < true)

5. **Error cases**:
   - Invalid property name characters
   - Invalid sortType value
   - Type mismatch with explicit type
   - Non-existent property (should work, entities without it go to end)

6. **Combination tests**:
   - Metadata sorting + pagination
   - Metadata sorting + filters (sourceId, userId, etc.)
   - Metadata sorting + timeFrame
   - Different types with same query parameters

### Example Test (JavaScript/TypeScript)

```typescript
describe('Metadata Sorting', () => {
  test('should sort entities by numeric metadata (auto-detect)', async () => {
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

  test('should sort entities by text metadata', async () => {
    const entities = await client.entities.fetchMany({
      sortBy: 'metadata.category',
      sortType: 'text',
      sortDir: 'asc',
      limit: 10
    });

    // Verify alphabetical ordering (case-insensitive)
    for (let i = 0; i < entities.length - 1; i++) {
      const current = (entities[i].metadata.category || '').toLowerCase();
      const next = (entities[i + 1].metadata.category || '').toLowerCase();
      expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
    }
  });

  test('should sort entities by boolean metadata', async () => {
    const entities = await client.entities.fetchMany({
      sortBy: 'metadata.isActive',
      sortType: 'boolean',
      sortDir: 'desc',
      limit: 10
    });

    // Verify true comes before false when descending
    const activeEntities = entities.filter(e => e.metadata.isActive === true);
    const inactiveEntities = entities.filter(e => e.metadata.isActive === false);

    // Active entities should come first
    expect(entities.slice(0, activeEntities.length))
      .toEqual(expect.arrayContaining(activeEntities));
  });

  test('should sort entities by timestamp metadata', async () => {
    const entities = await client.entities.fetchMany({
      sortBy: 'metadata.lastModified',
      sortType: 'timestamp',
      sortDir: 'desc',
      limit: 10
    });

    // Verify chronological ordering
    for (let i = 0; i < entities.length - 1; i++) {
      const current = new Date(entities[i].metadata.lastModified || 0).getTime();
      const next = new Date(entities[i + 1].metadata.lastModified || 0).getTime();
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

  test('should throw error for invalid sortType', async () => {
    await expect(
      client.entities.fetchMany({
        sortBy: 'metadata.memberCount',
        sortType: 'invalid',
        limit: 10
      })
    ).rejects.toThrow('Invalid sortType');
  });
});
```

## Backward Compatibility

- **No breaking changes**: Existing sort options (`hot`, `top`, `controversial`) continue to work exactly as before
- **Optional parameters**: `sortBy`, `sortDir`, and `sortType` are all optional
- **Default behavior**:
  - `sortBy` defaults to `hot`
  - `sortDir` defaults to `desc`
  - `sortType` defaults to `auto` (auto-detection)
- **Performance**: Queries without `sortBy=metadata.*` are unaffected; auto-detection has minimal overhead (~10-20ms per 1000 rows)

## Future Enhancements (Possible)

The following features may be considered in future versions:

1. **Nested property access**:
   - Support for `metadata.nested.property.path`
   - Example: `sortBy=metadata.settings.theme.color`

2. **Multiple sort criteria**:
   - Sort by multiple properties with priority order
   - Example: `sortBy=metadata.priority,metadata.createdDate`

3. **Additional data types**:
   - JSON/JSONB sorting
   - Array sorting
   - Custom sort functions

## Questions or Issues?

If you encounter any issues implementing this feature in your SDK or have questions about edge cases, please reach out to the Replyke core team.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Related Files**: `src/v6/controllers/entities/fetchManyEntities.ts`
