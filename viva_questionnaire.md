# Viva / Faculty Questionnaire — Fake Engagement Detection System

---

## SECTION 1: PROJECT OVERVIEW

**Q1. What problem does your project solve?**

> Influencer marketing is a $21+ billion industry. Brands/vendors spend billions partnering with social media creators, but roughly 15% of all influencer engagement is fake — bought followers, bot interactions, coordinated inauthentic behavior. There is no affordable, automated tool for small vendors to verify creator authenticity before signing deals. Our system automatically scores any creator's profile for fake engagement risk using machine learning and presents it as a mobile app that connects vendors with verified creators.

---

**Q2. What are the three phases of your system?**

> - **Phase 1 (ML Module):** Python pipeline that trains 3 ML models on the Cresci-2017 Twitter bot dataset and exposes a real-time prediction API.
> - **Phase 2 (Backend API):** Node.js/Express REST API that stores creator and vendor profiles in MongoDB, authenticates via Firebase, and calls the ML module when scoring is needed.
> - **Phase 3 (Mobile App):** React Native app for creators to register their profile and for vendors to browse, search, and contact creators.

---

**Q3. What is the tech stack?**

> | Layer | Technology |
> |---|---|
> | Mobile App | React Native 0.84 (TypeScript) |
> | Backend API | Node.js 20, Express 4, ES Modules |
> | Database | MongoDB Atlas (cloud), Mongoose ODM |
> | Authentication | Firebase Admin SDK (JWT verification) |
> | ML Engine | Python 3.11, scikit-learn 1.4.2 |
> | Deployment | Render.com (Docker container) |
> | Email | Nodemailer (Gmail SMTP) |

---

## SECTION 2: DATASET & PREPROCESSING

**Q4. What dataset did you use to train your models?**

> **Cresci-2017** — a publicly available Twitter bot dataset crawled in September 2015. It contains:
> - ~3,500 genuine (real) accounts — label 0
> - ~10,868 fake/bot accounts — label 1
> - **Total: 14,368 accounts**
>
> Bot categories included: social spambots (3 sets), traditional spambots (4 sets), and fake followers.

---

**Q5. What is class imbalance and how did you handle it?**

> Class imbalance means one class has far more samples than the other. Our dataset is ~75.6% fake and ~24.4% genuine. If ignored, the model learns to predict "fake" for everything and still gets 75% accuracy — which is meaningless.
>
> We handled it with `class_weight='balanced'` in the Random Forest, which automatically increases the penalty for misclassifying the minority class (genuine). We also used **stratified train-test splits** to ensure each split maintains the same 75/25 ratio.

---

**Q6. What features did you engineer? How many total?**

> **18 features total**, grouped into 5 categories:
>
> | Category | Features |
> |---|---|
> | Raw Counts (5) | statuses_count, followers_count, friends_count, favourites_count, listed_count |
> | Boolean Flags (4) | verified, default_profile, default_profile_image, geo_enabled |
> | Temporal (1) | account_age_days (days since account creation to 2015-09-01) |
> | Derived Ratios (4) | follower_following_ratio, activity_rate, engagement_proxy, tweet_to_followers |
> | Content Signals (4) | has_url, has_description, name_length, digits_in_name |
>
> Key engineered features:
> - `follower_following_ratio = followers / (following + 1)` — bots often mass-follow
> - `activity_rate = posts / (account_age_days + 1)` — bots post in bursts
> - `tweet_to_followers = posts / (followers + 1)` — low means possibly bought followers

---

**Q7. Why did you add +1 in the denominator for ratio calculations?**

> To avoid division by zero. If `following = 0`, then `followers / 0` would crash. Adding 1 to the denominator is a safe default — it slightly changes the ratio value but prevents undefined/infinity errors. This is standard practice in feature engineering.

---

**Q8. What is the reference date of 2015-09-01 used for?**

> Cresci-2017 data was crawled in September 2015. To compute `account_age_days` consistently (so that all accounts are measured up to the same point in time), we fix the reference date at 2015-09-01. This ensures the feature is reproducible — the same account always gets the same age regardless of when prediction is run. At inference time on the mobile app, we use the current date instead.

---

## SECTION 3: MACHINE LEARNING MODELS

**Q9. How many models did you train? What are they?**

