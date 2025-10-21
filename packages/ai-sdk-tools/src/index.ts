/**
 * ai-sdk-tools - Complete toolkit for building AI applications
 *
 * This package provides direct access to all AI SDK tools:
 * - agents: Multi-agent orchestration with handoffs and routing
 * - artifacts: Structured artifact streaming for React components
 * - cache: Universal caching for AI tool executions
 * - devtools: Development and debugging tools
 * - memory: Persistent memory system for AI agents
 * - store: Zustand-based state management for AI applications
 *
 * @example
 * ```typescript
 * import { Agent, artifact, cached, useChat, AIDevtools } from 'ai-sdk-tools';
 *
 * // Create an agent
 * const myAgent = new Agent({ ... });
 *
 * // Create an artifact
 * const myArtifact = artifact({ ... });
 *
 * // Cache a tool
 * const cachedTool = cached(tool, { ttl: 3600 });
 * ```
 */

// Re-export everything from all packages
export * from "@fondation-io/agents";
export * from "@fondation-io/artifacts";
export * from "@fondation-io/cache";
export * from "@fondation-io/devtools";
export * from "@fondation-io/memory";
export * from "@fondation-io/store";
