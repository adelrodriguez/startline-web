"use server"

import { StorageBuckets } from "~/lib/consts"
import { logActivity } from "~/lib/logger"
import { authActionClient, withRateLimitByUser } from "~/lib/safe-action"
import {
  generateKey,
  getBucketFromMimeType,
  getSignedPutUrl,
} from "~/lib/storage"
import {
  ConfirmUploadRequestSchema,
  UploadFileRequestSchema,
} from "~/lib/validation/upload"
import {
  type AssetMimeType,
  type AssetPublicId,
  createAsset,
  findAssetByPublicId,
  markAssetAsUploaded,
} from "~/server/data/asset"
import { UploadError } from "~/utils/error"
import { buildAssetUrl } from "~/utils/url"

export const uploadFile = authActionClient
  .schema(UploadFileRequestSchema)
  .use(withRateLimitByUser)
  .action(
    async ({ parsedInput: { filename, mimeType, size }, ctx: { user } }) => {
      const key = generateKey(user.id, filename)

      const url = await getSignedPutUrl({
        key,
        bucket: StorageBuckets.MAIN,
        mimeType,
      })

      const pendingAsset = await createAsset(user.id, {
        bucket: getBucketFromMimeType(mimeType as AssetMimeType),
        filename,
        mimeType: mimeType as AssetMimeType,
        service: "r2",
        size,
        url: buildAssetUrl(key),
      })

      await logActivity("created_asset", { userId: user.id })

      return {
        presignedUrl: url,
        publicId: pendingAsset.publicId,
      }
    },
  )

export const confirmUpload = authActionClient
  .schema(ConfirmUploadRequestSchema)
  .action(async ({ parsedInput: { publicId }, ctx: { user } }) => {
    const asset = await findAssetByPublicId(publicId as AssetPublicId)

    if (!asset) {
      throw new UploadError("Asset not found")
    }

    const uploadedAsset = await markAssetAsUploaded(asset.id, user.id)

    await logActivity("marked_asset_as_uploaded", {
      userId: user.id,
    })

    return { url: uploadedAsset.url }
  })
