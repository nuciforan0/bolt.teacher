import { useState } from 'react';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptIterator');

export function usePromptIterator() {
  const [iteratingPrompt, setIteratingPrompt] = useState(false);
  const [promptIterated, setPromptIterated] = useState(false);

  const resetIterator = () => {
    setIteratingPrompt(false);
    setPromptIterated(false);
  };

  const iteratePrompt = async (
    input: string,
    setInput: (value: string) => void,
    model: string,
    provider: ProviderInfo,
    apiKeys?: Record<string, string>,
  ) => {
    setIteratingPrompt(true);
    setPromptIterated(false);

    const requestBody: any = {
      message: input,
      model,
      provider,
    };

    if (apiKeys) {
      requestBody.apiKeys = apiKeys;
    }

    const response = await fetch('/api/iterator', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    logger.info('Iterator response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      hasBody: !!response.body,
    });

    const reader = response.body?.getReader();

    const originalInput = input;

    if (reader) {
      const decoder = new TextDecoder();

      let _input = '';
      let _error;

      try {
        setInput('');

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            logger.info('Stream done, final input:', _input);
            break;
          }

          const chunk = decoder.decode(value);
          _input += chunk;

          logger.info('Received chunk:', {
            chunkLength: chunk.length,
            chunk: chunk.substring(0, 100),
            totalLength: _input.length,
          });

          setInput(_input);
        }
      } catch (error) {
        _error = error;
        logger.error('Error reading stream:', error);
        setInput(originalInput);
      } finally {
        if (_error) {
          logger.error(_error);
        }

        setIteratingPrompt(false);
        setPromptIterated(true);

        setTimeout(() => {
          setInput(_input);
        });
      }
    } else {
      logger.error('No reader available from response');
      setIteratingPrompt(false);
      setPromptIterated(true);
    }
  };

  return { iteratingPrompt, promptIterated, iteratePrompt, resetIterator };
}
