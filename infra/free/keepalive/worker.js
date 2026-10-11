// Keeps the free tier backend awake during the day by pinging its health endpoint on a cron.
// Render's free web service sleeps after 15 minutes without traffic, and the health endpoint
// also runs SELECT 1, so each ping wakes the database as well. Cloudflare cron triggers keep
// running without the 60 day inactivity shutoff that GitHub Actions schedules have.
export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  // Lets the schedule be tested by hand with a GET to the worker URL.
  async fetch(request, env) {
    return new Response(JSON.stringify(await ping(env)), {
      headers: { 'content-type': 'application/json' },
    });
  },
};

async function ping(env) {
  const url = `${env.API_URL.replace(/\/$/, '')}/api/health/`;
  const started = Date.now();
  try {
    // A cold start can take about a minute, so give the first request a long timeout.
    const response = await fetch(url, { signal: AbortSignal.timeout(90000), cf: { cacheTtl: 0 } });
    const result = { url, status: response.status, ms: Date.now() - started };
    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    const result = { url, error: String(error), ms: Date.now() - started };
    console.log(JSON.stringify(result));
    return result;
  }
}
