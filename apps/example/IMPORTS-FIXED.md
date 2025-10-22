# Import Corrections Applied

## Problem
The example app was importing from `"ai-sdk-tools/client"` which doesn't exist in this fork.

## Solution
All imports have been updated to use the correct `@fondation-io` scope:

```diff
- } from "ai-sdk-tools/client";
+ } from "@fondation-io/ai-sdk-tools/client";
```

## Files Updated
- `src/app/page.tsx`
- `src/components/canvas/artifact-canvas.tsx`
- `src/components/canvas/balance-sheet-canvas.tsx`
- `src/components/canvas/revenue-canvas.tsx`
- `src/components/chat/chat-title.tsx`
- `src/components/chat/rate-limit-indicator.tsx`
- `src/components/chat/suggested-prompts.tsx`
- `src/components/chat/suggestion-pills.tsx`
- `src/components/header.tsx`
- `src/components/providers.tsx`
- `src/hooks/use-chat-status.ts`

## Server-side Imports
Server-side imports in `src/ai/` were already correct:
- ✅ `@fondation-io/agents`
- ✅ `@fondation-io/ai-sdk-tools`
- ✅ `@fondation-io/artifacts`

## Package Dependencies
`package.json` was already correct:
```json
"@fondation-io/ai-sdk-tools": "workspace:*"
```

The app should now work correctly with the fork's packages.
