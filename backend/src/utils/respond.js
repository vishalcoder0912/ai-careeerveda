// One success envelope for the whole API:
//   {success, data, meta:{requestId, ...}}
// The frontend can therefore unwrap every response the same way, and a client
// that logs `meta.requestId` on failure gives support a key straight into the
// server logs.

export const ok = (response, data, meta = {}) =>
  response.json({
    success: true,
    data,
    meta: {requestId: response.locals.requestId, ...meta},
  });

export const created = (response, data, meta = {}) =>
  response.status(201).json({
    success: true,
    data,
    meta: {requestId: response.locals.requestId, ...meta},
  });

// `page`/`limit`/`total` travel in meta rather than alongside the records, so
// `data` is always just the array and never needs shape-sniffing.
export const paginated = (response, items, {page, limit, total}) =>
  response.json({
    success: true,
    data: items,
    meta: {
      requestId: response.locals.requestId,
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      hasMore: page * limit < total,
    },
  });

export const noContent = (response) => response.status(204).end();
