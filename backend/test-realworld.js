/**
 * test-realworld.js  —  Real-world account archetype test
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the ML pipeline against 6 realistic account archetypes that represent
 * the kinds of profiles a vendor would actually encounter on the platform.
 *
 * Stats are modelled after real-world patterns for each archetype type.
 * NOT synthetic edge-cases — these represent typical real profile distributions.
 *
 * Run from the backend folder:
 *   node test-realworld.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawn }         from "child_process";
import path              from "path";
import { fileURLToPath } from "url";

const __filename   = fileURLToPath(import.meta.url);
const __dirname    = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const PYTHON_BIN     = path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe");
const PREDICT_SCRIPT = path.join(PROJECT_ROOT, "ml-module", "api", "predict.py");

// ── Real-world archetypes ──────────────────────────────────────────────────
const TEST_CASES = [
  {
    label:       "Verified celebrity (5M+ followers, 10yr account)",
    expectTier:  "Authentic",
    description: "Large verified creator — very high followers, few following, active liker",
    payload: {
      followers_count:       5_200_000,
      friends_count:         250,         // celebrities follow very few
      statuses_count:        2_800,
      favourites_count:      8_000,       // celebrities don't like much relative to following
      listed_count:          0,
      verified:              1,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      3_650,       // ~10 years old
      url:                   "https://example.com",
      description:           "Official account",
      screen_name:           "celebrity_official",
    },
  },
  {
    label:       "Mid-tier lifestyle influencer (320K followers, 8yr account)",
    expectTier:  "Authentic",
    description: "Established genuine creator — good follower/following ratio, active engagement",
    payload: {
      followers_count:       320_000,
      friends_count:         2_100,
      statuses_count:        2_200,
      favourites_count:      145_000,     // actively likes content — genuine signal
      listed_count:          0,
      verified:              0,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      2_800,       // ~8 years old
      url:                   "https://lifestyleblog.com",
      description:           "Lifestyle and travel creator",
      screen_name:           "lifestyle_priya",
    },
  },
  {
    label:       "Micro-influencer (22K followers, 4yr account)",
    expectTier:  "Authentic",
    description: "Small but genuine creator — balanced follow/following, consistent posts",
    payload: {
      followers_count:       22_000,
      friends_count:         18_500,      // micro-influencers often follow back a lot
      statuses_count:        650,
      favourites_count:      55_000,      // actively engaged — genuine signal
      listed_count:          0,
      verified:              0,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      1_460,       // ~4 years old
      url:                   null,
      description:           "Food and fitness creator",
      screen_name:           "fitfood_arjun",
    },
  },
  {
    label:       "Bought followers (85K followers, very few posts)",
    expectTier:  "Inauthentic",
    description: "Classic bought-followers pattern — high followers but barely posts or engages",
    payload: {
      followers_count:       85_000,
      friends_count:         180,         // follows few — doesn't need to follow-for-follow
      statuses_count:        42,          // only 42 posts despite 85K followers — major red flag
      favourites_count:      300,         // barely engages — strong bot signal
      listed_count:          0,
      verified:              0,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      420,         // ~14 months old
      url:                   null,
      description:           "Brand collaborations",
      screen_name:           "brand_creator99",
    },
  },
  {
    label:       "Follow-for-follow / engagement pod (28K followers)",
    expectTier:  "Suspicious",
    description: "Near-equal follow/following ratio — typical engagement pod behaviour",
    payload: {
      followers_count:       28_000,
      friends_count:         27_500,      // almost equal follow/following — engagement pod signal
      statuses_count:        380,
      favourites_count:      95_000,      // high likes given — reciprocal liking in pods
      listed_count:          0,
      verified:              0,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      900,         // ~2.5 years
      url:                   null,
      description:           "Photographer and creator",
      screen_name:           "photo_creator",
    },
  },
  {
    label:       "Obvious bot (1.2K followers, follows 7.8K, 8 posts)",
    expectTier:  "Inauthentic",
    description: "Classic bot pattern — follows far more than follows back, default profile, brand new",
    payload: {
      followers_count:       1_200,
      friends_count:         7_800,       // follows 6.5× more than its own followers — mass-follow bot
      statuses_count:        8,           // barely posted
      favourites_count:      0,           // zero engagement — automated account
      listed_count:          0,
      verified:              0,
      default_profile:       1,           // never customised profile
      default_profile_image: 1,           // no profile picture
      geo_enabled:           0,
      account_age_days:      30,          // only 1 month old
      url:                   null,
      description:           null,
      screen_name:           "user8827364910",
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────
function runPredict(payload) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, [PREDICT_SCRIPT], { cwd: PROJECT_ROOT });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Timed out after 30 s"));
    }, 30_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Exit ${code}: ${stderr.trim()}`));
        return;
      }
      try { resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error(`Bad JSON: ${stdout.trim()}`)); }
    });

    proc.on("error", (e) => { clearTimeout(timer); reject(e); });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

// Tier colour indicators for terminal output
function tierIcon(tier) {
  if (tier === "Authentic")  return "🟢";
  if (tier === "Suspicious") return "🟡";
  return "🔴";
}

async function main() {
  console.log("\n" + "=".repeat(65));
  console.log("  Real-World Archetype Test — predict.py");
  console.log("=".repeat(65));
  console.log("  Testing 6 realistic account archetypes\n");

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    console.log(`  ▶  ${tc.label}`);
    console.log(`     ${tc.description}`);
    try {
      const r = await runPredict(tc.payload);

      const tierMatch = r.risk_level === tc.expectTier;
      const icon      = tierIcon(r.risk_level);

      console.log(`     Score     : ${r.authenticity_score} / 100`);
      console.log(`     Tier      : ${icon}  ${r.risk_level}  (expected: ${tc.expectTier})`);
      console.log(`     bot_prob  : ${r.bot_probability.toFixed(4)}   anomaly: ${r.anomaly_score.toFixed(4)}   network: ${r.network_score.toFixed(4)}`);

      if (tierMatch) {
        console.log("     ✅  PASS — tier matches expected\n");
        passed++;
      } else {
        console.log("     ⚠️   MISMATCH — tier differs from expected (see notes)\n");
        failed++;
      }
    } catch (err) {
      console.error(`     ❌  ERROR — ${err.message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(65));
  console.log(`  Results: ${passed} matched expected  |  ${failed} differed`);
  console.log("=".repeat(65));
  console.log("\n  Note: Mismatches are not hard failures — they indicate model");
  console.log("  behaviour worth understanding (see output above).\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
