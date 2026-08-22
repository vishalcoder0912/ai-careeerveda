import {RESOURCES} from "../config/resources.js";
import {CONTENT_STATUS} from "../models/plugins/contentPlugin.js";
import {logger} from "../config/logger.js";

// Promotes scheduled content whose time has arrived.
//
// This job is a convenience, not a correctness requirement. publishedFilter()
// already treats a scheduled record with a past date as public, so if this
// never runs the site is still correct — only the admin list would show
// "scheduled" for something already live. That ordering is deliberate: a cron
// that silently stops must not take content offline.

export const publishScheduled = async (now = new Date()) => {
  let promoted = 0;

  for (const resource of Object.values(RESOURCES)) {
    const result = await resource.model.updateMany(
      {status: CONTENT_STATUS.SCHEDULED, scheduledAt: {$lte: now}, deletedAt: null},
      [
        {
          $set: {
            status: CONTENT_STATUS.PUBLISHED,
            // Keeps the original publication date if the record has been live
            // before, otherwise adopts the scheduled time as the moment it
            // went out — not "whenever the cron happened to fire".
            publishedAt: {$ifNull: ["$publishedAt", "$scheduledAt"]},
            scheduledAt: null,
          },
        },
      ],
    );

    if (result.modifiedCount > 0) {
      logger.info({resource: resource.name, count: result.modifiedCount}, "Published scheduled content");
      promoted += result.modifiedCount;
    }
  }

  return promoted;
};

// Cloud Run may run several instances. Each will run this independently, which
// is harmless: the update is idempotent and matches nothing on the second pass.
export const startScheduledPublishing = (intervalMs = 60_000) => {
  const timer = setInterval(() => {
    publishScheduled().catch((error) => {
      logger.error({err: error}, "Scheduled publishing sweep failed");
    });
  }, intervalMs);

  // Must not hold the process open during a graceful shutdown.
  timer.unref();
  return timer;
};