> Three independent models:
> 1. **Random Forest Classifier** — supervised, predicts probability of being a bot
> 2. **Isolation Forest** — unsupervised anomaly detector, flags unusual profiles
> 3. **k-NN Network Similarity Graph** — graph-based clustering analysis
>
> Their scores are combined into a single **Authenticity Score (0–100)** using a weighted formula.

---

**Q10. Explain the Random Forest algorithm. Why did you choose it?**

> Random Forest is an **ensemble of decision trees**. Each tree is trained on a random bootstrap sample of the data and considers only a random subset of features at each split (`sqrt(18) ≈ 4` features). The final prediction is the majority vote (classification) or average (regression) across all trees.
>
> We chose it because:
> - Robust to overfitting (averaging many trees reduces variance)
> - Handles mixed feature types (booleans + continuous)
> - Provides feature importances
> - No need for extensive hyperparameter tuning
> - Achieved ROC-AUC of 0.9986 on this dataset

---

**Q11. What hyperparameters did you use for Random Forest?**

> ```python
> n_estimators      = 300    # 300 trees
> max_depth         = None   # Unlimited depth (controlled by min_samples)
> min_samples_split = 5      # Min 5 samples to split a node
> min_samples_leaf  = 2      # Min 2 samples in leaf
> max_features      = "sqrt" # √18 ≈ 4 features per split
> class_weight      = "balanced"  # handles class imbalance
> random_state      = 42     # reproducibility
> n_jobs            = -1     # use all CPU cores
> oob_score         = True   # out-of-bag validation
> ```

---

**Q12. How many epochs does Random Forest use?**

> Random Forest does **not use epochs**. Epochs are a concept from neural network training where the model sees the entire dataset multiple times. Random Forest is a tree-based method — each of the 300 trees is built once in a single pass. There is no iterative weight update process.

---

**Q13. What train/test split did you use?**

> **70% training / 15% validation / 15% test**, all stratified.
> - Training set: used to fit the model
> - Validation set: used for early monitoring and hyperparameter tuning
> - Test set: held out completely, used only for final evaluation
> - 5-fold cross-validation was also run on the training set

---

**Q14. What were the Random Forest accuracy metrics?**

> | Metric | Validation | Test (Final) |
> |---|---|---|
> | Accuracy | 98.47% | **98.75%** |
> | Precision | 99.32% | 99.33% |
> | Recall | 98.65% | 99.02% |
> | F1-Score | 98.99% | 99.17% |
> | ROC-AUC | 0.9957 | **0.9986** |
> | 5-fold CV F1 | — | 0.9907 ± 0.0009 |
> | OOB Score | 0.9866 | — |

---

**Q15. What is ROC-AUC and why is 0.9986 significant?**

> **ROC-AUC** (Receiver Operating Characteristic — Area Under Curve) measures how well the model separates the two classes across all possible classification thresholds.
> - AUC = 1.0 → perfect separation
> - AUC = 0.5 → random guessing
> - AUC = 0.9986 → the model correctly ranks 99.86% of fake-genuine account pairs
>
> It is preferred over accuracy because it is threshold-independent and robust to class imbalance.

---

**Q16. What is the difference between Precision and Recall?**

> - **Precision** = of all accounts flagged as bots, what % were actually bots. (99.33% means very few genuine accounts are wrongly flagged — low false positive rate)
> - **Recall** = of all actual bots, what % did we catch. (99.02% means we caught 99% of all real bots — low false negative rate)
> - **F1-Score** = harmonic mean of both = 2 × (P × R) / (P + R)
>
> For this project, both matter equally — we don't want to miss bots (recall) and we don't want to falsely flag genuine creators (precision).

---

**Q17. What is the most important feature in the Random Forest?**

> `favourites_count` (total likes given by the account) with **37.79%** importance — by far the strongest signal. Bots typically give very few or very many likes in unusual patterns. After that:
> 1. favourites_count: 37.79%
> 2. activity_rate: 17.33%
> 3. statuses_count: 15.29%
> 4. follower_following_ratio: 8.41%
> 5. followers_count: 6.07%

---

**Q18. What is Isolation Forest? How does it work?**

