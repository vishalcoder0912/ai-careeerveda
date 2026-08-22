// NoSQL-operator and prototype-pollution filtering.
//
// Mongoose will happily interpret `{email: {$ne: null}}` as a query operator, so
// a login body of {"email":{"$ne":null},"password":{"$ne":null}} can match the
// first admin in the collection. Zod validation catches most of this by refusing
// non-string values, but this runs first and unconditionally: defence should not
// depend on every future route remembering to validate.
//
// Keys starting with `$` are dropped. Keys that would walk the prototype chain
// (__proto__, constructor, prototype) are dropped — assigning to those on a
// parsed body is how a JSON payload becomes a global object mutation.

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const clean = (value, depth = 0) => {
  // A deeply nested body should not be able to blow the stack before it is
  // rejected for size. 20 is far past any legitimate document we accept.
  if (depth > 20) return undefined;

  if (Array.isArray(value)) return value.map((entry) => clean(entry, depth + 1));

  if (!isPlainObject(value)) return value;

  // Collected as pairs and materialised in one go, rather than assigned key by
  // key onto an accumulator. `Object.fromEntries` *defines* each own property
  // instead of invoking a setter, so a key that somehow got past the filter
  // below still could not reach `Object.prototype`'s `__proto__` setter — the
  // guard stops being the only thing standing between a request and the
  // prototype chain. It also returns an ordinary object directly, which is why
  // the null-prototype accumulator and the spread that used to convert it back
  // are both gone.
  //
  // A dynamic `output[key] = …` whose name comes from the request is also the
  // one shape CodeQL reports as js/remote-property-injection, and that query
  // has no sanitizer: every guard above it is invisible to the analysis, so no
  // amount of filtering would have cleared the alert.
  const entries = [];

  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith("$") || FORBIDDEN_KEYS.has(key)) continue;
    // Dots let a caller reach into a subdocument path (`"a.b": 1`) on an update.
    // Nothing we accept needs a literal dot in a key.
    if (key.includes(".")) continue;
    entries.push([key, clean(entry, depth + 1)]);
  }

  return Object.fromEntries(entries);
};

export const sanitizeRequest = (request, response, next) => {
  if (request.body) request.body = clean(request.body);
  if (request.params) request.params = clean(request.params);

  // req.query is a getter on Express 5 and read-only on some Express 4 setups,
  // so mutate its contents rather than reassigning the property.
  if (request.query && isPlainObject(request.query)) {
    const cleaned = clean(request.query);
    for (const key of Object.keys(request.query)) {
      if (!(key in cleaned)) delete request.query[key];
    }
    Object.assign(request.query, cleaned);
  }

  next();
};

export const __testing = {clean};
