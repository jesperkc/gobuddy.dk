#!/usr/bin/env node
// One-time script to register a Strava webhook subscription.
//
// Usage:
//   STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy STRAVA_WEBHOOK_CALLBACK_URL=https://... STRAVA_WEBHOOK_VERIFY_TOKEN=zzz node scripts/strava-webhook-subscribe.ts
//
// The callback URL should point to your deployed Supabase Edge Function:
//   https://<project-ref>.supabase.co/functions/v1/strava-webhook

const STRAVA_CLIENT_ID = process.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const CALLBACK_URL = process.env.STRAVA_WEBHOOK_CALLBACK_URL;
const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "gobuddy-strava-verify";

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !CALLBACK_URL) {
  console.error("Missing required environment variables:");
  console.error("  VITE_STRAVA_CLIENT_ID");
  console.error("  STRAVA_CLIENT_SECRET");
  console.error("  STRAVA_WEBHOOK_CALLBACK_URL");
  process.exit(1);
}

async function main() {
  console.log("Registering Strava webhook subscription...");
  console.log(`  Callback URL: ${CALLBACK_URL}`);
  console.log(`  Verify Token: ${VERIFY_TOKEN}`);

  // Check for existing subscription
  const listRes = await fetch(
    `https://www.strava.com/api/v3/push_subscriptions?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`
  );

  if (listRes.ok) {
    const existing = await listRes.json();
    if (existing.length > 0) {
      console.log("\nExisting subscription(s) found:");
      for (const sub of existing) {
        console.log(`  ID: ${sub.id}, Callback: ${sub.callback_url}`);
      }
      console.log("\nStrava only allows one subscription per app.");
      console.log("Delete existing subscription first if you want to change the callback URL:");
      console.log(
        `  curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/${existing[0].id}?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}"`
      );
      return;
    }
  }

  // Create subscription
  const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      callback_url: CALLBACK_URL,
      verify_token: VERIFY_TOKEN,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`\n✅ Subscription created! ID: ${data.id}`);
  } else {
    console.error(`\n❌ Failed to create subscription (${res.status}):`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
