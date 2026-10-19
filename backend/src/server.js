import mongoose from "mongoose";

import {createApp} from "./app.js";
import {env} from "./config/env.js";
import {logger} from "./config/logger.js";
import {connectDatabase, disconnectDatabase} from "./config/database.js";
import {startScheduledPublishing} from "./jobs/publishScheduled.js";
import {startBatchDateUpdater} from "./jobs/updateBatchDates.js";

// On Firestore, Mongoose's auto-indexing is off (see database.js), so the
// unique indexes that dedupe leads and keep slugs unique exist only if someone
// ran `npm run sync:indexes`. Without them those guarantees silently become
// best-effort. Checked at boot and logged loudly rather than refusing to start:
// a missing index degrades a guarantee, a dead API takes the site down.
const reportMissingIndexes = async () => {
  for (const model of Object.values(mongoose.models)) {
    try {
      const {toCreate} = await model.diffIndexes();
      if (toCreate.length > 0) {
        logger.error(
          {collection: model.collection.name, missing: toCreate},
          "Indexes missing on Firestore; run `npm run sync:indexes`",
        );
      }
    } catch (error) {
      logger.warn({err: error, collection: model.collection.name}, "Could not verify indexes");
    }
  }
};

const start = async () => {
  await connectDatabase();
  if (env.isFirestore) reportMissingIndexes();

  startScheduledPublishing();
  startBatchDateUpdater();

  const app = createApp();
  // Bind 0.0.0.0, not localhost: Cloud Run routes to the container's external
  // interface, and a loopback-only listener fails its health check.
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info({port: env.PORT, env: env.NODE_ENV}, "API listening");
  });

  // Cloud Run sends SIGTERM and then waits before killing the container. Closing
  // the listener first lets in-flight requests finish; dropping them mid-write
  // is how a lead submission gets a 502 after it was already saved.
  const shutdown = async (signal) => {
    logger.info({signal}, "Shutting down");

    // If a request hangs, the process must still exit rather than sit until the
    // platform force-kills it with connections half-open.
    const force = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, 10_000);
    force.unref();

    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error({err: error}, "Error during shutdown");
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // A promise rejection nobody handled has left the process in a state we did
  // not design for. Log it and exit so the platform starts a clean instance,
  // rather than serving traffic from a container in unknown condition.
  process.on("unhandledRejection", (reason) => {
    logger.fatal({err: reason}, "Unhandled promise rejection");
    process.exit(1);
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({err: error}, "Uncaught exception");
    process.exit(1);
  });
};

start().catch((error) => {
  logger.fatal({err: error}, "Failed to start server");
  process.exit(1);
});
