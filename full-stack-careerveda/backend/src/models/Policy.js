import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {policySectionSchema, statSchema} from "./shared/schemas.js";

// Mirrors src/data/policies.js and serves /privacy-policy, /refund-policy,
// /terms and /escalation-policy.
//
// The existing file's rule is preserved deliberately: a policy marked draft is
// not merely hidden from the footer — its URL must not serve placeholder text
// as though it were the terms binding a visitor. Here that is the standard
// `status` field, and the public endpoint refuses anything not published, so an
// unfinished policy 404s rather than rendering half-written legal copy.
//
// `version` and `effectiveDate` exist because a policy is a document with legal
// force: knowing which text was live on a given date is occasionally the whole
// question. Revision history from the content plugin retains the prior text.

const policySchema = new mongoose.Schema(
  {
    title: {type: String, required: true, trim: true, maxlength: 300},
    eyebrow: {type: String, default: "Legal", maxlength: 80},
    lead: {type: String, default: "", maxlength: 1000},

    // The human-readable "last updated" line the page prints. effectiveDate is
    // the machine-readable counterpart.
    updated: {type: String, default: "", maxlength: 80},
    effectiveDate: {type: Date, default: null},
    version: {type: String, default: "1.0", maxlength: 20},

    stats: {type: [statSchema], default: []},
    sections: {type: [policySectionSchema], default: []},
  },
  {timestamps: true},
);

policySchema.plugin(contentPlugin, {
  slugSource: "title",
  searchFields: ["title", "lead"],
});

export const Policy = mongoose.model("Policy", policySchema);
