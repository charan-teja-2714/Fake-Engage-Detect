/**
 * test-ml.js  —  Standalone ML integration test
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the full chain:  ml.service.js  →  predict.py  →  authenticity score
 * WITHOUT needing a running server, Firebase token, or MongoDB connection.
 *
 * Run from the backend folder:
 *   node test-ml.js
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

// ── Test cases ────────────────────────────────────────────────────────────────
const TEST_CASES = [
  {
    label: "Genuine influencer (high followers, old account, verified)",
    payload: {
      followers_count:       85000,
      friends_count:         320,
      statuses_count:        1200,
      favourites_count:      62000,   // active engagement — liked 62K posts over 5 years
      listed_count:          0,
      verified:              1,
      default_profile:       0,
      default_profile_image: 0,
      geo_enabled:           0,
      account_age_days:      1800,
      url:                   "https://riyasharma.com",
      description:           "Fashion creator based in Mumbai",
      screen_name:           "riya_sharma",
    },
  },
  {
    label: "New creator (small account, no profile image)",
    payload: {
      followers_count:       4200,
      friends_count:         3900,
      statuses_count:        85,
      favourites_count:      3100,    // moderate engagement — typical for a 3-month-old account
      listed_count:          0,
      verified:              0,
      default_profile:       0,
      default_profile_image: 1,       // no custom image — bot signal
      geo_enabled:           0,
      account_age_days:      90,
      url:                   null,
      description:           null,
      screen_name:           "user12345678",
    },
  },
  {
    label: "Suspected bot (zero posts, zero following, default profile)",
    payload: {
      followers_count:       500,
      friends_count:         0,
      statuses_count:        0,
      favourites_count:      0,       // bots do not engage — zero likes
      listed_count:          0,
      verified:              0,
      default_profile:       1,
      default_profile_image: 1,
      geo_enabled:           0,
      account_age_days:      5,
      url:                   null,
      description:           null,
      screen_name:           "bot9918273645",
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

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  ML Integration Test — predict.py via child_process");
  console.log("=".repeat(60));
  console.log(`  Python  : ${PYTHON_BIN}`);
  console.log(`  Script  : ${PREDICT_SCRIPT}`);
  console.log("=".repeat(60) + "\n");

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    console.log(`  ▶  ${tc.label}`);
    try {
      const result = await runPredict(tc.payload);

      if (typeof result.authenticity_score !== "number") {
        throw new Error("Missing authenticity_score in response");
      }

      console.log(`     authenticity_score : ${result.authenticity_score} / 100`);
      console.log(`     risk_level         : ${result.risk_level}`);
      console.log(`     bot_probability    : ${result.bot_probability.toFixed(4)}`);
      console.log(`     anomaly_score      : ${result.anomaly_score.toFixed(4)}`);
      console.log(`     network_score      : ${result.network_score.toFixed(4)}`);
      console.log("     ✅  PASS\n");
      passed++;
    } catch (err) {
      console.error(`     ❌  FAIL — ${err.message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log(`  Results: ${passed} passed  |  ${failed} failed`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
