import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { ProviderConfig, CustomProviderConfig } from '../types.js';
import { debug } from '../utils/logger.js';

const CONFIG_FILE = '.johnny-bmad/providers.json';

async function loadProviderConfigFile(): Promise<ProviderConfig | null> {
  try {
    const configPath = join(homedir(), CONFIG_FILE);
    const content = await readFile(configPath, 'utf-8');
    const config: ProviderConfig = JSON.parse(content);

    if (!config.apiKeys || !config.customProviders) {
      debug(`Invalid provider config structure, using defaults`);
      return null;
    }

    debug(`Loaded provider config from ${configPath}`);
    return config;
  } catch {
    return null;
  }
}

export async function loadProviderConfig(): Promise<ProviderConfig> {
  const config = await loadProviderConfigFile();
  if (config) {
    return config;
  }

  return {
    apiKeys: {},
    customProviders: {},
    version: 1
  };
}

export function getApiKey(config: ProviderConfig, providerId: string): string | undefined {
  return config.apiKeys[providerId];
}

export function getCustomProvider(config: ProviderConfig, providerId: string) {
  return config.customProviders[providerId];
}

export async function setApiKey(providerId: string, apiKey: string): Promise<void> {
  const configPath = join(homedir(), CONFIG_FILE);
  
  let config = await loadProviderConfig();
  config.apiKeys[providerId] = apiKey;
  
  const configDir = join(homedir(), '.johnny-bmad');
  await mkdir(configDir, { recursive: true });
  
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  debug(`Saved API key for provider: ${providerId}`);
}

export async function addCustomProvider(providerId: string, config: CustomProviderConfig): Promise<void> {
  const configPath = join(homedir(), CONFIG_FILE);
  
  let providerConfig = await loadProviderConfig();
  providerConfig.customProviders[providerId] = config;
  
  const configDir = join(homedir(), '.johnny-bmad');
  await mkdir(configDir, { recursive: true });
  
  await writeFile(configPath, JSON.stringify(providerConfig, null, 2), 'utf-8');
  debug(`Added custom provider: ${providerId}`);
}
