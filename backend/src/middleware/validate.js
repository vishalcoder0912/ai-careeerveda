// Zod validation as middleware.
//
// The parsed result REPLACES req.body/query/params. That is the point: a route
// that reads req.body after this can only see fields the schema declared, so an
// extra `{role:"super-admin"}` in the payload cannot ride along into a
// `new Model(req.body)` call. Mass assignment is prevented by the schema being
// the only way through, not by remembering to pick fields at every call site.

export const validate = ({body, query, params}) => (request, response, next) => {
  try {
    if (params) request.params = params.parse(request.params);
    if (query) {
      const parsed = query.parse(request.query);
      // Express 5 exposes req.query as a getter, so assign onto the object we
      // keep rather than replacing the property.
      request.validatedQuery = parsed;
      Object.defineProperty(request, "query", {value: parsed, configurable: true, writable: true});
    }
    if (body) request.body = body.parse(request.body);
    next();
  } catch (error) {
    next(error);
  }
};
