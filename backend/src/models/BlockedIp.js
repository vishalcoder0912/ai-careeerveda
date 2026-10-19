import mongoose from "mongoose";

// IPs blocked by a super-admin or by the anomaly detector. Stored rather than
// held in memory so a block applies on every instance and survives a restart;
// the TTL index removes the row when the block lapses.
const blockedIpSchema = new mongoose.Schema(
  {
    ip: {type: String, required: true, unique: true, maxlength: 64},
    until: {type: Date, required: true},
    reason: {type: String, default: "manual", maxlength: 200},
  },
  {versionKey: false},
);

blockedIpSchema.index({until: 1}, {expireAfterSeconds: 0});

export const BlockedIp = mongoose.model("BlockedIp", blockedIpSchema);
