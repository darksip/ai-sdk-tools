# @fondation-io/debug

> **🔱 Fork Notice**: This is part of the [@fondation-io/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools) fork.

Shared debug utilities for AI SDK Tools packages using Pino.

## Installation

```bash
npm install @fondation-io/debug
```

## Usage

```typescript
import { createLogger } from '@fondation-io/debug';

const logger = createLogger('AGENT');

// Log at different levels
logger.debug("Starting stream", { name: "reports" });
logger.info("Handoff detected", { targetAgent: "operations" });
logger.warn("No text accumulated during streaming");
logger.error("Failed to load", { error });
```

## Environment Variables

- `DEBUG_AGENTS=true` - Enable debug logging with colorized output
- No `DEBUG_AGENTS` or `DEBUG_AGENTS=false` - Silent mode (no logging)

## Features

- **Zero dependencies**: Lightweight with no external dependencies
- **Zero overhead when disabled**: Logging is completely disabled when `DEBUG_AGENTS` is not set
- **Colorized output**: Beautiful ANSI colored logs in the terminal
- **Category-based logging**: Each logger is scoped to a category (e.g., 'AGENT', 'MEMORY')
- **Works everywhere**: Compatible with Next.js, Node.js, browser, and edge runtimes
- **Simple & fast**: Direct console output with no worker threads or complex transports

## API

### `createLogger(category: string)`

Creates a category-scoped logger.

```typescript
const logger = createLogger('MY_CATEGORY');

logger.debug(message: string, data?: any);
logger.info(message: string, data?: any);
logger.warn(message: string, data?: any);
logger.error(message: string, data?: any);
```

## License

MIT


## Acknowledgments

This package is part of the [@fondation-io/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools) fork of the original [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) created by the [Midday](https://midday.ai) team.

All credit for the original implementation goes to the original authors.
