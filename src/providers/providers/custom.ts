import { ApiProvider } from '../api-provider.js';
import type { Model } from '../../types.js';

export class CustomProvider extends ApiProvider {
  private _id = 'custom';
  private _name = 'Custom API';
  private customModels: Model[] = [];

  constructor() {
    super('');
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get models(): Model[] {
    return this.customModels;
  }

  async listModels(): Promise<Model[]> {
    return this.customModels.map(model => ({
      ...model,
      providerId: this._id,
      providerType: this.type,
      supportsTools: model.supportsTools ?? true
    }));
  }

  setConfig(providerId: string, name: string, baseUrl: string, models: Model[], apiKey: string): void {
    if (!baseUrl) {
      throw new Error('baseUrl is required for custom provider');
    }

    if (!models || models.length === 0) {
      throw new Error('models array cannot be empty for custom provider');
    }

    this._id = providerId;
    this._name = name;
    this.baseUrl = baseUrl;
    this.customModels = models;
    this.apiKey = apiKey;
  }

  supportsTools(model: string): boolean {
    return true;
  }
}
