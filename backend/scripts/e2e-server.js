
import {MongoMemoryServer} from "mongodb-memory-server";

const port = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const apiPort = port("E2E_API_PORT", 8081);
const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:5273";
const adminUrl = process.env.E2E_ADMIN_URL || "http://localhost:5274";

export const E2E = Object.freeze({
  port: apiPort,
  frontendUrl,
  adminUrl,
  // Credentials for a throwaway in-memory database that exists only for the
  // duration of a test run. They are not a secret and are meant to be readable:
  // a spec that needs to log in has to know them.
  superAdmin: {
    name: "E2E Super Admin",
    email: "e2e-super@careerveda.test",
    password: "E2e-Test-Password-9f3x!",
  },
});

const start = async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = "test";
  process.env.PORT = String(E2E.port);
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB_NAME = "careerveda_e2e";
  process.env.FRONTEND_URL = E2E.frontendUrl;
  process.env.ADMIN_URL = E2E.adminUrl;
  process.env.CORS_ALLOWED_ORIGINS = `${E2E.frontendUrl},${E2E.adminUrl}`;
  process.env.JWT_ACCESS_SECRET = "e2e-access-secret-not-used-anywhere-else-0123456789";
  process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret-not-used-anywhere-else-0123456789";
  process.env.COOKIE_SECURE = "false";
  process.env.LOG_LEVEL = "warn";

  // Emptied, not merely unset: dotenv would otherwise fill them from .env and
  // the media routes would come up pointed at the real ImageKit account.
  process.env.IMAGEKIT_PUBLIC_KEY = "";
  process.env.IMAGEKIT_PRIVATE_KEY = "";
  process.env.IMAGEKIT_URL_ENDPOINT = "";

  const [{createApp}, {connectDatabase, disconnectDatabase}, {seedE2EData}] = await Promise.all([
    import("../src/app.js"),
    import("../src/config/database.js"),
    import("./lib/seedE2E.js"),
  ]);

  await connectDatabase();
  await seedE2EData(E2E);

  const app = createApp();
  const server = app.listen(E2E.port, "127.0.0.1", () => {
    // Playwright waits on the port, but a human running this directly wants to
    // know where things are.
    console.log(`E2E API on http://localhost:${E2E.port} (in-memory MongoDB, ImageKit disabled)`);
  });


  let stopping = false;
  let finalizing = false;
  const finish = async () => {
    if (finalizing) return;
    finalizing = true;
    // mongod and mongoose both hang occasionally on Windows when a client kept
    // sockets open. Race the whole teardown against a hard timer: this process
    // owns only the disposable in-memory database, so even a forced exit cannot
    // lose anything real, and a stuck mongod must never keep Playwright waiting.
    await Promise.race([
      (async () => {
        await disconnectDatabase().catch(() => {});
        await mongo.stop().catch(() => {});
      })(),
      new Promise((resolve) => {
        setTimeout(resolve, 8_000);
      }),
    ]);
    process.exit(0);
  };

  const shutdown = () => {
    if (stopping) return;
    stopping = true;

    server.close(() => {
      void finish();
    });
    server.closeIdleConnections?.();

    const force = setTimeout(() => {
      server.closeAllConnections?.();
      void finish();
    }, 5_000);
    force.unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((error) => {
  console.error("E2E server failed to start:", error);
  process.exit(1);
});
