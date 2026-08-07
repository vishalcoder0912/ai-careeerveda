// Path helpers for the field editor, kept out of Fields.jsx so that file exports
// only React components — otherwise Fast Refresh can't preserve editor state on
// save and has to full-reload the page.

// Reads and writes a possibly-dotted path ("seo.title") on the form state, so
// the field config can address nested values without every field knowing how
// the object is shaped.
export const readPath = (object, path) =>
  path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);

export const writePath = (object, path, value) => {
  const keys = path.split(".");
  const next = {...object};
  let cursor = next;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    cursor[key] = {...(cursor[key] || {})};
    cursor = cursor[key];
  }

  cursor[keys[keys.length - 1]] = value;
  return next;
};

export const fieldDomId = (name) => `field-${name.replace(/\./g, "-")}`;
