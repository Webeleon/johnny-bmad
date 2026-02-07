import type { LLMProvider, Model, InvokeOptions, LLMResult } from '../types.js';

export abstract class ApiProvider implements LLMProvider {
  protected baseUrl: string;
  abstract models: Model[];
  apiKey: string | null = null;

  readonly type = 'api' as const;
  private readonly RETRY_DELAYS = [1000, 2000, 4000];

  abstract get id(): string;
  abstract get name(): string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async checkAvailable(): Promise<boolean> {
    if (this.apiKey === null) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Model[]> {
    return this.models.map(model => ({
      ...model,
      providerId: this.id,
      providerType: this.type,
      supportsTools: model.supportsTools ?? true
    }));
  }

  async invoke(options: InvokeOptions): Promise<LLMResult> {
    const maxRetries = options.maxRetries ?? 3;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.makeApiRequest(options);
        return {
          durationMs: Date.now() - startTime,
          output: result,
          retries: attempt
        };
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = this.RETRY_DELAYS.at(attempt) ?? this.RETRY_DELAYS.at(-1) ?? 4000;
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async makeApiRequest(options: InvokeOptions): Promise<string> {
    const url = options.baseUrl ?? this.baseUrl;
    const key = options.apiKey ?? this.apiKey;

    if (!key) {
      throw new Error(`API key required for ${this.name}`);
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: options.prompt }
    ];

    const requestBody: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      tools?: Array<{ type: string; function: { name: string } }>;
    } = {
      model: options.model,
      messages
    };

    if (options.allowedTools && options.allowedTools.length > 0) {
      requestBody.tools = this.formatTools(options.allowedTools);
    }

    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`${this.name} API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  supportsTools(model: string): boolean {
    const foundModel = this.models.find(m => m.id === model);
    return foundModel?.supportsTools ?? false;
  }

  formatTools(toolNames: string[]): Array<{ type: string; function: { name: string } }> {
    return toolNames.map(name => ({
      type: 'function',
      function: {
        name
      }
    }));
  }

  needsApiKey(): boolean {
    return true;
  }

  async configure(apiKey: string, baseUrl?: string): Promise<void> {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }
}
