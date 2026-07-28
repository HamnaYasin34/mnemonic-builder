# MnemonicFlow Pro

> Premium AI-powered medical mnemonics for MBBS students. Built with Next.js 14, Tailwind CSS, and GPT-4o.

![MnemonicFlow Pro — Midnight Interface](./public/preview.png)

---

## Features

- **3-Column Midnight Interface** — Glassmorphic sidebar · Focus workspace · Vault feed
- **3-in-1 AI Engine** — Story mnemonic + Pixar visual prompt + Anki card in one API call
- **Secure by design** — API key lives server-side in Next.js API Routes only
- **SM-2 Spaced Repetition** — Review badges based on 24h initial interval
- **Anki CSV Export** — Professional `.txt` import-ready for Anki desktop
- **Supabase-ready** — localStorage now, one-file swap to Supabase later

---

## Project Structure

```
mnemonicflow-pro/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts        ← Secure OpenAI API route
│   ├── components/
│   │   ├── Sidebar.tsx         ← Left: glassmorphic subject nav
│   │   ├── Workspace.tsx       ← Center: generation focus mode
│   │   └── VaultPanel.tsx      ← Right: neon flashcard vault
│   ├── lib/
│   │   ├── subjects.ts         ← Medical subject config
│   │   ├── vault.ts            ← Persistence + SM-2 algorithm
│   │   └── utils.ts            ← cn() and helpers
│   ├── types/
│   │   └── index.ts            ← All TypeScript types
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← Root 3-column layout
├── tailwind.config.js          ← Full neon color system + animations
├── next.config.js
├── .env.local.template         ← Copy to .env.local and add your key
└── .gitignore
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
# or
pnpm install
```

### 2. Set up your OpenAI key
```bash
cp .env.local.template .env.local
```
Then edit `.env.local`:
```env
OPENAI_API_KEY=sk-your-real-key-here
```
> ⚠️ **Security**: The key is accessed only in `app/api/generate/route.ts` — it never reaches the browser. Do NOT prefix with `NEXT_PUBLIC_`.

### 3. Run dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Color System (tailwind.config.js)

All neon accents are defined as Tailwind tokens:

| Token | Hex | Used for |
|---|---|---|
| `neon-green` | `#0df27d` | Brand accent, buttons, glow |
| `neon-anatomy` | `#ff4d6d` | Anatomy subject |
| `neon-pharma` | `#4df7c8` | Pharmacology / Surgery |
| `neon-physio` | `#ffd60a` | Physiology |
| `neon-biochem` | `#c77dff` | Biochemistry |
| `neon-patho` | `#ff6b35` | Pathology |
| `neon-micro` | `#00b4fc` | Microbiology |
| `neon-review` | `#ff9a00` | Review due badge |

Each color also has `neon-{color}-dim` (15% opacity bg), `neon-{color}-border` (25% opacity), and `neon-{color}-glow` (box-shadow) variants.

---

## Spaced Repetition (SM-2)

Cards follow the **SM-2** algorithm (`app/lib/vault.ts`):

- **Initial interval**: 1 day
- **Ease factor**: starts at 2.5, adjusts with each review
- **Review quality**: 0 (blackout) → 5 (perfect)

```ts
import { vault, sm2 } from './lib/vault'

// After a user reviews a card
vault.review(cardId, 4)  // quality 4 = correct after hesitation
```

---

## Swapping localStorage → Supabase

In `app/lib/vault.ts`, find the two marked functions:

```ts
// SWAP POINT: Replace loadRaw() and saveRaw() for Supabase
function loadRaw(): VaultState { ... }
function saveRaw(state: VaultState): void { ... }
```

Replace with:
```ts
async function loadRaw(): Promise<VaultState> {
  const { data } = await supabase
    .from('vaults')
    .select('cards, version')
    .eq('user_id', userId)
    .single()
  return data ?? emptyVault()
}
```

All other vault methods (`vault.add`, `vault.delete`, `vault.review`) call these two functions — nothing else changes.

---

## Anki Export Format

The CSV export uses **tab-separated values** compatible with Anki's importer:
- **Deck**: `MnemonicFlow Pro`
- **Note type**: `Basic`
- **Back field** includes: answer + story mnemonic + visual prompt

---

## API Route Security

`POST /api/generate` features:
- Server-side OpenAI key (never in client bundle)
- Input validation (topic length, required fields)
- Simple in-memory rate limiting (20 req/hr/IP)
- `response_format: { type: 'json_object' }` for reliable JSON parsing
- Structured error responses

---

## Deploying to Vercel

```bash
npx vercel
```

Add `OPENAI_API_KEY` in Vercel Dashboard → Settings → Environment Variables.

---

## Roadmap

- [ ] Supabase auth + multi-user vault
- [ ] AI image generation (DALL-E 3 integration)
- [ ] Mobile responsive layout
- [ ] Progress analytics dashboard
- [ ] Collaborative study rooms
- [ ] MCQ generator from vault cards
