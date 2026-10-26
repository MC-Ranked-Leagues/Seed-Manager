"use node";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { REPLAY_KEY_PATTERN } from "./lib/replayKey";

const client = () =>
  new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
const bucket = () => process.env.S3_BUCKET!;

export const requestReplayUpload = action({
  args: { seedId: v.id("seeds"), contentType: v.string() },
  returns: v.string(),
  handler: async (ctx, { seedId, contentType }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not signed in");
    const { key } = await ctx.runQuery(internal.replays.getUploadTarget, {
      userId,
      seedId,
    });
    return await getSignedUrl(
      client(),
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 900 }
    );
  },
});

export const confirmReplayUpload = action({
  args: { seedId: v.id("seeds") },
  returns: v.null(),
  handler: async (ctx, { seedId }): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not signed in");
    const { key } = await ctx.runQuery(internal.replays.getUploadTarget, {
      userId,
      seedId,
    });
    const s3 = client();
    await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    await ctx.runMutation(internal.replays.setReplayKey, {
      userId,
      seedId,
      key,
    });
    return null;
  },
});

export const deleteReplay = internalAction({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (_ctx, { key }): Promise<null> => {
    await client().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key })
    );
    return null;
  },
});

export const getDownloadUrl = internalAction({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<string | null> => {
    if (!REPLAY_KEY_PATTERN.test(key)) return null;
    if (!(await ctx.runQuery(internal.replays.isPublishedReplay, { key })))
      return null;
    return await getSignedUrl(
      client(),
      new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        ResponseContentDisposition: `attachment; filename="${key.split("/").pop()}"`,
      }),
      { expiresIn: 120 }
    );
  },
});
