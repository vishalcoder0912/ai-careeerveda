import {readPath} from "../components/fieldPath";

// A field counts as filled when it is a non-blank string or a non-empty array.
// Matches isFilled() in the backend rules — `0` is deliberately not empty,
// because displayOrder 0 is the first item, not a missing value.
export const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    // A media reference is filled when it actually points at an image.
    if ("url" in value) return String(value.url || "").trim().length > 0;
    return Object.keys(value).length > 0;
  }
  return true;
};

/** The publish-required fields this form has not filled in yet, in form order. */
export const missingForPublish = (resource, form) =>
  resource.fields
    .filter((field) => field.publish && !isFilled(readPath(form, field.name)))
    .map((field) => ({
      name: field.name,
      label: field.label,
      group: field.group || "Other",
    }));