> **Isolation Forest** is an **unsupervised anomaly detection** algorithm. It randomly partitions the feature space by selecting random features and random split points. Anomalous points (outliers) are isolated quickly — they need fewer random cuts. Normal points need more cuts to isolate.
>
> The **anomaly score** is the average path length to isolation — shorter path = more anomalous.
>
> We trained it only on **genuine accounts** to learn what a "normal" profile looks like. Any account that deviates significantly from normal gets a high anomaly score.

---

**Q19. Why is Isolation Forest ROC-AUC only 0.6084? Is that a problem?**

> No, it is expected and by design. Isolation Forest struggles with **dense clusters** — bot armies in Cresci-2017 appear in tight clusters that the algorithm sees as "normal" because inliers. The recall is only 2.46%.
>
> However, it serves as a **supplementary signal** — it catches unusual genuine-looking accounts that slip past Random Forest. Its low weight (15%) in the ensemble reflects its limited discriminative power. The combination still improves overall robustness.

---

**Q20. What is the k-NN Network Analysis? Why did you use it without a real follower graph?**

> Since Cresci-2017 provides no actual edge lists (who follows whom), we built a **k-Nearest Neighbor similarity graph** in the 8-dimensional feature space. Accounts close to each other in feature space are connected by an edge (k=10 neighbors).
>
> The reasoning: bots in the same campaign tend to have similar features (same creation date, similar follower counts, no profile image). They form **dense clusters** in feature space with high clustering coefficients.
>
> Per-node score = `0.6 × clustering_coefficient + 0.4 × degree_centrality`
>
> High score = tightly connected to similar accounts = likely bot army.

---

**Q21. How is the final Authenticity Score calculated?**

> Weighted sum of three inverse-risk components:
>
> ```
> component_bot     = 0.55 × (1 - bot_probability)
> component_anomaly = 0.15 × (1 - anomaly_score)
> component_network = 0.30 × (1 - network_score)
>
> authenticity_score = round((sum of components) × 100)
> ```
>
> **Weight rationale:**
> - RF has ROC-AUC 0.9986 → highest trust → 55% weight
> - IF has ROC-AUC 0.6084 → lower trust → 15% weight
> - Network analysis → 30% weight (no separate ROC-AUC calibration)

---

**Q22. What are the three risk tiers?**

> | Score | Tier | Meaning |
> |---|---|---|
> | 80–100 | **Authentic** | Genuine creator, safe to partner |
> | 60–79 | **Suspicious** | Moderate signals, investigate further |
> | 0–59 | **Inauthentic** | Strong fake signals, do not partner |

---

**Q23. What are heuristic rule overrides? Why do you need them?**

> Cresci-2017 was collected in 2015. Modern fake engagement tactics differ from 2015 bots. The 4 heuristic rules patch gaps the ML models miss:
>
> | Rule | Pattern | Fix |
> |---|---|---|
> | **Rule 1 (Celebrity)** | ratio > 1000 AND followers > 50K | Cap network_score ≤ 0.25 (graph unreliable for celebrities) |
> | **Rule 2 (Bought Followers)** | followers > 50K, low posts, likes < 8% of followers | Raise bot_probability ≥ 0.60 |
> | **Rule 3 (Extreme Ratio)** | ratio > 2000, posts very low, not verified | Raise bot_probability ≥ 0.50 |
> | **Rule 4 (Mass-Follow Bot)** | following ≥ 70% of followers, near-zero posts | Raise bot_probability ≥ 0.85 |
>
> This is a **Hybrid ML + Rule-Based** architecture — data-driven base with human-defined overrides for known gaps.

---

## SECTION 4: BACKEND API

**Q24. How is the backend structured?**

> It follows the **MVC (Model-View-Controller)** pattern with a service layer:
> - **Models** — Mongoose schemas defining data structure (Creator, User, PromotionRequest)
> - **Controllers** — Business logic, orchestrate request handling
> - **Services** — Reusable functions (ML scoring, email sending)
> - **Routes** — Map HTTP endpoints to controllers
> - **Middleware** — Cross-cutting concerns (auth, error handling)

---

**Q25. What are the main API modules and their endpoints?**

