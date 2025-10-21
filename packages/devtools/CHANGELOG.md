# @ai-sdk-tools/devtools

## 1.0.0

### Major Changes

- Initial release of @fondation-io fork from ai-sdk-tools

  This is the first release of the @fondation-io scoped packages, forked from midday-ai/ai-sdk-tools.

  All packages have been renamed from @ai-sdk-tools/_ to @fondation-io/_ and are now published under the fondation-io organization.

  Features:

  - Multi-agent orchestration with handoffs and routing
  - Structured artifact streaming for React components
  - Universal caching for AI tool executions
  - Development and debugging tools
  - Persistent memory system for AI agents
  - Zustand-based state management for AI applications

### Patch Changes

- Updated dependencies
  - @fondation-io/store@1.0.0

## 0.7.0

### Minor Changes

- 8ac3dcc: Major performance update: Unified high-performance implementation

  **Store Package:**

  - Unified experimental implementation as the main and only solution
  - 2-4x faster performance with all hooks
  - O(1) message lookups with hash map indexing
  - Batched updates with priority scheduling
  - Deep equality checks prevent unnecessary re-renders
  - Advanced throttling with scheduler.postTask
  - Memoized selectors with automatic caching
  - SSR compatible with Next.js App Router
  - Solves server messages re-render issues

  **Artifacts Package:**

  - Updated to work seamlessly with unified store
  - No more compatibility layers needed
  - Improved performance through optimized store integration

  **Devtools Package:**

  - Fixed SSR compatibility issues
  - Added proper "use client" directive
  - Works correctly with unified store implementation

  **Breaking Changes:**

  - Requires wrapping app with `<Provider>` component
  - No more `storeId` parameter needed (uses React Context)
  - Some legacy exports removed (migration guide available)

## 0.7.0-beta.0

### Minor Changes

- Major performance update: Unified high-performance implementation

  **Store Package:**

  - Unified experimental implementation as the main and only solution
  - 2-4x faster performance with all hooks
  - O(1) message lookups with hash map indexing
  - Batched updates with priority scheduling
  - Deep equality checks prevent unnecessary re-renders
  - Advanced throttling with scheduler.postTask
  - Memoized selectors with automatic caching
  - SSR compatible with Next.js App Router
  - Solves server messages re-render issues

  **Artifacts Package:**

  - Updated to work seamlessly with unified store
  - No more compatibility layers needed
  - Improved performance through optimized store integration

  **Devtools Package:**

  - Fixed SSR compatibility issues
  - Added proper "use client" directive
  - Works correctly with unified store implementation

  **Breaking Changes:**

  - Requires wrapping app with `<Provider>` component
  - No more `storeId` parameter needed (uses React Context)
  - Some legacy exports removed (migration guide available)

## 0.6.1

### Patch Changes

- Beta release with improved workspace dependency management and beta release support
- Stable release with improved workspace dependency management and automated publishing workflow

## 0.6.1-beta.0

### Patch Changes

- Beta release with improved workspace dependency management and beta release support
