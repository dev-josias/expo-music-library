export type ChangeEventPayload = {
  /**
   * `false` in 1.3.1 because native implementations do not include item-level
   * changes. Typed as `boolean` for source compatibility with 1.3.0.
   */
  hasIncrementalChanges: boolean;
  /**
   * `true` in 1.3.1. Optional so existing 1.3.0 event mocks remain assignable.
   */
  requiresFullReload?: boolean;
  /**
   * Compatibility alias for `requiresFullReload`.
   */
  requiresReload?: boolean;
};
