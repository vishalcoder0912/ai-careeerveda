import mongoose from "mongoose";

import {env} from "./env.js";
import {logger} from "./logger.js";

// Mongoose 7+ no longer silently drops unknown query operators, but strict
// query filtering is still opt-in. On means a typo'd field name in a filter
// throws instead of quietly matching every document in the collection.
mongoose.set("strictQuery", true);

let connecting = null;

export const connectDatabase = async (uri = env.MONGODB_URI) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  // Concurrent callers (server boot plus a readiness probe that lands in the
  // same tick) must share one attempt, or Atlas sees a burst of pools.
  if (!connecting) {
    connecting = mongoose
      .connect(uri, {
        dbName: env.MONGODB_DB_NAME,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      })
      .then((connection) => {
        logger.info({db: env.MONGODB_DB_NAME}, "MongoDB connected");
        return connection;
      })
      .catch((error) => {
        // Clear the cached promise so a later attempt can retry rather than
        // re-await a permanently rejected one.
        connecting = null;
        throw error;
      });
  }

  await connecting;
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  connecting = null;
  await mongoose.connection.close();
};

// 1 === connected. Used by /ready, which must answer from local state without
// issuing a query, so a readiness probe never adds load during an incident.
export const isDatabaseReady = () => mongoose.connection.readyState === 1;
