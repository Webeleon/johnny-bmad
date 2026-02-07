import { describe, test, expect } from 'bun:test';
import { setApiKey, loadProviderConfig, getApiKey } from './providers/config.js';
import type { Model } from './types.js';

describe('Onboarding', () => {
  test('should handle API key configuration', async () => {
    const testApiKey = 'test-api-key-12345';
    const providerId = 'openai-test';

    await setApiKey(providerId, testApiKey);

    const config = await loadProviderConfig();
    const apiKey = getApiKey(config, providerId);

    expect(apiKey).toBe(testApiKey);
  });

  test('should return undefined for non-existent API key', async () => {
    const config = await loadProviderConfig();
    const apiKey = getApiKey(config, 'non-existent-provider');

    expect(apiKey).toBeUndefined();
  });
});

describe('Onboarding - Utility Functions', () => {
  test('should validate correct model ID', async () => {
    const { validateModelId } = await import('./onboarding.js');
    const models: Model[] = [
      { id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli' },
      { id: 'sonnet', name: 'Claude Sonnet', providerId: 'claude', providerType: 'cli' },
      { id: 'gpt-4', name: 'GPT-4', providerId: 'openai', providerType: 'api' }
    ];

    expect(validateModelId('claude:opus', models)).toBe(true);
    expect(validateModelId('openai:gpt-4', models)).toBe(true);
  });

  test('should reject invalid model ID', async () => {
    const { validateModelId } = await import('./onboarding.js');
    const models: Model[] = [
      { id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli' }
    ];

    expect(validateModelId('claude:nonexistent', models)).toBe(false);
    expect(validateModelId('unknown:model', models)).toBe(false);
    expect(validateModelId('opus', models)).toBe(false);
  });

  test('should group models by provider', async () => {
    const { groupModelsByProvider } = await import('./onboarding.js');
    const models: Model[] = [
      { id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli' },
      { id: 'sonnet', name: 'Claude Sonnet', providerId: 'claude', providerType: 'cli' },
      { id: 'gpt-4', name: 'GPT-4', providerId: 'openai', providerType: 'api' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', providerId: 'openai', providerType: 'api' }
    ];

    const grouped = groupModelsByProvider(models);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped.claude).toHaveLength(2);
    expect(grouped.openai).toHaveLength(2);
    expect(grouped.claude?.map((m: Model) => m.id)).toEqual(['opus', 'sonnet']);
    expect(grouped.openai?.map((m: Model) => m.id)).toEqual(['gpt-4', 'gpt-3.5-turbo']);
  });

  test('should handle empty models list when grouping', async () => {
    const { groupModelsByProvider } = await import('./onboarding.js');
    const models: Model[] = [];

    const grouped = groupModelsByProvider(models);

    expect(Object.keys(grouped)).toHaveLength(0);
  });

  test('should format model choice with recommendation', async () => {
    const { formatModelChoice } = await import('./onboarding.js');
    const model: Model = {
      id: 'opus',
      name: 'Claude Opus',
      providerId: 'claude',
      providerType: 'cli'
    };

    const formatted = formatModelChoice(model, true);

    expect(formatted).toContain('[✓ Recommended]');
    expect(formatted).toContain('claude:opus');
    expect(formatted).toContain('Claude Opus');
  });

  test('should format model choice without recommendation', async () => {
    const { formatModelChoice } = await import('./onboarding.js');
    const model: Model = {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      providerId: 'openai',
      providerType: 'api'
    };

    const formatted = formatModelChoice(model, false);

    expect(formatted).not.toContain('[✓ Recommended]');
    expect(formatted).toContain('openai:gpt-3.5-turbo');
    expect(formatted).toContain('GPT-3.5 Turbo');
  });

  test('should validate model ID with multiple providers', async () => {
    const { validateModelId } = await import('./onboarding.js');
    const models: Model[] = [
      { id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli' },
      { id: 'sonnet', name: 'Claude Sonnet', providerId: 'claude', providerType: 'cli' },
      { id: 'glm-4', name: 'GLM-4', providerId: 'glm', providerType: 'api' },
      { id: 'gpt-4', name: 'GPT-4', providerId: 'openai', providerType: 'api' }
    ];

    expect(validateModelId('claude:opus', models)).toBe(true);
    expect(validateModelId('claude:sonnet', models)).toBe(true);
    expect(validateModelId('glm:glm-4', models)).toBe(true);
    expect(validateModelId('openai:gpt-4', models)).toBe(true);
    expect(validateModelId('claude:gpt-4', models)).toBe(false);
  });

  test('should group single provider correctly', async () => {
    const { groupModelsByProvider } = await import('./onboarding.js');
    const models: Model[] = [
      { id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli' },
      { id: 'sonnet', name: 'Claude Sonnet', providerId: 'claude', providerType: 'cli' }
    ];

    const grouped = groupModelsByProvider(models);

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped.claude).toHaveLength(2);
    expect(grouped.claude?.map((m: Model) => m.id)).toEqual(['opus', 'sonnet']);
  });
});
