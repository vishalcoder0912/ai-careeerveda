import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";

// Standalone FAQs, as opposed to the per-program ones embedded in Program.faqs.
// Both exist on purpose: a program's FAQ belongs to that program and moves with
// it, while these are site-wide and are grouped by `category` on the page.
//
// `relatedEntity` lets an FAQ be attached to any content type without a
// polymorphic ref — the pairing is (type, id), checked by the controller.

const faqSchema = new mongoose.Schema(
  {
    question: {type: String, required: true, trim: true, maxlength: 500},
    answer: {type: String, required: true, maxlength: 4000},

    category: {type: String, default: "General", maxlength: 80, index: true},

    relatedEntityType: {
      type: String,
      enum: ["Program", "Faculty", "Alumni", "Blog", "Job", "Policy", null],
      default: null,
    },
    relatedEntityId: {type: mongoose.Schema.Types.ObjectId, default: null},
  },
  {timestamps: true},
);

// The slug is derived from the question rather than a title, and questions are
// long — the plugin caps it at 140 characters, which is ample for uniqueness.
faqSchema.plugin(contentPlugin, {
  slugSource: "question",
  searchFields: ["question", "answer", "category"],
});

export const Faq = mongoose.model("Faq", faqSchema);
