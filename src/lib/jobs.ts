import "server-only"

import env from "@/lib/env.server"
import qstash from "@/services/qstash"
import { throwUnless } from "@/utils/assert"
import { buildUrl } from "@/utils/url"
import type { PublishRequest } from "@upstash/qstash"
import ky from "ky"
import type { NextRequest } from "next/server"
import type Stripe from "stripe"

type JobSchemaMap = {
  "stripe/process-webhook-event": {
    /**
     * The webhook event payload.
     */
    stripeEvent: Stripe.Event
    /**
     * The webhook event ID. Use it to mark the event as processed.
     */
    eventId: number
  }
}

type JobType = keyof JobSchemaMap
type JobPayload<T extends JobType> = JobSchemaMap[T]

/**
 * This is a wrapper around the `qstash.publishJSON` function that allows you to
 * mock the request in development.
 *
 * Only use this for background jobs. If you need LLM responses, use `publishJSON`
 * directly (which you can't easily mock in development).
 */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
  options?: Pick<
    PublishRequest,
    | "contentBasedDeduplication"
    | "deduplicationId"
    | "delay"
    | "retries"
    | "timeout"
    | "notBefore"
  >,
) {
  const request = buildJobRequest(type, payload)

  throwUnless(!!request.url, "request.url is required")

  if (env.MOCK_QSTASH) {
    console.log("Mocking QStash request", request)

    return ky.post(request.url, {
      json: request.body,
      retry: options?.retries,
    })
  }

  return qstash.publishJSON<JobPayload<T>>({
    ...request,
    ...options,
  })
}

export function buildJobRequest<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
): PublishRequest<JobPayload<T>> {
  return {
    url: buildUrl(`/api/jobs/${type}`, {
      protocol: env.MOCK_QSTASH ? "http" : "https",
    }),
    body: payload,
  }
}

export async function parseJobRequest<T extends JobType>(
  _: T,
  request: Request | NextRequest,
): Promise<JobPayload<T>> {
  const payload = await request.json()

  return payload
}
