# Hedgooor Vote Platform

## Project Overview
A conviction-based pairwise voting system for a cohort of 50 users. Replaces standard ordinal voting (A > B) with a "Conviction Level" system that captures intensity of preference. Supports multiple polls with per-poll anonymity settings.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router, Server Actions, TypeScript) |
| Backend/DB | Supabase (PostgreSQL, Auth, Realtime) |
| UI Framework | Tailwind CSS + shadcn/ui (lucide-react icons) |
| Charts | Recharts (via shadcn/charts) |
| Animation | Framer Motion |

---

## Core Logic: Conviction Scoring (0-10 Scale)

### The Input
For each pair of options, users choose:
1. **Winner** - Which option they prefer
2. **Conviction Level** (0-10 slider)
   - `0` = Toss up / Neutral (no preference)
   - `5` = Moderate conviction
   - `10` = Absolute conviction

### The Math: Signed Magnitude Vector

When a user votes for Option A over Option B with conviction `C`:
- **Option A receives**: `+C` points
- **Option B receives**: `-C` points (implicitly, via the loser relationship)

### Aggregation Formulas

```
Total Points (Option X) = SUM(conviction_score) WHERE winner_id = X
                        - SUM(conviction_score) WHERE loser_id = X

Net Score = Total Wins - Total Losses (weighted by conviction)
```

### Pairwise Combinatorics
- For 5 options: `C(5,2) = 10` unique pairs
- Each user completes all 10 comparisons
- Order of pairs is randomized per user

---

## Database Schema

### Tables

#### `options`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | TEXT | Option name |
| description | TEXT | Option description |
| image_url | TEXT | Optional image |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK, FK → auth.users) | User ID |
| display_name | TEXT | User's display name |
| is_anonymous | BOOLEAN | Global privacy toggle (default: false) |
| is_admin | BOOLEAN | Admin flag (default: false) |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `polls`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Poll identifier |
| title | TEXT | Poll title |
| description | TEXT | Poll description |
| created_by | UUID (FK → profiles) | Admin who created |
| is_active | BOOLEAN | Whether poll is open for voting |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `poll_options` (junction table)
| Column | Type | Description |
|--------|------|-------------|
| poll_id | UUID (FK → polls) | Poll |
| option_id | UUID (FK → options) | Option |
| PRIMARY KEY | (poll_id, option_id) | |

#### `poll_participants` (tracks user participation & per-poll anonymity)
| Column | Type | Description |
|--------|------|-------------|
| poll_id | UUID (FK → polls) | Poll |
| user_id | UUID (FK → profiles) | User |
| is_anonymous | BOOLEAN | Per-poll anonymity setting |
| completed_at | TIMESTAMPTZ | When user finished voting |
| PRIMARY KEY | (poll_id, user_id) | |

#### `votes`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Vote ID |
| user_id | UUID (FK → profiles) | Voter |
| poll_id | UUID (FK → polls) | Poll this vote belongs to |
| winner_id | UUID (FK → options) | Winning option |
| loser_id | UUID (FK → options) | Losing option |
| conviction_score | INTEGER | 0-10 scale |
| pair_hash | TEXT | Deterministic hash of pair (for uniqueness) |
| created_at | TIMESTAMPTZ | Vote timestamp |

### Views

#### `leaderboard`
Aggregated view showing total points per option, filtered by poll_id.

#### `pair_consensus`
Shows average conviction and vote counts per pair, filtered by poll_id.

---

## Row Level Security (RLS) Policies

### Privacy Rules

1. **Own Votes**: Users can always read/write their own votes
2. **Others' Votes**: Users can read others' votes ONLY if their per-poll `is_anonymous = false`
3. **Leaderboard**: Everyone can read (includes anonymous votes in totals)
4. **Profiles**: Users can read all profiles but only update their own
5. **Polls**: Everyone can read active polls; admins can create/update/delete
6. **Poll Participants**: Users can read/update their own participation; admins can read all

### Critical Privacy Invariant
> Anonymous users' votes MUST count toward global totals but their individual breakdown MUST be hidden from peers.

Implementation: The `leaderboard` VIEW aggregates all votes (including anonymous), while direct `votes` table access is filtered by RLS.

---

## Routes

| Route | Purpose |
|-------|---------|
| `/polls` | List all polls with status (available, in progress, completed) |
| `/polls/[pollId]/vote` | Vote on specific poll |
| `/polls/[pollId]/results` | Results for specific poll |
| `/my-polls` | User's poll history with per-poll anonymity toggles |
| `/admin/polls` | Admin: list/manage polls |
| `/admin/polls/new` | Admin: create new poll |
| `/community` | View other users' profiles |
| `/settings` | User settings |

---

## UI Components

### PairwisePoller
- Generates all pairs locally (client-side combinatorics)
- Presents pairs one at a time with framer-motion transitions
- Conviction slider with haptic visual feedback
- Progress indicator (e.g., "Pair 3 of 10")
- Accepts optional `pollId` and `pollTitle` props

### ResultsDashboard
- **Horizontal Bar Chart**: Conviction totals per option
- **Consensus Matrix**: Shows which pairs had strongest agreement

### PollCard
- Displays poll summary with option count, pair count, and participant count
- Shows completion status

### MyPollHistory
- Lists user's participated polls
- Per-poll anonymity toggle
- Progress indicator for incomplete polls

### Admin Components
- `PollManager`: List and manage polls with active/inactive toggle
- `PollForm`: Create new polls by selecting from available options

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## File Structure

```
hedgooor-vote/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── polls.ts
│   │   ├── profile.ts
│   │   └── votes.ts
│   ├── admin/
│   │   └── polls/
│   │       ├── page.tsx
│   │       └── new/
│   │           └── page.tsx
│   ├── polls/
│   │   ├── page.tsx
│   │   └── [pollId]/
│   │       ├── vote/
│   │       │   └── page.tsx
│   │       └── results/
│   │           └── page.tsx
│   ├── my-polls/
│   │   └── page.tsx
│   ├── community/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── components/
│   ├── ui/                    # shadcn components
│   ├── admin/
│   │   ├── poll-form.tsx
│   │   └── poll-manager.tsx
│   ├── pairwise-poller.tsx
│   ├── results-dashboard.tsx
│   ├── poll-card.tsx
│   ├── poll-list.tsx
│   ├── my-poll-history.tsx
│   ├── conviction-slider.tsx
│   └── anonymous-toggle.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── types/
│   │   └── database.ts
│   ├── utils.ts
│   └── pairs.ts              # Combinatorial logic
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_multi_poll.sql
└── CLAUDE.md
```

---

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint check
```

---

## Notes for Future Sessions

- The conviction score is always stored as positive (0-10)
- The winner/loser relationship determines the sign in calculations
- pair_hash = sorted alphabetically then hashed to ensure uniqueness
- Anonymity is now per-poll via `poll_participants.is_anonymous`
- Existing votes were migrated to a "Default Poll" in migration 002
- Admin users (profiles.is_admin = true) can create and manage polls
- The `kenl` user is set as admin in the migration
