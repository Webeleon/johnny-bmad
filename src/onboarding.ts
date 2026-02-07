import inquirer from 'inquirer';
import chalk from 'chalk';
import { homedir } from 'os';
import { registry } from './providers/registry.js';
import { loadModelConfig, saveModelConfig, modelConfigExists, type ModelConfig } from './config/models.js';
import { setApiKey, addCustomProvider } from './providers/config.js';
import type { Model, CustomProviderConfig } from './types.js';
import { subHeader, info, success, warn } from './utils/logger.js';

interface AgentConfig {
  name: string;
  description: string;
  recommended: string[];
  reason: string;
}

function validateModelId(modelId: string, models: Model[]): boolean {
  const modelIds = models.map(m => `${m.providerId}:${m.id}`);
  return modelIds.includes(modelId);
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  sm: {
    name: 'SM Agent (Sprint Master)',
    description: 'Checks project status and sprint planning',
    recommended: ['opus', 'gpt-4', 'glm-4'],
    reason: 'Excellent at planning and organization'
  },
  storyCreator: {
    name: 'Story Creator Agent',
    description: 'Creates detailed story files from epics',
    recommended: ['opus', 'gpt-4', 'glm-4'],
    reason: 'Strong at writing detailed specifications'
  },
  dev: {
    name: 'Dev Agent',
    description: 'Implements story requirements with code',
    recommended: ['sonnet', 'gpt-3.5-turbo', 'glm-4-plus'],
    reason: 'Balanced speed and quality for implementation'
  },
  reviewer: {
    name: 'Reviewer Agent',
    description: 'Reviews implemented code against acceptance criteria',
    recommended: ['opus', 'gpt-4', 'glm-4'],
    reason: 'Thorough analysis for quality assurance'
  }
};

async function promptApiProviders(): Promise<string[]> {
  const { configure } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configure',
      message: 'Would you like to configure API-based providers?',
      default: false
    }
  ]);

  if (!configure) {
    return [];
  }

  const { providers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'providers',
      message: 'Which API providers do you want to configure?',
      choices: [
        { name: 'OpenAI (GPT models)', value: 'openai' },
        { name: 'GLM (Zhipu AI)', value: 'glm' },
        { name: 'Kimi', value: 'kimi' }
      ]
    }
  ]);

  if (providers.length === 0) {
    return [];
  }

  console.log();
  console.log(chalk.gray('You selected:'));
  const providerNames = providers.map((p: string) => {
    const provider = registry.getProvider(p);
    return provider ? provider.name : p;
  });
  for (const name of providerNames) {
    console.log(chalk.gray(`  • ${name}`));
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue with these providers?',
      default: true
    }
  ]);

  if (!confirm) {
    return promptApiProviders();
  }

  return providers;
}

async function promptApiKey(providerId: string, providerName: string): Promise<string> {
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: `Enter API key for ${providerName}:`,
      mask: '*'
    }
  ]);

  return apiKey;
}

async function promptCustomProvider(): Promise<{ providerId: string; config: CustomProviderConfig; apiKey?: string } | null> {
  const { addCustom } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addCustom',
      message: 'Do you want to add a custom API provider?',
      default: false
    }
  ]);

  if (!addCustom) {
    return null;
  }

  const { providerId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'providerId',
      message: 'Provider ID (lowercase, numbers, hyphens only):',
      validate: (input: string) => /^[a-z0-9-]+$/.test(input) || 'Invalid format. Use lowercase letters, numbers, and hyphens only.'
    }
  ]);

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Provider name:',
      validate: (input: string) => input.trim().length > 0 || 'Name is required.'
    }
  ]);

  const { baseUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseUrl',
      message: 'API base URL:',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Invalid URL format.';
        }
      }
    }
  ]);

  const { defineModels } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'defineModels',
      message: 'Define models now?',
      default: true
    }
  ]);

  const models: Array<{ id: string; name: string; supportsTools?: boolean }> = [];

  if (defineModels) {
    let addMore = true;
    while (addMore) {
      const { modelId } = await inquirer.prompt([
        {
          type: 'input',
          name: 'modelId',
          message: 'Model ID:',
          validate: (input: string) => input.trim().length > 0 || 'Model ID is required.'
        }
      ]);

      const { modelName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'modelName',
          message: 'Model name (defaults to ID):',
          default: modelId
        }
      ]);

      const { supportsTools } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'supportsTools',
          message: 'Supports tools?',
          default: true
        }
      ]);

      models.push({
        id: modelId,
        name: modelName,
        supportsTools
      });

      const { another } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'another',
          message: 'Add another model?',
          default: false
        }
      ]);

      addMore = another;
    }
  }

  if (models.length === 0) {
    const { defineModelsLater } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'defineModelsLater',
        message: 'Custom providers require at least one model. Define models now?',
        default: true
      }
    ]);

    if (defineModelsLater) {
      let addMore = true;
      while (addMore) {
        const { modelId } = await inquirer.prompt([
          {
            type: 'input',
            name: 'modelId',
            message: 'Model ID:',
            validate: (input: string) => input.trim().length > 0 || 'Model ID is required.'
          }
        ]);

        const { modelName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'modelName',
            message: 'Model name (defaults to ID):',
            default: modelId
          }
        ]);

        const { supportsTools } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'supportsTools',
            message: 'Supports tools?',
            default: true
          }
        ]);

        models.push({
          id: modelId,
          name: modelName,
          supportsTools
        });

        const { another } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'another',
            message: 'Add another model?',
            default: false
          }
        ]);

        addMore = another;
      }
    } else {
      console.log();
      console.log(chalk.yellow('Custom provider requires at least one model. Skipping provider addition.'));
      return null;
    }
  }

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API key (optional, press Enter to skip):',
      mask: '*'
    }
  ]);

  return {
    providerId,
    config: {
      name,
      baseUrl,
      models
    },
    apiKey: apiKey || undefined
  };
}

