import {
  DescribeBotAliasCommand,
  DescribeBotCommand,
  LexModelsV2Client,
  ListBotAliasesCommand,
  ListBotsCommand,
  ListBotVersionsCommand,
} from "@aws-sdk/client-lex-models-v2";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  type AWSCredentials,
  clearSession,
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

export const awsRouter = router({
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

        updateSession(ctx.sessionId, { credentials });
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
        if (localeSettings) {
          for (const [locale, settings] of Object.entries(localeSettings)) {
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
          creationDateTime: response.creationDateTime?.toISOString(),
          lastUpdatedDateTime: response.lastUpdatedDateTime?.toISOString(),
        };
      } catch (error) {
        handleAWSError(error, ctx.credentials.isSSO);
      }
    }),
});
