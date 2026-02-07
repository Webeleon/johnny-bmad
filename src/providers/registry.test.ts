import { describe, test, expect } from 'bun:test';
import { registry } from './registry.js';

describe('Provider Registry', () => {
  test('should have all built-in providers registered', () => {
    const providers = registry.getAllProviders();
    const providerIds = providers.map(p => p.id);

    expect(providerIds).toContain('claude');
    expect(providerIds).toContain('codex');
    expect(providerIds).toContain('kimi');
    expect(providerIds).toContain('glm');
    expect(providerIds).toContain('openai');
    expect(providers.length).toBeGreaterThanOrEqual(5);
  });

  test('should get provider by ID', () => {
    const claudeProvider = registry.getProvider('claude');
    expect(claudeProvider).toBeDefined();
    expect(claudeProvider?.id).toBe('claude');
    expect(claudeProvider?.name).toContain('Claude');

    const unknownProvider = registry.getProvider('unknown-provider');
    expect(unknownProvider).toBeUndefined();
  });

  test('should return all providers', () => {
    const providers = registry.getAllProviders();

    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  test('should register a custom provider', () => {
    const initialCount = registry.getAllProviders().length;

    registry.register({
      id: 'test-provider',
      name: 'Test Provider',
      type: 'api',
      checkAvailable: async () => true,
      listModels: async () => [],
      invoke: async () => ({ durationMs: 0, output: '' }),
      needsApiKey: () => true,
      supportsTools: () => true
    });

    const providers = registry.getAllProviders();
    expect(providers.length).toBe(initialCount + 1);
    expect(providers.some(p => p.id === 'test-provider')).toBe(true);
  });
});
