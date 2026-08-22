import {Program} from "../models/Program.js";
import {logger} from "../config/logger.js";

// Keeps every program's "Next batch" date pointed at the next Saturday, so
// nobody has to edit it by hand every week.
//
// A program whose nextBatchMode is "auto" (the default) always advertises the
// next upcoming Saturday, in the same "August 22, 2026" form the site prints.
// The sweep is idempotent and self-healing: it runs on a timer, so even if the
// container was down when a Saturday passed, the next run catches up. Programs
// switched to "custom" in the admin panel keep whatever an editor typed, and
// the sweep never touches them.
//
// The batch date is site-wide, not per program: when a save changes one
// program's date or mode (syncBatchDateToAll below), the result is pushed to
// every other program immediately, so an editor never repeats a date across
// nine forms. The sweep exists to keep auto dates fresh between saves.

// Dates are computed in UTC so every instance agrees on what "the next
// Saturday" is, whatever the machine's local timezone.
export const nextSaturdayDate = (now = new Date()) => {
  const date = new Date(now);
  const daysUntilSaturday = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const formatBatchDate = (date) =>
  date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const updateBatchDates = async (now = new Date()) => {
  const nextBatch = formatBatchDate(nextSaturdayDate(now));

  // `$ne: "custom"` rather than `$eq: "auto"` so records created before the
  // field existed (which carry no value) are treated as auto instead of being
  // skipped forever. `nextBatch: {$ne}` keeps the write minimal: a program
  // already showing the right date is left alone, revision and all.
  const result = await Program.updateMany(
    {deletedAt: null, nextBatchMode: {$ne: "custom"}, nextBatch: {$ne: nextBatch}},
    // revision is bumped so an editor sitting on a stale copy of the record is
    // refused when they save, instead of silently writing the old batch date
    // back over the fresh one.
    {$set: {nextBatch}, $inc: {revision: 1}},
  );

  if (result.modifiedCount > 0) {
    logger.info({count: result.modifiedCount, nextBatch}, "Rolled program batch dates forward");
  }

  return result.modifiedCount;
};

// Pushes one program's batch date and mode to every other program, so a single
// save in the admin updates the whole catalogue.
//
// The saved program is the source of truth and is excluded from the write — its
// row was just saved by content.service.js, which canonicalises auto mode to
// the next Saturday before this runs. Everyone else is aligned to it, and their
// revision is bumped so a stale editor copy cannot write the old date back.
export const syncBatchDateToAll = async (program) => {
  const mode = program.nextBatchMode === "custom" ? "custom" : "auto";
  const date = mode === "auto" ? formatBatchDate(nextSaturdayDate()) : program.nextBatch;

  const result = await Program.updateMany(
    {
      _id: {$ne: program._id},
      deletedAt: null,
      $or: [{nextBatch: {$ne: date}}, {nextBatchMode: {$ne: mode}}],
    },
    {$set: {nextBatch: date, nextBatchMode: mode}, $inc: {revision: 1}},
  );

  if (result.modifiedCount > 0) {
    logger.info({count: result.modifiedCount, nextBatch: date, mode}, "Synced batch date across programs");
  }

  return result.modifiedCount;
};

// Cloud Run may run several instances. Each runs this independently, which is
// harmless: the update is idempotent and matches nothing on the second pass.
export const startBatchDateUpdater = (intervalMs = 3_600_000) => {
  const timer = setInterval(() => {
    updateBatchDates().catch((error) => {
      logger.error({err: error}, "Batch-date sweep failed");
    });
  }, intervalMs);

  // Must not hold the process open during a graceful shutdown.
  timer.unref();
  return timer;
};