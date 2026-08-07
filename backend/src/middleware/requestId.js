import {randomUUID} from "node:crypto";

// A stable id per request, echoed in every response envelope and attached to
// every log line, so a user reporting "it failed" can hand over one string that
// finds the exact request in the logs.
//
// An inbound X-Request-Id is honoured so a trace survives a proxy hop, but it is
// length-capped and character-restricted: the value is reflected in a response
// header, and an unbounded caller-controlled header is a header-injection tool.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const requestId = (request, response, next) => {
  const inbound = request.get("x-request-id");
  const id = inbound && SAFE_ID.test(inbound) ? inbound : randomUUID();

  request.id = id;
  response.locals.requestId = id;
  response.setHeader("X-Request-Id", id);
  next();
};
