/**
 * ml.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the Python ML module (ml-module/api/predict.py) via child_process
 * and returns a full authenticity report for a creator.
 *
 * Flow:
 *   1. Accept a Creator document (or ID string).
 *   2. Return cached score if already scored and forceRefresh is false.
 *   3. Map creator.socialStats → ML feature dict.
 *   4. Spawn Python (venv) → pipe JSON to stdin → read JSON from stdout.
 *   5. Persist the full ML result to the Creator document.
 *   6. Return the result.
 *
 * ML output shape (from predict.py):
 *   {
 *     "bot_probability"   : float,
 *     "anomaly_score"     : float,
 *     "network_score"     : float,
 *     "authenticity_score": int,
 *     "risk_level"        : "Safe" | "Monitor" | "High Risk",
 *     "component_bot"     : float,
 *     "component_anomaly" : float,
 *     "component_network" : float
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawn }       from "child_process";
import path            from "path";
import { fileURLToPath } from "url";
import Creator         from "../modules/creators/creator.model.js";

// ── Resolve paths ─────────────────────────────────────────────────────────────
// This file:   backend/src/services/ml.service.js
// Project root: three levels up  (services/ → src/ → backend/ → root)
const __filename    = fileURLToPath(import.meta.url);
const __dirname     = path.dirname(__filename);
const PROJECT_ROOT  = path.resolve(__dirname, "../../..");

// Python binary inside the venv (Windows path)
// const PYTHON_BIN     = path.join(PROJECT_ROOT, "venv", "Scripts", "python.exe");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

// predict.py entry point
const PREDICT_SCRIPT = path.join(PROJECT_ROOT, "ml-module", "api", "predict.py");

// Timeout for the Python process (default 60s for Render's slower environment)
const ML_TIMEOUT_MS  = Number(process.env.ML_TIMEOUT_MS ?? 60_000);


// ─────────────────────────────────────────────────────────────────────────────
// Feature mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the dict that predict.py expects from a Creator document.
 *
 * Feature mapping:
 *   socialStats.totalFollowers   → followers_count
 *   socialStats.totalFollowing   → friends_count
 *   socialStats.totalPosts       → statuses_count
 *   socialStats.totalLikes       → favourites_count  (lifetime likes/reactions given)
 *   socialStats.accountCreatedAt → account_age_days  (days to now)
 *   socialStats.isVerified       → verified
 *   socialStats.hasProfileImage  → default_profile_image (inverted: no image = 1)
 *   socialStats.hasDescription   → has_description
 *   socialStats.hasUrl           → has_url
 *   socialStats.screenName       → screen_name
 *
 * Fields not collected (set to safe defaults matching genuine-account norms):
 *   listed_count    → 0
 *   default_profile → 0
 *   geo_enabled     → 0
 */
function buildMLPayload(creator) {
  const s = creator.socialStats ?? {};

  // Account age in whole days from accountCreatedAt to now
  let accountAgeDays = 0;
  if (s.accountCreatedAt) {
    const msPerDay     = 86_400_000;
    accountAgeDays     = Math.max(
      0,
      Math.floor((Date.now() - new Date(s.accountCreatedAt).getTime()) / msPerDay)
    );
  }

  return {
    followers_count:       s.totalFollowers  ?? 0,
    friends_count:         s.totalFollowing  ?? 0,
    statuses_count:        s.totalPosts      ?? 0,
    favourites_count:      s.totalLikes      ?? 0,   // lifetime likes/reactions given by this account
    listed_count:          0,       // not applicable outside Twitter
    verified:              s.isVerified       ? 1 : 0,
    default_profile:       0,       // assume creators have customised profiles
    default_profile_image: s.hasProfileImage  ? 0 : 1,   // 1 = no custom image = bot signal
    geo_enabled:           0,
    account_age_days:      accountAgeDays,
    url:                   s.hasUrl          ? "https://example.com" : null,
    description:           s.hasDescription  ? creator.name           : null,
    screen_name:           s.screenName      || creator.name           || "creator",
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Python subprocess
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spawn the Python predict script, write the payload as JSON to stdin,
 * and resolve with the parsed JSON result from stdout.
 *
 * @param {object} payload  Feature dict matching predict.py's expected keys.
 * @returns {Promise<object>}
 */
function callPredictScript(payload) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, ["-u", PREDICT_SCRIPT], {
      cwd: PROJECT_ROOT,   // so relative imports inside predict.py resolve correctly
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    // Kill on timeout
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`ML prediction timed out after ${ML_TIMEOUT_MS} ms`));
    }, ML_TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        console.error(`[mlService] Python process exited with code ${code}`);
        console.error(`[mlService] Python stderr:`, stderr.trim());
        console.error(`[mlService] Python stdout:`, stdout.trim());
        reject(
          new Error(`predict.py exited ${code}: ${stderr.trim() || "unknown error"}`)
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`Failed to parse ML output: "${stdout.trim()}"`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Could not spawn Python: ${err.message}`));
    });

    // Send payload and close stdin so predict.py's sys.stdin.read() returns
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a creator's profile for fake-engagement risk.
 *
 * @param {string|object} creatorOrId  Creator Mongoose document OR ObjectId string.
 * @param {boolean}       forceRefresh Bypass cache and always call predict.py.
 *
 * @returns {Promise<{
 *   authenticity_score : number | null,
 *   risk_level         : string | null,
 *   bot_probability    : number | null,
 *   anomaly_score      : number | null,
 *   network_score      : number | null,
 *   component_bot      : number | null,
 *   component_anomaly  : number | null,
 *   component_network  : number | null,
 *   cached             : boolean,
 *   error ?            : string,
 * }>}
 */
export const getAuthenticityScore = async (
  creatorOrId,
  forceRefresh = false
) => {
  // ── 1. Resolve creator document ──────────────────────────────────────────
  let creator;
  if (
    typeof creatorOrId === "string" ||
    creatorOrId?.constructor?.name === "ObjectId"
  ) {
    creator = await Creator.findById(creatorOrId);
  } else {
    creator = creatorOrId;
  }

  if (!creator) throw new Error("Creator not found");

  // ── 2. Return cached result if available ─────────────────────────────────
  if (
    !forceRefresh &&
    creator.authenticityScore !== null &&
    creator.riskLevel         !== null
  ) {
    return {
      authenticity_score : creator.authenticityScore,
      risk_level         : creator.riskLevel,
      bot_probability    : creator.mlDetails?.bot_probability ?? null,
      anomaly_score      : creator.mlDetails?.anomaly_score   ?? null,
      network_score      : creator.mlDetails?.network_score   ?? null,
      component_bot      : null,
      component_anomaly  : null,
      component_network  : null,
      cached             : true,
    };
  }

  // ── 3. Build payload and call Python ──────────────────────────────────────
  try {
    const payload = buildMLPayload(creator);
    const result  = await callPredictScript(payload);

    // ── 4. Persist result to MongoDB ─────────────────────────────────────
    creator.authenticityScore = result.authenticity_score;
    creator.riskLevel         = result.risk_level;
    creator.mlDetails         = {
      bot_probability : result.bot_probability,
      anomaly_score   : result.anomaly_score,
      network_score   : result.network_score,
      scoredAt        : new Date(),
    };
    await creator.save();

    return { ...result, cached: false };
  } catch (error) {
    console.error("[mlService] Prediction failed:", error.message);
    return {
      authenticity_score : null,
      risk_level         : null,
      bot_probability    : null,
      anomaly_score      : null,
      network_score      : null,
      component_bot      : null,
      component_anomaly  : null,
      component_network  : null,
      cached             : false,
      error              : "ML service unavailable",
    };
  }
};