> **Creators**
> - `POST /api/creators` — Register creator profile (triggers ML scoring)
> - `GET /api/creators` — List all creators (with filters & pagination)
> - `GET /api/creators/:id` — Get single creator
> - `GET /api/creators/:id/score` — Get full ML score breakdown
> - `PUT /api/creators` — Update own profile (re-scores if stats changed)
>
> **Vendors**
> - `GET /api/vendors/creators` — Search creators (keyword + filters)
> - `GET /api/vendors/creators/:id` — View creator details
>
> **Promotions**
> - `POST /api/promotions` — Vendor sends deal request
> - `GET /api/promotions/creator` — Creator views incoming requests
> - `PUT /api/promotions/status` — Creator accepts/rejects
> - `GET /api/promotions/vendor` — Vendor views sent requests
>
> **Auth**
> - `GET /api/auth/me` — Get current user identity and role

---

**Q26. How does authentication work?**

> We use **Firebase Authentication** with **JWT (JSON Web Token)**:
>
> 1. User signs up/logs in via Firebase (mobile app)
> 2. Firebase issues an **ID token** (JWT) to the client
> 3. Client sends token in every API request header: `Authorization: Bearer <token>`
> 4. Backend middleware (`firebaseAuth.middleware.js`) calls `firebase.auth().verifyIdToken(token)`
> 5. Firebase Admin SDK validates the signature and expiry
> 6. If valid, `req.user = { uid, email }` is populated and request proceeds
> 7. If invalid/missing, HTTP 401 is returned

---

**Q27. What is the difference between a Creator and a Vendor in the system?**

> | Property | Creator | Vendor |
> |---|---|---|
> | Mongo Collection | `creators` | `users` |
> | Role | "creator" | "vendor" |
> | Purpose | Register profile, receive scoring | Browse creators, send deal requests |
> | Key Fields | socialStats, authenticityScore, mlDetails | businessName, industry |
> | Auth Endpoint | Firebase (both use same Firebase project) | Firebase |

---

**Q28. What is the Creator Mongoose schema? What fields matter for ML?**

> The `socialStats` sub-document maps directly to ML features:
>
> | MongoDB Field | ML Feature | Description |
> |---|---|---|
> | socialStats.totalFollowers | followers_count | Follower count |
> | socialStats.totalFollowing | friends_count | Following count |
> | socialStats.totalPosts | statuses_count | Post count |
> | socialStats.totalLikes | favourites_count | Total likes given |
> | socialStats.accountCreatedAt | account_age_days | Days since account creation |
> | socialStats.isVerified | verified | Verification status |
> | socialStats.hasProfileImage | default_profile_image (inverted) | Has custom avatar |
> | socialStats.hasDescription | has_description | Has bio |
> | socialStats.hasUrl | has_url | Has website link |
> | socialStats.screenName | screen_name / name_length / digits_in_name | Username signals |

---

**Q29. How does ML scoring work end-to-end when a creator registers?**

> 1. Creator submits profile via mobile app (POST /api/creators)
> 2. Controller saves profile to MongoDB (synchronous — user gets immediate response)
> 3. Controller triggers ML scoring **asynchronously (fire-and-forget)**:
>    ```js
>    getAuthenticityScore(creator).catch(err => console.error(err));
>    ```
> 4. ML service maps `socialStats` → Python feature dict
> 5. Spawns Python subprocess: `python3 -u ml-module/api/predict.py`
> 6. Sends JSON payload to `stdin`, reads JSON result from `stdout`
> 7. Parses result, updates `creator.authenticityScore`, `creator.riskLevel`, `creator.mlDetails`
> 8. Saves updated creator to MongoDB
>
> The creator doesn't wait for scoring (could take 30s+). Score appears when vendors view the profile.

---

**Q30. Why do you use child_process.spawn instead of calling Python directly?**

> The backend is Node.js (JavaScript) and the ML models are trained in Python with scikit-learn. There is no efficient way to run scikit-learn models natively in Node.js. **`spawn`** creates a separate Python process that loads the models, runs the prediction, and returns the result via stdin/stdout JSON. This keeps both languages in their native environments without rewriting the entire ML pipeline in JavaScript.

---

**Q31. What happens if the ML service fails or times out?**

> The service catches all errors gracefully:
> ```javascript
> return {
>   authenticity_score: null,
>   risk_level: null,
>   error: "ML service unavailable"
> };
> ```
> The creator profile is still saved without a score. The API returns HTTP 503 with `message: "Authenticity scoring is temporarily unavailable"`. The creator can be rescored later by calling `GET /api/creators/:id/score?refresh=true`.
> The timeout is **120 seconds** (2 minutes) to account for Render's cold-start time when loading scikit-learn models.

