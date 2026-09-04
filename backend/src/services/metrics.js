// Application self-monitoring administration.
// Provides real-time metrics about the health of the application under load.
// Access restricted to authenticated admins.

// In-memory metrics store. For multi-instance deployments, use Redis or Cloud
// Monitoring instead. This is the single-VM emergency view.
class MetricsStore {
  constructor() {
    this.requests = new Map(); // {path: {count, lastError}}
    this.errors = new Map(); // {path: {4xx, 5xx}}
    this.rateLimitHits = new Map(); // {ip: count}
    this.startedAt = Date.now();
  }

  record(path, statusCode, ip) {
    const req = this.requests.get(path) || {count: 0};
    req.count++;
    this.requests.set(path, req);

    if (statusCode >= 400) {
      const err = this.errors.get(path) || {"4xx": 0, "5xx": 0};
      if (statusCode >= 500) err["5xx"]++;
      else err["4xx"]++;
      this.errors.set(path, err);
    }

    if (statusCode === 429) {
      const hits = this.rateLimitHits.get(ip) || 0;
      this.rateLimitHits.set(ip, hits + 1);
    }
  }

  snapshot() {
    return {
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      totalRequests: [...this.requests.values()].reduce((sum, r) => sum + r.count, 0),
      requests: Object.fromEntries(this.requests),
      errors: Object.fromEntries(this.errors),
      topRateLimitedIPs: [...this.rateLimitHits.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([ip, count]) => ({ip, count})),
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      cpuUserSeconds: Math.round(process.cpuUsage().user / 1000),
    };
  }
}

const metrics = new MetricsStore();

// Express middleware to record request metrics after the response is sent.
export const metricsMiddleware = (req, res, next) => {
  res.on("finish", () => {
    metrics.record(req.path, res.statusCode, req.ip);
  });
  next();
};

export const getMetricsSnapshot = () => metrics.snapshot();
