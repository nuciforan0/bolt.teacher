import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

export async function loader({ context }: LoaderFunctionArgs) {
  // Diagnostic endpoint to check environment variables
  const cloudflareEnv = context?.cloudflare?.env as any;
  const envKeys = Object.keys(cloudflareEnv || {});
  const hasAnthropicKey = !!cloudflareEnv?.ANTHROPIC_API_KEY;

  return new Response(
    JSON.stringify({
      hasCloudflareEnv: !!cloudflareEnv,
      envKeys,
      hasAnthropicKey,
      anthropicKeyLength: cloudflareEnv?.ANTHROPIC_API_KEY?.length || 0,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

const logger = createScopedLogger('api.enhancher');

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message, model, provider } = await request.json<{
    message: string;
    model: string;
    provider: ProviderInfo;
    apiKeys?: Record<string, string>;
  }>();

  const { name: providerName } = provider;

  // validate 'model' and 'provider' fields
  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  // Ensure LLMManager is initialized with Cloudflare environment
  const cloudflareEnv = context?.cloudflare?.env as any;
  LLMManager.getInstance(cloudflareEnv);

  // Debug logging to help diagnose API key issues
  logger.info('Enhancer request:', {
    provider: providerName,
    providerNameType: typeof providerName,
    model,
    hasApiKeysFromCookie: !!apiKeys?.[providerName],
    hasCloudflareEnv: !!cloudflareEnv,
    cloudflareEnvKeys: Object.keys(cloudflareEnv || {}),
    anthropicKeyInEnv: !!cloudflareEnv?.ANTHROPIC_API_KEY,
    apiKeyFromCookie: apiKeys?.[providerName] ? 'Present' : 'Missing',
    apiKeyFromEnv: cloudflareEnv?.[`${providerName.toUpperCase()}_API_KEY`] ? 'Present' : 'Missing',
    cookieApiKeys: Object.keys(apiKeys || {}),
    providerObject: provider,
  });

  try {
    logger.info('About to call streamText with:', {
      provider: providerName,
      model,
      hasApiKeys: !!apiKeys,
      apiKeysCount: Object.keys(apiKeys || {}).length,
      hasProviderSettings: !!providerSettings,
      hasCloudflareEnv: !!cloudflareEnv,
    });

    const result = await streamText({
      messages: [
        {
          role: 'user',
          content:
            `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
            stripIndents`
            You are a professional prompt engineer specializing in crafting precise, effective prompts.
            Your task is to enhance prompts by making them more specific, actionable, and effective.

            I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

            For valid prompts:
            - Make instructions explicit and unambiguous
            - Add relevant context and constraints
            - Remove redundant information
            - Maintain the core intent
            - Ensure the prompt is self-contained
            - Use professional language

            For invalid or unclear prompts:
            - Respond with clear, professional guidance
            - Keep responses concise and actionable
            - Maintain a helpful, constructive tone
            - Focus on what the user should provide
            - Use a standard template for consistency

            IMPORTANT: Your response must ONLY contain the enhanced prompt text.
            Do not include any explanations, metadata, or wrapper tags.

            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      env: cloudflareEnv,
      apiKeys,
      providerSettings,
      options: {
        system:
          'You are a senior software principal architect, you should help the user analyse the user query and enrich it with the necessary context and constraints to make it more specific, actionable, and effective. You should also ensure that the prompt is self-contained and uses professional language. Your response should ONLY contain the enhanced prompt text. Do not include any explanations, metadata, or wrapper tags.',

        /*
         * onError: (event) => {
         *   throw new Response(null, {
         *     status: 500,
         *     statusText: 'Internal Server Error',
         *   });
         * }
         */
      },
    });

    // Handle streaming errors in a non-blocking way
    (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'error') {
            const error: any = part.error;
            logger.error('Streaming error:', error);
            break;
          }
        }
      } catch (error) {
        logger.error('Error processing stream:', error);
      }
    })();

    // Return the text stream directly since it's already text data
    return new Response(result.textStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.log('Enhancer error:', error);

    if (error instanceof Error && error.message?.includes('API key')) {
      logger.error('API key error in enhancer:', error.message);
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    logger.error('Unexpected error in enhancer:', error);
    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
