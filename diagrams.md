# System Diagrams — Fake Engagement Detection & Authenticity Scoring System

All diagrams use [Mermaid](https://mermaid.js.org/) syntax.  
Render them in: VS Code (Mermaid Preview extension) · GitHub · [mermaid.live](https://mermaid.live)

---

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph Client["📱 Client Layer — React Native (Expo)"]
        MOB[Mobile App<br/>MobileAppV2]
        subgraph Screens["Screens"]
            AUTH_S[Auth Screens<br/>Login / Register / RoleSelect]
            CR_S[Creator Screens<br/>Dashboard / Registration / Deals / EditProfile]
            VEN_S[Vendor Screens<br/>Browse / Saved / Deals / SendProposal]
        end
        subgraph APIs["API Layer (Axios)"]
            AUTH_A[auth.api.ts]
            CREATOR_A[creator.api.ts]
            VENDOR_A[vendor.api.ts]
            PROMO_A[promotion.api.ts]
        end
    end

    subgraph Backend["🖥️ Backend Layer — Node.js / Express (Port 5000)"]
        subgraph Middleware["Middleware"]
            FBMW[Firebase Auth Middleware]
            ROLEMW[Role Middleware]
        end
        subgraph Routes["Routes"]
            R_AUTH[/api/auth]
            R_CREATOR[/api/creators]
            R_USER[/api/users]
            R_VENDOR[/api/vendors]
            R_PROMO[/api/promotions]
        end
        subgraph Controllers["Controllers"]
            C_AUTH[Auth Controller]
            C_CREATOR[Creator Controller]
            C_USER[Users Controller]
            C_VENDOR[Vendor Controller]
            C_PROMO[Promotion Controller]
        end
        ML_SVC[ML Service<br/>ml.service.js<br/>child_process.spawn]
    end

    subgraph MLModule["🐍 ML Module — Python"]
        PREDICT[predict.py<br/>stdin → stdout]
        RF[Random Forest<br/>classifier.pkl]
        IF[Isolation Forest<br/>anomaly_model.pkl]
        NET[Network Analysis<br/>k-NN Graph]
        SCORE[Authenticity Score<br/>Aggregator]
    end

    subgraph DataLayer["🗄️ Data Layer"]
        MONGO[(MongoDB Atlas<br/>Users · Creators · Promotions)]
        FB_AUTH[(Firebase Auth<br/>UID / JWT Tokens)]
    end

    subgraph External["☁️ External Services"]
        RENDER[Render.com<br/>Deployment Host]
    end

    MOB --> AUTH_A & CREATOR_A & VENDOR_A & PROMO_A
    AUTH_A & CREATOR_A & VENDOR_A & PROMO_A --> FBMW
    FBMW --> ROLEMW --> Routes
    R_AUTH --> C_AUTH
    R_CREATOR --> C_CREATOR
    R_USER --> C_USER
    R_VENDOR --> C_VENDOR
    R_PROMO --> C_PROMO
    C_CREATOR --> ML_SVC
    ML_SVC -->|JSON via stdin| PREDICT
    PREDICT --> RF & IF & NET --> SCORE
    SCORE -->|JSON via stdout| ML_SVC
    C_AUTH & C_CREATOR & C_USER & C_VENDOR & C_PROMO --> MONGO
    FBMW -->|verify token| FB_AUTH
    Backend --> RENDER
```

---

## 2. DFD — Level 1

```mermaid
graph TB
    %% External Entities
    CREATOR([👤 Creator])
    VENDOR([🏢 Vendor])
    FIREBASE([🔥 Firebase Auth])
    MLENGINE([🐍 Python ML Engine])

    %% Processes
    P1[1.0\nAuthenticate\nUser]
    P2[2.0\nManage Creator\nProfile]
    P3[3.0\nScore Creator\nAuthenticity]
    P4[4.0\nSearch &\nBrowse Creators]
    P5[5.0\nManage\nDeals / Proposals]
    P6[6.0\nSave\nCreators]

    %% Data Stores
    DS1[(D1: Users /\nVendors Store)]
    DS2[(D2: Creators\nStore)]
    DS3[(D3: Promotions\nStore)]

    %% Creator flows
    CREATOR -->|Email + Password| P1
    P1 -->|Firebase JWT Token| FIREBASE
    FIREBASE -->|Verified UID| P1
    P1 -->|Auth Token + Role| CREATOR

    CREATOR -->|Profile Data\nsocialStats, niche, price| P2
    P2 -->|Store Creator Profile| DS2
    DS2 -->|Creator Record| P2
    P2 -->|Profile Confirmation| CREATOR

    P2 -->|socialStats payload| P3
    P3 -->|18 ML Features| MLENGINE
    MLENGINE -->|Authenticity Score\nbot_prob, anomaly, network| P3
    P3 -->|Update Score + Tier| DS2
    P3 -->|Score Card| CREATOR

    CREATOR -->|View/Accept/Reject Proposal| P5
    P5 -->|Updated Status| DS3
    DS3 -->|Proposal Details| P5
    P5 -->|Proposal Status| CREATOR

    %% Vendor flows
    VENDOR -->|Email + Password| P1
    P1 -->|Auth Token + Role| VENDOR

    VENDOR -->|Business Name\nIndustry, Country| P1
    P1 -->|Store Vendor| DS1

    VENDOR -->|Filter: niche, country\nprice, min score| P4
    P4 -->|Query Creators| DS2
    DS2 -->|Filtered Creator List| P4
    P4 -->|Paginated Results + Scores| VENDOR

    VENDOR -->|creatorId| P6
    P6 -->|Update savedCreators| DS1
    P6 -->|Saved Confirmation| VENDOR

    VENDOR -->|Campaign Title, Message\nBudget, Contact Email| P5
    P5 -->|Store Proposal| DS3
    P5 -->|Proposal Sent Confirmation| VENDOR
```

---

## 3. Use Case Diagram

```mermaid
graph TB
    %% Actors
    CR(["👤\nCreator"])
    VN(["🏢\nVendor"])
    ML(["🐍\nML Engine"])
    FB(["🔥\nFirebase Auth"])

    subgraph SYS["  ── Fake Engagement Detection System ──  "]

        subgraph AUTH["Authentication"]
            UC1("Register Account")
            UC2("Login")
            UC3("Select Role")
        end

        subgraph CREATOR_UC["Creator Use Cases"]
            UC4("Create Creator Profile")
            UC5("View Authenticity Score")
            UC6("Refresh ML Score")
            UC7("Edit Creator Profile")
            UC8("View Incoming Deal Proposals")
            UC9("Accept Deal Proposal")
            UC10("Reject Deal Proposal")
        end

        subgraph VENDOR_UC["Vendor Use Cases"]
            UC11("Register as Vendor")
            UC12("Browse Creators")
            UC13("Filter Creators\n(niche / country / price / score)")
            UC14("View Creator Detail\n& ML Score Breakdown")
            UC15("Send Deal Proposal")
            UC16("Edit Pending Proposal")
            UC17("Delete Pending Proposal")
            UC18("Track Sent Proposals")
            UC19("Save / Bookmark Creator")
            UC20("View Saved Creators")
        end

        %% include / extend relationships
        UC2 -. "«include»" .-> UC1
        UC3 -. "«extend»" .-> UC2
        UC6 -. "«extend»" .-> UC5
        UC7 -. "«extend»" .-> UC4
        UC13 -. "«include»" .-> UC12
        UC14 -. "«extend»" .-> UC12
        UC16 -. "«extend»" .-> UC15
        UC17 -. "«extend»" .-> UC15
        UC20 -. "«extend»" .-> UC19
        UC9 -. "«include»" .-> UC8
        UC10 -. "«include»" .-> UC8
    end

    %% Creator associations
    CR --- UC1
    CR --- UC2
    CR --- UC4
    CR --- UC5
    CR --- UC7
    CR --- UC8

    %% Vendor associations
    VN --- UC1
    VN --- UC2
    VN --- UC11
    VN --- UC12
    VN --- UC15
    VN --- UC18
    VN --- UC19

    %% System actor associations
    UC1 -. "«include»" .-> FB
    UC2 -. "«include»" .-> FB
    UC4 -. "«include»" .-> ML
    UC6 -. "«include»" .-> ML
    UC7 -. "«extend»" .-> ML
    UC5 -. "«include»" .-> ML
    UC14 -. "«include»" .-> ML
```

---

## 4. Sequence Diagram

### 4a — Creator Registration & ML Scoring

```mermaid
sequenceDiagram
    actor Creator
    participant App as Mobile App
    participant Backend as Node.js Backend
    participant Firebase as Firebase Auth
    participant ML as Python ML Module
    participant DB as MongoDB

    Creator->>App: Fill registration form\n(name, niche, socialStats…)
    App->>Firebase: POST signUp (email, password)
    Firebase-->>App: idToken + UID

    App->>Backend: POST /api/creators\nAuthorization: Bearer {idToken}
    Backend->>Firebase: Verify idToken
    Firebase-->>Backend: { uid, email }
    Backend->>DB: Create Creator document
    DB-->>Backend: Creator record saved
    Backend-->>App: 201 Created { creator }
    App-->>Creator: Profile created ✅

    Note over Backend,ML: Fire-and-forget background scoring
    Backend->>ML: spawn predict.py\nstdin ← JSON (18 features)
    ML->>ML: Random Forest → bot_probability
    ML->>ML: Isolation Forest → anomaly_score
    ML->>ML: k-NN Graph → network_score
    ML->>ML: Aggregate → authenticity_score + tier
    ML-->>Backend: stdout → JSON result
    Backend->>DB: Update Creator\n(authenticityScore, riskLevel, mlDetails)

    Creator->>App: Open Dashboard
    App->>Backend: GET /api/creators/{id}/score
    Backend->>DB: Fetch Creator with mlDetails
    DB-->>Backend: Creator record
    Backend-->>App: { score: 82, tier: "Authentic", … }
    App-->>Creator: Score card with breakdown
```

### 4b — Vendor Deal Proposal Flow

```mermaid
sequenceDiagram
    actor Vendor
    actor Creator
    participant App as Mobile App
    participant Backend as Node.js Backend
    participant DB as MongoDB

    Vendor->>App: Browse creators (filter by niche, score)
    App->>Backend: GET /api/vendors/creators?niche=fashion&minScore=70
    Backend->>DB: Query creators with filters
    DB-->>Backend: Paginated creator list
    Backend-->>App: Creator list with scores
    App-->>Vendor: Scrollable creator cards

    Vendor->>App: Tap creator → View detail
    App->>Backend: GET /api/vendors/creators/{id}
    Backend-->>App: Full profile + ML breakdown
    App-->>Vendor: Profile + score breakdown

    Vendor->>App: Tap "Send Proposal"
    App-->>Vendor: Proposal form

    Vendor->>App: Fill: title, message, budget, contact
    App->>Backend: POST /api/promotions\n{ creatorId, campaignTitle, message, budget, contactEmail }
    Backend->>DB: Create PromotionRequest { status: "pending" }
    DB-->>Backend: Saved
    Backend-->>App: 201 { proposal }
    App-->>Vendor: Proposal sent ✅

    Creator->>App: Open Deals tab
    App->>Backend: GET /api/promotions/creator
    Backend->>DB: Find proposals where creator = this creator
    DB-->>Backend: Proposal list
    Backend-->>App: Proposals
    App-->>Creator: Incoming deal cards

    Creator->>App: Tap "Accept"
    App->>Backend: PUT /api/promotions/status\n{ requestId, status: "accepted" }
    Backend->>DB: Update status → "accepted"
    DB-->>Backend: Updated
    Backend-->>App: 200 OK
    App-->>Creator: Deal accepted ✅

    Vendor->>App: Open Deals tab
    App->>Backend: GET /api/promotions/vendor
    Backend->>DB: Find proposals by this vendor
    DB-->>Backend: Updated proposal list
    Backend-->>App: Proposals with statuses
    App-->>Vendor: Shows "Accepted" badge on proposal
```

---

## 5. ER Diagram

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string uid UK
        string email UK
        string role
        string businessName
        string industry
        string country
        boolean isActive
        ObjectId[] savedCreators FK
        datetime createdAt
        datetime updatedAt
    }

    CREATOR {
        ObjectId _id PK
        string uid UK
        string email UK
        string name
        string niche
        string country
        number pricePerPost
        string profileImageUrl
        string bio
        object platforms
        object socialStats
        number authenticityScore
        string riskLevel
        object mlDetails
        datetime createdAt
        datetime updatedAt
    }

    SOCIAL_STATS {
        number totalFollowers
        number totalFollowing
        number totalPosts
        number totalLikes
        datetime accountCreatedAt
        boolean isVerified
        boolean hasProfileImage
        boolean hasDescription
        boolean hasUrl
        string screenName
    }

    ML_DETAILS {
        number bot_probability
        number anomaly_score
        number network_score
        datetime scoredAt
    }

    PROMOTION_REQUEST {
        ObjectId _id PK
        ObjectId vendor FK
        ObjectId creator FK
        string campaignTitle
        string message
        number proposedBudget
        string contactEmail
        string status
        datetime createdAt
        datetime updatedAt
    }

    USER ||--o{ PROMOTION_REQUEST : "sends"
    CREATOR ||--o{ PROMOTION_REQUEST : "receives"
    USER }o--o{ CREATOR : "saves (bookmark)"
    CREATOR ||--|| SOCIAL_STATS : "has"
    CREATOR ||--o| ML_DETAILS : "has"
```

---

> **Tip:** Paste any diagram block into [mermaid.live](https://mermaid.live) to get a PNG/SVG export.