---

**Q32. What is caching in the ML service?**

> Once a creator is scored, the result is stored in MongoDB (`authenticityScore`, `riskLevel`, `mlDetails`). On subsequent requests, the service checks if a score already exists and returns the cached result without spawning Python again. The `forceRefresh=true` query parameter bypasses the cache and triggers a fresh prediction — useful when a creator updates their social stats.

---

**Q33. What is pagination and how is it implemented?**

> Pagination splits large result sets into pages so the mobile app doesn't load 10,000 creators at once.
> ```javascript
> const page  = parseInt(req.query.page)  || 1;
> const limit = parseInt(req.query.limit) || 10;
> const skip  = (page - 1) * limit;
>
> creators = await Creator.find(filter).skip(skip).limit(limit);
> ```
> Default: 10 creators per page. Clients request `?page=2&limit=20` etc.

---

**Q34. What filters does the creator search support?**

> - `niche` — category (fitness, tech, travel...)
> - `country` — creator location
> - `minPrice` / `maxPrice` — price per post range
> - `minScore` — minimum authenticity score (e.g., only show creators ≥ 70)
> - `keyword` — regex search on name and niche (vendor search)

---

## SECTION 5: DATABASE DESIGN

**Q35. Why did you choose MongoDB over SQL (MySQL/PostgreSQL)?**

> 1. **Flexible schema** — Creator profiles have varying platform combinations (some have Instagram only, some have both YouTube and Instagram). SQL would need nullable columns or extra tables; MongoDB stores it naturally as nested documents.
> 2. **Embedded documents** — `socialStats` and `mlDetails` are logically part of the creator document. In SQL they'd need a separate table with joins.
> 3. **Atlas cloud hosting** — Free tier, globally distributed, no server management.
> 4. **Mongoose ODM** — Easy schema definition and validation in Node.js.

---

**Q36. What indexes did you create and why?**

> ```javascript
> uid:               unique index  → fast lookup by Firebase UID
> niche:             index         → filter queries
> country:           index         → filter queries
> authenticityScore: index (desc)  → sort by score descending
> pricePerPost:      index         → price range queries
> ```
> Without indexes, MongoDB performs a full collection scan (O(n)) for every query. With indexes, lookups are O(log n).

---

**Q37. What is Mongoose and why use it with MongoDB?**

> **Mongoose** is an ODM (Object Document Mapper) — it adds schema validation, data type casting, and model-based querying on top of raw MongoDB. Benefits:
> - Define required fields, types, and constraints (e.g., `min: 0` for price)
> - Auto-timestamps (`createdAt`, `updatedAt`)
> - Virtual methods, hooks (pre/post save)
> - `.populate()` for joining related collections
> - Type safety in JavaScript

---

## SECTION 6: DEPLOYMENT

**Q38. How is the system deployed?**

> | Component | Platform | Details |
> |---|---|---|
> | Backend | Render.com | Docker container (free tier) |
> | MongoDB | MongoDB Atlas | Cloud database (free M0 cluster) |
> | Firebase | Google Cloud | Auth & notifications |
> | Mobile App | APK file | Sideloaded via USB/file transfer |
>
> The Render deployment uses a **Dockerfile** at the project root. Docker image includes both Python 3.11 (for ML) and Node.js 20 (for the API). Render auto-redeploys on every `git push`.

---

**Q39. Why Docker for deployment?**

> Our project needs both Python and Node.js in the same environment. Cloud platforms by default pick one runtime. Docker lets us control the exact environment — we install Python 3.11, Node.js 20, and all dependencies inside a single container image. This eliminates "works on my machine" problems and version conflicts.

---

**Q40. What is the Render free tier limitation and how do you handle it?**

> Render's free tier **sleeps the container after 15 minutes of inactivity**. The first request after sleeping triggers a cold start (~30–50 seconds). Before a live demo:
> 1. Open `https://fake-engage-detect-1.onrender.com/api/auth/me` in a browser to wake it
> 2. Wait for response, then demo normally
>
> The ML scoring has a 120-second timeout specifically to handle the extra delay of loading scikit-learn models from disk on a cold-started container.