function groupModelsByProvider(models: Model[]): Record<string, Model[]> {
  const grouped: Record<string, Model[]> = {};

  for (const model of models) {
    if (!grouped[model.providerId]) {
      grouped[model.providerId] = [];
    }
    grouped[model.providerId].push(model);
  }

  return grouped;
}

function formatModelChoice(model: Model, isRecommended: boolean): string {
  const prefix = isRecommended ? '[✓ Recommended] ' : '';
  return `${prefix}${model.providerId}:${model.id} - ${model.name}`;
}

async function promptAgentModel(
  agentKey: string,
  models: Model[],
  groupedModels: Record<string, Model[]>
): Promise<string> {
  const config = AGENT_CONFIGS[agentKey];

  console.log();
  console.log(chalk.cyan.bold(`🤖 Configure: ${config.name}`));
  console.log(chalk.gray(`  ${config.description}`));
  console.log(chalk.gray(`  Recommended: ${config.recommended} (${config.reason})`));
  console.log();

  const choices: any[] = [];

  const cliProviders = Object.entries(groupedModels).filter(([_, models]) =>
    models.some(m => m.providerType === 'cli')
  );

  if (cliProviders.length > 0) {
    choices.push(new inquirer.Separator('═══ CLI Providers ═══'));
    for (const [providerId, providerModels] of cliProviders) {
      for (const model of providerModels.filter(m => m.providerType === 'cli')) {
        const isRecommended = config.recommended.includes(model.id);
        choices.push({
          name: formatModelChoice(model, isRecommended),
          value: `${providerId}:${model.id}`
        });
      }
    }
  }

  const apiProviders = Object.entries(groupedModels).filter(([_, models]) =>
    models.some(m => m.providerType === 'api')
  );

  if (apiProviders.length > 0) {
    choices.push(new inquirer.Separator('═══ API Providers ═══'));
    for (const [providerId, providerModels] of apiProviders) {
      for (const model of providerModels.filter(m => m.providerType === 'api')) {
        choices.push({
          name: `  ${providerId}:${model.id} - ${model.name}`,
          value: `${providerId}:${model.id}`
        });
      }
    }
  }

  choices.push(new inquirer.Separator('═══ Custom ═══'));
  choices.push({
    name: 'Enter custom model ID...',
    value: '__custom__'
  });

  const { modelId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'modelId',
      message: 'Choose model:',
      choices
    }
  ]);

  if (modelId === '__custom__') {
    const { customModelId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customModelId',
        message: 'Enter custom model ID:',
        validate: (input: string) => input.trim().length > 0 || 'Model ID is required.'
      }
    ]);
    return customModelId;
  }

  return modelId;
}

function displayConfigurationSummary(config: ModelConfig, models: Model[]): void {
  console.log();
  console.log(chalk.cyan.bold('Configuration Summary'));
  console.log();

  const modelMap = new Map(models.map(m => [`${m.providerId}:${m.id}`, m]));

  for (const [agentKey, agentConfig] of Object.entries(AGENT_CONFIGS)) {
    const modelId = config[agentKey as keyof ModelConfig] as string;
    const model = modelMap.get(modelId);

    console.log(chalk.bold(`${agentConfig.name}:`));
    if (model) {
      console.log(chalk.gray(`   Provider: ${model.providerId.toUpperCase()}`));
      console.log(chalk.gray(`   Model: ${modelId} (${model.name})`));
    } else {
      console.log(chalk.gray(`   Model: ${modelId}`));
    }
    console.log();
  }
}

