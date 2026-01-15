import {
  DescribeBotAliasCommand,
  DescribeBotCommand,
  LexModelsV2Client,
  ListBotAliasesCommand,
  ListBotLocalesCommand,
  ListBotsCommand,
  ListBotVersionsCommand,
  ListIntentsCommand,
} from "@aws-sdk/client-lex-models-v2";
import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} from "@aws-sdk/client-lex-runtime-v2";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  type AWSCredentials,
  clearSession,
  clearSessionCookie,
  protectedProcedure,
  publicProcedure,
  router,
  setSessionCookie,
  updateSession,
} from "@/lib/trpc/server";

const LEX_REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ca-central-1",
  "af-south-1",
] as const;

const connectSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  sessionToken: z.string().optional(),
  region: z.enum(LEX_REGIONS),
});

function isAWSCredentialError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    return (
      name === "ExpiredTokenException" ||
      name === "InvalidIdentityToken" ||
      name === "UnrecognizedClientException" ||
      name === "InvalidSignatureException" ||
      name === "AccessDeniedException"
    );
  }
  return false;
}

function handleAWSError(error: unknown, isSSO: boolean): never {
  if (isAWSCredentialError(error)) {
    const message = isSSO
      ? "Your session has expired. Please re-authenticate with fresh SSO credentials."
      : "Authentication failed. Please check your credentials.";
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message,
      cause: { isSSO },
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : "Unknown AWS error",
  });
}

