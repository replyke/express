export interface MetadataFilters {
  includes?: Record<string, unknown>;
  doesNotInclude?: Record<string, unknown>;
  includesAny?: Record<string, unknown>[];
  exists?: string[];
  doesNotExist?: string[];
}
