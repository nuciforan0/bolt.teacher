import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';

export async function action(args: ActionFunctionArgs) {
  return iteraterAction(args);
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

const logger = createScopedLogger('api.iterater');

async function iteraterAction({ context, request }: ActionFunctionArgs) {
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
  logger.info('Iterator request:', {
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
            The user you are interacting with doesn't have much tech literacy or understanding of technology, so its your job to understand what exactly they want and don't want on their website
            You are to analyse the tech illiterate users' product ideas and ask questions to better guide the user to further refine their idea.
            The questions should be aimed at adding further details and features, while also ensuring clarity. If there is any implementation which is ambigiuous, ask clarifiying questions
            You shoud NOT ask any technical questions like asking the type of web stack or technologies that should be used.
            You should NOT ask any questions relating to logging in or registering accounts
            You should NOT ask any questions about adding print functionality
            For Example, lets say the user prompts "I want to make a website which my students where they get a test on the Roman Empire"

            The output would look something like this:
            "
            I want to make a website which my students where they get a test on the Roman Empire

              Do you want a page where you can view the results?
              Do you want a page where you can change the details of the exam?
 
              Write your answer next to the question. If you want more questions, click iterate again. If you are happy with your prompt, click Enhance prompt, and then once that is done, submit it to bolt
            "


            Then this could continue forever, you must accomodate from previous answers and give further questions. 
            IMPORTANT: You must keep the informationm from the last response the EXACTLY SAME, and it must keep the questions & answers that the user has previously answered
            Continuing fron the last example, the next output could end up looking like this:

            "
            I want to make a website which my students where they get a test on the Roman Empire
              Do you want a page where you can view the results? Yes I would actually
              Do you want a page where you can change the details of the exam? Yes please
              
              What type of questions do you want on the exam, Multiple Choice, Short Response, Long Response, etc?
              Do you want images or diagrams to be shown in the exam?
              Do you want students to see their results?
              If so, do you want students to see what questions they got wrong and the correct answers?
              
              Write your answer next to the question. If you want more questions, click iterate again. If you are happy with your prompt, click Enhance prompt, and then once that is done, submit it to bolt
            "

            The text after the questions are the responses from the user to the questions previously asked by AI. They should not be modified at all. But new questions should be asked afterwards, with a seperating new line between the old questions and the new questions.


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

    logger.info('streamText result:', {
      hasResult: !!result,
      hasTextStream: !!result.textStream,
      textStreamType: typeof result.textStream,
      hasFullStream: !!result.fullStream,
      fullStreamType: typeof result.fullStream,
    });

    // Debug: Let's check if the stream is actually readable
    if (result.textStream) {
      logger.info('TextStream is available, checking if it can be read');
    } else {
      logger.error('TextStream is not available!');
    }

    // Handle streaming errors in a non-blocking way
    (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'error') {
            const error: any = part.error;
            logger.error('Streaming error:', error);
            break;
          }

          // Log successful parts to see if we're getting content
          if (part.type === 'text-delta') {
            logger.info('Received text delta:', part.textDelta);
          }
        }
      } catch (error) {
        logger.error('Error processing stream:', error);
      }
    })();

    // Try creating a manual stream from the fullStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'error') {
              const error: any = part.error;
              logger.error('Streaming error in manual stream:', error);
              controller.error(error);

              return;
            }

            if (part.type === 'text-delta') {
              const chunk = encoder.encode(part.textDelta);
              controller.enqueue(chunk);
            }
          }
          controller.close();
        } catch (error) {
          logger.error('Error in manual stream:', error);
          controller.error(error);
        }
      },
    });

    // Return the manual stream
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: unknown) {
    console.log('Iterater error:', error);

    if (error instanceof Error && error.message?.includes('API key')) {
      logger.error('API key error in iterater:', error.message);
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    logger.error('Unexpected error in iterater:', error);
    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
