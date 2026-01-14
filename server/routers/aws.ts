import {
  LexModelsV2Client,
  ListBotsCommand,
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
});
