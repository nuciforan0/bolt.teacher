import type { IProviderSetting } from '~/types/model';
import { BaseProvider } from './base-provider';
import type { ModelInfo, ProviderInfo } from './types';
import * as providers from './registry';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMManager');
export class LLMManager {
  private static _instance: LLMManager;
  private _providers: Map<string, BaseProvider> = new Map();
  private _modelList: ModelInfo[] = [];
  private readonly _env: any = {};

  private constructor(_env: Record<string, any>) {
    this._registerProvidersFromDirectory();
    this._env = _env;
  }

  static getInstance(env: Record<string, any> = {}): LLMManager {
    // If we have a new environment context, reinitialize the singleton
    if (LLMManager._instance && Object.keys(env).length > 0) {
      // Check if the environment has changed
      const currentEnv = LLMManager._instance._env;
      const hasChanged = Object.keys(env).some((key) => currentEnv[key] !== env[key]);

      if (hasChanged) {
        logger.info('Environment changed, reinitializing LLMManager');
        LLMManager._instance = new LLMManager(env);
      }
    }

    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    }

    return LLMManager._instance;
  }

  get env() {
    return this._env;
  }

  private async _registerProvidersFromDirectory() {
    try {
      /*
       * Dynamically import all files from the providers directory
       * const providerModules = import.meta.glob('./providers/*.ts', { eager: true });
       */

      // Look for exported classes that extend BaseProvider
      for (const exportedItem of Object.values(providers)) {
        if (typeof exportedItem === 'function' && exportedItem.prototype instanceof BaseProvider) {
          const provider = new exportedItem();

          try {
            this.registerProvider(provider);
          } catch (error: any) {
            logger.warn('Failed To Register Provider: ', provider.name, 'error:', error.message);
          }
        }
      }
    } catch (error) {
      logger.error('Error registering providers:', error);
    }
  }

  registerProvider(provider: BaseProvider) {
    if (this._providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    logger.info('Registering Provider: ', provider.name);
    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...provider.staticModels];
  }

  getProvider(name: string): BaseProvider | undefined {
    return this._providers.get(name);
  }

  getAllProviders(): BaseProvider[] {
    return Array.from(this._providers.values());
  }

  getModelList(): ModelInfo[] {
    return this._modelList;
  }

  async updateModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, any>;
  }): Promise<ModelInfo[]> {
    const { apiKeys, providerSettings, serverEnv } = options;

    let enabledProviders = Array.from(this._providers.values()).map((p) => p.name);

    if (providerSettings && Object.keys(providerSettings).length > 0) {
      enabledProviders = enabledProviders.filter((p) => providerSettings[p].enabled);
    }

    // Get dynamic models from all providers that support them
    const dynamicModels = await Promise.all(
      Array.from(this._providers.values())
        .filter((provider) => enabledProviders.includes(provider.name))
        .filter(
          (provider): provider is BaseProvider & Required<Pick<ProviderInfo, 'getDynamicModels'>> =>
            !!provider.getDynamicModels,
        )
        .map(async (provider) => {
          const cachedModels = provider.getModelsFromCache(options);

          if (cachedModels) {
            return cachedModels;
          }

          try {
            const models = await provider.getDynamicModels(apiKeys, providerSettings?.[provider.name], serverEnv);
            provider.storeDynamicModels(options, models);

            return models;
          } catch (error) {
            logger.warn(`Failed to get dynamic models for ${provider.name}:`, error);
            return [];
          }
        }),
    );

    const allDynamicModels = dynamicModels.flat();

    this._modelList = [
      ...Array.from(this._providers.values())
        .filter((provider) => enabledProviders.includes(provider.name))
        .flatMap((provider) => provider.staticModels),
      ...allDynamicModels,
    ];

    return this._modelList;
  }

  getStaticModelList() {
    return Array.from(this._providers.values()).flatMap((provider) => provider.staticModels);
  }

  async getModelListFromProvider(
    providerArg: BaseProvider,
    options: {
      apiKeys?: Record<string, string>;
      providerSettings?: Record<string, IProviderSetting>;
      serverEnv?: Record<string, any>;
    },
  ): Promise<ModelInfo[]> {
    const { apiKeys, providerSettings, serverEnv } = options;

    const cachedModels = providerArg.getModelsFromCache(options);

    if (cachedModels) {
      return cachedModels;
    }

    if (!providerArg.getDynamicModels) {
      return providerArg.staticModels;
    }

    try {
      const dynamicModels = await providerArg.getDynamicModels(
        apiKeys,
        providerSettings?.[providerArg.name],
        serverEnv,
      );
      providerArg.storeDynamicModels(options, dynamicModels);

      return [...providerArg.staticModels, ...dynamicModels];
    } catch (error) {
      logger.warn(`Failed to get dynamic models for ${providerArg.name}:`, error);
      return providerArg.staticModels;
    }
  }
  getStaticModelListFromProvider(providerArg: BaseProvider) {
    const provider = this._providers.get(providerArg.name);

    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }

    return [...(provider.staticModels || [])];
  }

  getDefaultProvider(): BaseProvider {
    // Prefer Anthropic as the default provider
    const anthropicProvider = this._providers.get('Anthropic');

    if (anthropicProvider) {
      return anthropicProvider;
    }

    // Fallback to first available provider
    const firstProvider = this._providers.values().next().value;

    if (!firstProvider) {
      throw new Error('No providers registered');
    }

    return firstProvider;
  }
}