---

## SECTION 7: SECURITY

**Q41. How do you secure the API endpoints?**

> Three layers:
> 1. **Firebase JWT Verification** — Every protected route runs `firebaseAuth.middleware.js` which validates the token
> 2. **Role Authorization** — `authorizeRoles("creator")` or `authorizeRoles("vendor")` checks that the authenticated user is registered in the correct collection
> 3. **Data Hiding** — Creator email is hidden from vendor API responses; `socialStats` and `mlDetails` are excluded from list views

---

**Q42. What is JWT and why is it stateless?**

> JWT (JSON Web Token) is a self-contained token with 3 parts: header, payload (claims like uid, email, expiry), and signature. The server verifies the signature using Firebase's public key — it doesn't need to store sessions in a database. This makes it **stateless** — any server instance can verify any token without shared session storage, enabling horizontal scaling.

---

**Q43. What environment variables are used and why?**

> Sensitive values like database credentials and API keys are stored in `.env` files, not in code:
> ```
> MONGO_URI      — MongoDB connection string with username/password
> FIREBASE_*     — Firebase service account credentials
> EMAIL_*        — Gmail credentials for notifications
> PYTHON_BIN     — Python executable path (differs per environment)
> ML_TIMEOUT_MS  — Configurable timeout for ML subprocess
> ```
> This prevents secrets from being committed to GitHub and allows different values per environment (development vs. production).

---

## SECTION 8: MOBILE APP

**Q44. What is React Native and why use it?**

> React Native is a framework for building cross-platform mobile apps using JavaScript/TypeScript. A single codebase compiles to native Android and iOS code. Benefits:
> - Faster development (one codebase for both platforms)
> - Near-native performance (actual native components, not WebViews)
> - Large ecosystem (npm packages)
> - TypeScript support for type safety

---

**Q45. How does the mobile app authenticate users?**

> 1. User enters email/password on login screen
> 2. App calls Firebase REST API (`identitytoolkit.googleapis.com`) with credentials
> 3. Firebase returns an ID token (JWT)
> 4. Token is stored securely on device
> 5. Every API call to the backend includes: `Authorization: Bearer <token>`
> 6. Token expires after 1 hour; Firebase can refresh it automatically

---

## SECTION 9: LIMITATIONS & FUTURE WORK

**Q46. What are the main limitations of your system?**

> 1. **Dataset Age** — Cresci-2017 is from 2015. Modern AI-generated profiles and deepfake accounts are not represented. The 4 heuristic rules partially compensate.
> 2. **Twitter-Specific** — All features come from Twitter metadata. Applying to Instagram/TikTok requires retraining on platform-specific data.
> 3. **Isolation Forest Performance** — ROC-AUC 0.6084 is weak; the IF is sensitive to dense bot clusters appearing as inliers.
> 4. **Single Snapshot** — We analyze one profile snapshot. A gradual follower spike over time (suddenly buying 50K followers) is not detected without time-series analysis.
> 5. **No Graph Edges** — Our "network analysis" uses feature similarity, not actual follower/following relationships. Real graph data would be far stronger.
> 6. **Cold-Start Problem** — Very new accounts have limited data; scores are unreliable.
> 7. **Render Sleep** — Free tier sleeps after 15 min; unsuitable for production use.

---

**Q47. What would you improve with more time (Phase 4)?**

> 1. **Multi-platform support** — Retrain on Instagram/TikTok bot datasets
> 2. **Time-series features** — Follower growth velocity, engagement decay patterns
> 3. **Actual graph data** — Use real follower/following relationships for network analysis
> 4. **SHAP explainability** — Show per-account feature contributions so creators understand their score
> 5. **Feedback loop** — Let vendors flag false positives/negatives to improve the model
> 6. **Real-time alerts** — Notify vendors when a saved creator's score drops significantly
> 7. **Quarterly retraining** — Regularly update with newly labeled bot accounts

---

## SECTION 10: CONCEPTUAL QUESTIONS

**Q48. What is the difference between supervised and unsupervised learning? Give examples from your project.**