export async function runOnboarding(cwd: string): Promise<void> {
  console.log();
  console.log(chalk.cyan.bold('JOHNNY BMAD - Model Configuration'));
  console.log();
  console.log(chalk.gray('This onboarding will help you configure your LLM providers.'));
  console.log(chalk.gray('The following configuration files will be created:'));
  console.log(chalk.gray(`  • ${homedir()}/.johnny-bmad/providers.json`));
  console.log(chalk.gray('  • .johnny-bmad/models.json'));
  console.log(chalk.gray('  • .johnny-bmad-models-cache.json'));
  console.log();

  subHeader('Step 1: Detecting CLI Tools');
  const availableProviders = await registry.getAvailableProviders(cwd);

  const cliProviders = availableProviders.filter(p => p.type === 'cli');
  if (cliProviders.length > 0) {
    console.log();
    console.log(chalk.green('✓ Detected CLI tools:'));
    for (const provider of cliProviders) {
      console.log(chalk.gray(`   • ${provider.name} (CLI)`));
    }
  } else {
    console.log();
    console.log(chalk.yellow('⚠️  No CLI tools detected'));
  }

  subHeader('Step 2: Configure API Providers');
  const selectedApiProviders = await promptApiProviders();

  for (const providerId of selectedApiProviders) {
    const provider = registry.getProvider(providerId);
    if (provider) {
      const apiKey = await promptApiKey(providerId, provider.name);
      try {
        await setApiKey(providerId, apiKey);
        console.log(chalk.green(`✓ API key saved for ${provider.name}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Failed to save API key for ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }

  subHeader('Step 3: Add Custom Providers');
  console.log();
  const customProvider = await promptCustomProvider();
  if (customProvider) {
    try {
      await addCustomProvider(customProvider.providerId, customProvider.config);
      if (customProvider.apiKey) {
        await setApiKey(customProvider.providerId, customProvider.apiKey);
      }
      console.log(chalk.green(`✓ Custom provider "${customProvider.config.name}" added with ${customProvider.config.models.length} models`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Failed to add custom provider: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  subHeader('Step 4: Discovering Available Models');
  console.log(chalk.cyan('📦 Discovering available models...'));

  const allModels = await registry.getAllModels(cwd, true);

  const groupedModels = groupModelsByProvider(allModels);

  for (const [providerId, models] of Object.entries(groupedModels)) {
    const provider = registry.getProvider(providerId);
    const providerName = provider ? provider.name : providerId;
    console.log(chalk.green(`  ✓ ${providerName}: ${models.length} models`));
  }

  console.log(chalk.cyan(`💾 Cached ${allModels.length} models`));

  subHeader('Step 5: Configure Agents');

  const config: ModelConfig = {
    sm: '',
    storyCreator: '',
    dev: '',
    reviewer: '',
    version: 1
  };

  config.sm = await promptAgentModel('sm', allModels, groupedModels);
  config.storyCreator = await promptAgentModel('storyCreator', allModels, groupedModels);
  config.dev = await promptAgentModel('dev', allModels, groupedModels);
  config.reviewer = await promptAgentModel('reviewer', allModels, groupedModels);

  displayConfigurationSummary(config, allModels);

  const { save } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'save',
      message: 'Save this configuration?',
      default: true
    }
  ]);

  if (save) {
    saveModelConfig(cwd, config);
    console.log();
    console.log(chalk.green.bold('✓ Configuration saved!'));
    console.log();
    console.log(chalk.gray('Files created:'));
    console.log(chalk.gray('  ~/.johnny-bmad/providers.json  - Global API keys'));
    console.log(chalk.gray('  .johnny-bmad/models.json        - Per-project model selection'));
    console.log(chalk.gray('  .johnny-bmad-models-cache.json - Model cache (1-hour TTL)'));
    console.log();
    console.log(chalk.gray('You can reconfigure at any time with: johnny-bmad --reconfigure'));
    console.log(chalk.gray('Refresh model cache with: johnny-bmad --refresh-models'));
  } else {
    console.log();
    console.log(chalk.yellow('Configuration cancelled. Run johnny-bmad --reconfigure to try again.'));
    throw new Error('Onboarding cancelled by user');
  }
}

export { modelConfigExists, validateModelId, groupModelsByProvider, formatModelChoice };
