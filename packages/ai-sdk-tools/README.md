# @fondation-io/ai-sdk-tools

> **🔱 Fork Notice**
>
> This is a fork of the original [ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools) project, maintained and published under the `@fondation-io` npm scope.

Complete toolkit for building advanced AI applications with the [Vercel AI SDK](https://sdk.vercel.ai/). This package provides everything you need: multi-agent orchestration, state management, caching, artifact streaming, development tools, and persistent memory.

## Installation

```bash
npm install @fondation-io/ai-sdk-tools
```

This installs all tools in a single package with namespaced exports.

### Peer Dependencies

Depending on which features you use, you may need to install:

```bash
npm install ai @ai-sdk/react react react-dom zod zustand
```

## What's Included

This package includes all AI SDK tools:

- **`agents`** - Multi-agent orchestration with handoffs and routing
- **`artifacts`** - Structured artifact streaming for React components  
- **`cache`** - Universal caching for AI tool executions
- **`devtools`** - Development and debugging tools
- **`memory`** - Persistent memory system for AI agents
- **`store`** - Zustand-based state management for AI applications

## Usage

Import tools directly from the package:

```typescript
import { Agent, artifact, cached, useChat, AIDevtools, InMemoryProvider } from '@fondation-io/ai-sdk-tools';
```

### Multi-Agent Orchestration

Build intelligent workflows with specialized agents:

```typescript
import { Agent } from '@fondation-io/ai-sdk-tools';
import { openai } from '@ai-sdk/openai';

const supportAgent = new Agent({
  model: openai('gpt-4'),
  name: 'SupportAgent',
  instructions: 'You handle customer support queries.',
});

const billingAgent = new Agent({
  model: openai('gpt-4'),
  name: 'BillingAgent',
  instructions: 'You handle billing and payment issues.',
  handoff: [supportAgent], // Can hand off back to support
});

// Support agent can route to billing
supportAgent.handoff = [billingAgent];

const result = await supportAgent.generateText({
  prompt: 'I need help with my invoice',
});
```

### State Management

Manage chat state globally with Zustand:

```typescript
import { useChat } from '@fondation-io/ai-sdk-tools';

export const useChatHook = useChat({
  api: '/api/chat',
});

// Access chat state from anywhere
function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChatHook();
  
  return (
    <form onSubmit={handleSubmit}>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

### Tool Caching

Cache expensive tool executions to reduce costs and improve performance:

```typescript
import { cached } from '@fondation-io/ai-sdk-tools';
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = cached(
  tool({
    description: 'Get weather for a location',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      // Expensive API call
      const response = await fetch(`https://api.weather.com/${location}`);
      return response.json();
    },
  }),
  { ttl: 3600 } // Cache for 1 hour
);
```

### Artifact Streaming

Stream structured artifacts from AI tools to React components:

```typescript
import { artifact, useArtifact } from '@fondation-io/ai-sdk-tools';
import { z } from 'zod';

const chartArtifact = artifact({
  id: 'chart',
  description: 'Generate a chart visualization',
  schema: z.object({
    data: z.array(z.number()),
    title: z.string(),
  }),
  execute: async ({ data, title }, writer) => {
    // Stream progressive updates
    await writer.update({ status: 'processing', progress: 50 });
    
    const chartData = processData(data);
    
    return {
      type: 'chart',
      data: chartData,
      title,
    };
  },
});

// In your React component
const { data, status } = useArtifact(chartArtifact);
```

### Development Tools

Debug and monitor your AI applications in real-time:

```typescript
import { AIDevtools } from '@fondation-io/ai-sdk-tools';

function App() {
  return (
    <>
      <YourChatComponent />
      <AIDevtools />
    </>
  );
}
```

### Persistent Memory

Add long-term memory to your agents:

```typescript
import { Agent, InMemoryProvider } from '@fondation-io/ai-sdk-tools';
import { openai } from '@ai-sdk/openai';

const memoryProvider = new InMemoryProvider();

const agent = new Agent({
  model: openai('gpt-4'),
  name: 'AssistantAgent',
  instructions: 'You are a helpful assistant with memory.',
  memory: memoryProvider,
});

// Agent can now remember context across conversations
```

## Individual Packages

If you only need specific tools, you can install them individually:

```bash
npm install @fondation-io/agents
npm install @fondation-io/artifacts
npm install @fondation-io/cache
npm install @fondation-io/devtools
npm install @fondation-io/memory
npm install @fondation-io/store
npm install @fondation-io/debug
```

Each package can be used independently with its own API. See individual package documentation for details.

## Documentation

- [Original Documentation](https://aisdk.tools)
- [Original API Reference](https://aisdk.tools/docs)
- [Original Examples](https://github.com/midday-ai/ai-sdk-tools/tree/main/apps/example)
- [Fork Repository](https://github.com/darksip/ai-sdk-tools)

## Features

✅ **Multi-agent orchestration** - Coordinate multiple specialized agents  
✅ **State management** - Global state for AI applications  
✅ **Universal caching** - Cache any tool execution  
✅ **Artifact streaming** - Structured real-time updates  
✅ **Development tools** - Debug and monitor AI apps  
✅ **Persistent memory** - Long-term agent memory  
✅ **TypeScript first** - Full type safety throughout  
✅ **Provider agnostic** - Works with any AI SDK provider  
✅ **Production ready** - Battle-tested in real applications  

## Requirements

- Node.js 18+
- AI SDK v5.0.0 or higher
- React 18+ (for React-specific features)

## License

MIT

## Links

- **Fork Repository**: [github.com/darksip/ai-sdk-tools](https://github.com/darksip/ai-sdk-tools)
- **Issues**: [github.com/darksip/ai-sdk-tools/issues](https://github.com/darksip/ai-sdk-tools/issues)
- **Upstream Repository**: [github.com/midday-ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools)

## Acknowledgments

This project is a fork of the excellent [AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools) created by the [Midday](https://midday.ai) team. We are grateful for their work and contribution to the open-source community.

All credit for the original implementation goes to the original authors. This fork is maintained independently under the `@fondation-io` scope.