> - **Supervised learning**: Training data has labels (we know which accounts are bots). The model learns to map features → labels. **Example: Random Forest** — trained on labeled Cresci-2017 data.
> - **Unsupervised learning**: No labels. The model finds structure/patterns in the data itself. **Example: Isolation Forest** — trained only on genuine accounts to learn "normal" behavior; anomalies are detected without explicit bot labels.

---

**Q49. What is overfitting? How did you check for it?**

> **Overfitting** occurs when a model memorizes the training data and performs well on training but poorly on unseen data. We checked via:
> 1. **Train vs. Test gap** — Training accuracy ≈ test accuracy (98.47% vs 98.75%) — small gap, no overfitting
> 2. **5-fold cross-validation** — F1 = 0.9907 ± 0.0009 — extremely stable across all folds
> 3. **OOB Score = 0.9866** — Out-of-bag score (built-in RF validation on unseen bootstrap samples) matches test score

---

**Q50. Why use an ensemble approach (3 models) instead of just Random Forest?**

> The 3 models capture different aspects of fake behavior:
> - RF sees labeled patterns in features → strong but limited to training distribution
> - IF detects profiles that deviate from "normal" → catches edge cases RF misses
> - Network analysis identifies accounts clustered with similar bots → graph-level signal
>
> No single model is perfect. Combining them reduces both variance (averaging reduces noise) and bias (different models catch different patterns). The final score is more reliable and robust than any individual model.

---

**Q51. What is the difference between accuracy and F1-score? When would accuracy be misleading?**

> **Accuracy** = correct predictions / total predictions. On our imbalanced dataset (75.6% bots), a model that predicts "bot" for everything gets 75.6% accuracy — which is useless.
>
> **F1-Score** = harmonic mean of Precision and Recall = 2PR/(P+R). It penalizes both false positives and false negatives equally, making it a better metric for imbalanced datasets.
>
> **Always use F1 (or ROC-AUC) when classes are imbalanced.**

---

**Q52. What is a REST API? What HTTP methods do you use?**

> **REST** (Representational State Transfer) is an architectural style where resources are exposed as URLs and operated on via standard HTTP methods:
>
> | Method | Used For | Example |
> |---|---|---|
> | GET | Retrieve data | `GET /api/creators` |
> | POST | Create new resource | `POST /api/creators` |
> | PUT | Update existing resource | `PUT /api/creators` |
> | DELETE | Remove resource | (not used in this project) |
>
> Responses are JSON. HTTP status codes convey outcome: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 503 (Service Unavailable).

---

**Q53. Explain the `fire-and-forget` pattern used in creator registration.**

> When a creator registers, the API saves the profile and immediately returns 201 to the client. ML scoring runs **asynchronously in the background** — the client doesn't wait for it:
> ```javascript
> getAuthenticityScore(creator).catch(err => console.error(err));
> // No await — control returns immediately
> res.status(201).json({ success: true, creator });
> ```
> This improves user experience (fast registration) while scoring happens in the background (can take 30–120 seconds). The score appears on subsequent page loads.

---

**Q54. What is the purpose of Middleware in Express?**

> Middleware are functions that execute between receiving a request and sending a response. They follow the pattern `(req, res, next) => {}`. Common uses:
> 1. **Authentication** — verify token before any protected route
> 2. **Authorization** — check role after authentication
> 3. **Error handling** — catch errors from all routes in one place
> 4. **Logging** — record request details
> 5. **CORS** — allow cross-origin requests from the mobile app
>
> Middleware chains: each calls `next()` to pass to the next layer or `res.json()` to stop.

---

**Q55. If a creator has 500K followers and only 50 posts, what score will your system give and why?**

> With 500K followers, 50 posts, low following:
> - `tweet_to_followers = 50/500000 = 0.0001` — extremely low
> - `ratio = 500000/following` — depends on following count
> - **Rule 2** will trigger: followers > 50K, tweet_to_f < 0.002 → bot_probability ≥ 0.60
> - **Rule 3** or **Rule 1** may also trigger depending on the ratio
> - Score will likely be **Suspicious (60–70)** if other features are normal
> - If following is also very low (e.g., 20), Rule 3 triggers too, pushing toward Inauthentic
>
> This is the "bought followers" modern pattern our heuristic rules specifically catch.

---

*Document generated for academic viva/project defense — covers all technical concepts in the Fake Engagement Detection System.*