function createSTSClient(credentials: AWSCredentials) {
  return new STSClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

function createLexClient(credentials: AWSCredentials) {
  return new LexModelsV2Client({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

function createLexRuntimeClient(credentials: AWSCredentials) {
  return new LexRuntimeV2Client({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export const awsRouter = router({
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session.credentials) {
      return null;
    }
    return {
      region: ctx.session.credentials.region,
      isSSO: ctx.session.credentials.isSSO,
    };
  }),

  connect: publicProcedure
    .input(connectSchema)
    .mutation(async ({ input, ctx }) => {
      const credentials: AWSCredentials = {
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
        sessionToken: input.sessionToken,
        region: input.region,
        isSSO: !!input.sessionToken,
      };

      const stsClient = createSTSClient(credentials);

      try {
        const identity = await stsClient.send(new GetCallerIdentityCommand({}));

        const userInfo = {
          account: identity.Account ?? "",
          arn: identity.Arn ?? "",
          userId: identity.UserId ?? "",
        };

        updateSession(ctx.sessionId, { credentials, userInfo });
        await setSessionCookie(ctx.sessionId);

        return {
          account: identity.Account,
          arn: identity.Arn,
          userId: identity.UserId,
          region: input.region,
        };
      } catch (error) {
        handleAWSError(error, credentials.isSSO);
      }
    }),

  disconnect: publicProcedure.mutation(async ({ ctx }) => {
    clearSession(ctx.sessionId);
    await clearSessionCookie();
    return { success: true };
  }),

  getCallerIdentity: protectedProcedure.query(async ({ ctx }) => {
    const stsClient = createSTSClient(ctx.credentials);

    try {
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      return {
        account: identity.Account,
        arn: identity.Arn,
        userId: identity.UserId,
        region: ctx.credentials.region,
      };
    } catch (error) {
      handleAWSError(error, ctx.credentials.isSSO);
    }
  }),

  listBots: protectedProcedure.query(async ({ ctx }) => {
    const lexClient = createLexClient(ctx.credentials);

    try {
      const response = await lexClient.send(new ListBotsCommand({}));
      return (
        response.botSummaries?.map((bot) => ({
          botId: bot.botId,
          botName: bot.botName,
          botStatus: bot.botStatus,
          description: bot.description,
          latestBotVersion: bot.latestBotVersion,
        })) ?? []
      );
    } catch (error) {
      handleAWSError(error, ctx.credentials.isSSO);
    }
  }),

  describeBot: protectedProcedure
    .input(z.object({ botId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new DescribeBotCommand({ botId: input.botId })
        );
        return {
          botId: response.botId,
          botName: response.botName,
          botStatus: response.botStatus,
          description: response.description,
          roleArn: response.roleArn,
          idleSessionTTLInSeconds: response.idleSessionTTLInSeconds,
          dataPrivacy: response.dataPrivacy,
          creationDateTime: response.creationDateTime?.toISOString(),
          lastUpdatedDateTime: response.lastUpdatedDateTime?.toISOString(),
          botType: response.botType,
          botMembers: response.botMembers,
          failureReasons: response.failureReasons,
        };
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  listBotVersions: protectedProcedure
    .input(z.object({ botId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new ListBotVersionsCommand({
            botId: input.botId,
            sortBy: { attribute: "BotVersion", order: "Descending" },
          })
        );
        return (
          response.botVersionSummaries?.map((version) => ({
            botVersion: version.botVersion,
            botName: version.botName,
            botStatus: version.botStatus,
            description: version.description,
            creationDateTime: version.creationDateTime?.toISOString(),
          })) ?? []
        );
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  listBotAliases: protectedProcedure
    .input(z.object({ botId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new ListBotAliasesCommand({ botId: input.botId })
        );
        return (
          response.botAliasSummaries?.map((alias) => ({
            botAliasId: alias.botAliasId,
            botAliasName: alias.botAliasName,
            botVersion: alias.botVersion,
            botAliasStatus: alias.botAliasStatus,
            description: alias.description,
            creationDateTime: alias.creationDateTime?.toISOString(),
            lastUpdatedDateTime: alias.lastUpdatedDateTime?.toISOString(),
          })) ?? []
        );
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  listBotLocales: protectedProcedure
    .input(
      z.object({
        botId: z.string().min(1),
        botVersion: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new ListBotLocalesCommand({
            botId: input.botId,
            botVersion: input.botVersion,
          })
        );
        return (
          response.botLocaleSummaries?.map((locale) => ({
            localeId: locale.localeId,
            localeName: locale.localeName,
            description: locale.description,
            botLocaleStatus: locale.botLocaleStatus,
            lastUpdatedDateTime: locale.lastUpdatedDateTime?.toISOString(),
          })) ?? []
        );
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  listIntents: protectedProcedure
    .input(
      z.object({
        botId: z.string().min(1),
        botVersion: z.string().min(1),
        localeId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new ListIntentsCommand({
            botId: input.botId,
            botVersion: input.botVersion,
            localeId: input.localeId,
          })
        );
        return (
          response.intentSummaries?.map((intent) => ({
            intentId: intent.intentId,
            intentName: intent.intentName,
            description: intent.description,
            parentIntentSignature: intent.parentIntentSignature,
            lastUpdatedDateTime: intent.lastUpdatedDateTime?.toISOString(),
          })) ?? []
        );
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  describeBotAlias: protectedProcedure
    .input(
      z.object({ botId: z.string().min(1), botAliasId: z.string().min(1) })
    )
    .query(async ({ ctx, input }) => {
      const lexClient = createLexClient(ctx.credentials);

      try {
        const response = await lexClient.send(
          new DescribeBotAliasCommand({
            botId: input.botId,
            botAliasId: input.botAliasId,
          })
        );

        const localeSettings = response.botAliasLocaleSettings;
        const lambdaArns: Record<string, string | undefined> = {};
        const locales: string[] = [];
        if (localeSettings) {
          for (const [locale, settings] of Object.entries(localeSettings)) {
            locales.push(locale);
            lambdaArns[locale] =
              settings.codeHookSpecification?.lambdaCodeHook?.lambdaARN;
          }
        }

        return {
          botAliasId: response.botAliasId,
          botAliasName: response.botAliasName,
          botVersion: response.botVersion,
          botAliasStatus: response.botAliasStatus,
          description: response.description,
          lambdaArns,
          locales,
          creationDateTime: response.creationDateTime?.toISOString(),
          lastUpdatedDateTime: response.lastUpdatedDateTime?.toISOString(),
        };
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),

  recognizeText: protectedProcedure
    .input(
      z.object({
        botId: z.string().min(1),
        botAliasId: z.string().min(1),
        localeId: z.string().min(1),
        sessionId: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lexRuntimeClient = createLexRuntimeClient(ctx.credentials);

      const request = {
        botId: input.botId,
        botAliasId: input.botAliasId,
        localeId: input.localeId,
        sessionId: input.sessionId,
        text: input.text,
      };

      try {
        const response = await lexRuntimeClient.send(
          new RecognizeTextCommand(request)
        );

        return {
          messages: response.messages,
          sessionState: response.sessionState,
          interpretations: response.interpretations,
          requestAttributes: response.requestAttributes,
          sessionId: response.sessionId,
          rawRequest: request,
          rawResponse: {
            messages: response.messages,
            sessionState: response.sessionState,
            interpretations: response.interpretations,
            requestAttributes: response.requestAttributes,
            sessionId: response.sessionId,
          },
        };
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),
});
