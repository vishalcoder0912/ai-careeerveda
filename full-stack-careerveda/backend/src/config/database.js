import mongoose from "mongoose";

import {env} from "./env.js";
import {logger} from "./logger.js";

// Mongoose 7+ no longer silently drops unknown query operators, but strict
// query filtering is still opt-in. On means a typo'd field name in a filter
// throws instead of quietly matching every document in the collection.
mongoose.set("strictQuery", true);

let connecting = null;

// Which database to talk to. The connection string is the source of truth when
// it names one (Firestore compat URIs always do — the database id lives in the
// path, e.g. /careerveda-db), because overriding it with a mongoose `dbName`
// option would silently point at a database that does not exist. MONGODB_DB_NAME
// is only the fallback for a bare URI (local docker, tests).
const databaseNameFrom = (uri = "") => {
  try {
    // mongodb://user:pass@host:port/DB?query — everything after the last slash
    // before the query string is the database.
    const pathname = new URL(uri).pathname.replace(/^\/+/, "");
    return pathname || env.MONGODB_DB_NAME;
  } catch {
    return env.MONGODB_DB_NAME;
  }
};

const isFirestore = (uri = "") => uri.includes(".firestore.goog");

export const connectDatabase = async (uri = env.MONGODB_URI) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  // Firestore with MongoDB compatibility (Firestore Enterprise): the URI must
  // carry loadBalanced=true, tls=true, authMechanism=SCRAM-SHA-256 and
  // retryWrites=false — and must NOT be overridden here, so those stay in the
  // URI where the database's own connection string defines them. The pool is
  // kept small on purpose: Firestore exposes a load balancer, not a replica
  // set, and a handful of sockets carries all of this app's traffic.
  const options = {maxPoolSize: 10, serverSelectionTimeoutMS: 8000};
  const dbName = databaseNameFrom(uri);
  if (dbName) options.dbName = dbName;

  // On Firestore an index build is a long-running operation — every createIndex
  // waits minutes or longer and only one runs at a time, so Mongoose's
  // auto-indexing at boot would stall every request behind it and re-submit the
  // whole schema on each restart. Indexes are created once, deliberately, with
  // `npm run sync:indexes` (or in the Firebase console); local Mongo keeps the
  // automatic behaviour.
  mongoose.set("autoIndex", !isFirestore(uri));

  // Concurrent callers (server boot plus a readiness probe that lands in the
  // same tick) must share one attempt, or Atlas sees a burst of pools.
  if (!connecting) {
    connecting = mongoose
      .connect(uri, options)
      .then((connection) => {
        logger.info({db: dbName}, "Firestore connected");
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
