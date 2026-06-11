# Rampely — Master Build Prompt (v2)

> Dette dokument er den autoritative spec for Claude Code, når der bygges på Rampely.
> Læs sektion 2 (konventioner) og 3 (datamodel-kontrakt) før hver opgave — de er bindende.

---

## 0. Status og udgangspunkt

**VIGTIGT:** Repoet starter tomt. Phase 1 (CRM-fundamentet) er IKKE bygget endnu og skal
bygges først. Alt i Phase 1.7+ antager, at datamodel-kontrakten i sektion 3 eksisterer.
Hvis en fase refererer til en tabel/funktion, der ikke findes endnu, så byg den efter
kontrakten i sektion 3 — opfind ikke en alternativ struktur.

## 1. Produktvision (kort)

Rampely er en modulær sales performance platform. **Rampely CRM er fundamentet** og skal
have standalone-værdi. Rolle-specifikke lag (BDR, Manager, Onboard, AE, CS, …) genbruger
70–80 % af kerne-infrastrukturen. Hver feature er isoleret, så den kan fjernes eller
flyttes uden at påvirke andre. Ekspansion sker via konfiguration, ikke refaktorering.

## 2. Teknisk fundament og konventioner (bindende)

**Stack:** React + TypeScript (strict), TanStack Router (file-based), Tailwind v4,
shadcn/ui, Supabase (Lovable Cloud), edge functions til tredjeparts-integrationer.

**Brand:** primary `#4759E8`, navy `#1C2362`, paper `#FAFAF7`, ink `#0A0A0F`,
font Manrope, radius 12px. Definér disse som design-tokens ét sted (Tailwind theme) —
aldrig hardcodede hex-værdier i komponenter.

**Folder-arkitektur:**
```
src/
  features/<feature-name>/
    components/   # kun brugt af denne feature
    hooks/        # use<Noget>.ts
    lib/          # ren logik, ingen React
    routes/       # route-filer der re-eksporteres til router
    index.ts      # featurens offentlige API — alt andet er privat
  shared/
    components/ui/   # shadcn
    hooks/
    lib/
      country-features.ts   # AL landespecifik konfiguration
```

**Regler:**
1. En feature må kun importere fra en anden features `index.ts` — aldrig fra dens interne filer.
2. Landechecks sker ALDRIG som `if (country === 'DK')` i feature-kode. Alt går gennem
   `useCountryFeatures()` og `country-features.ts` (fx `smsProvider`, `currency`, `vatRate`,
   `recordingConsentMode`).
3. Multi-tenancy: hver domænetabel har `workspace_id` med RLS-policy via en fælles
   `has_workspace_access(workspace_id)`-funktion. Aggregeringer på tværs af rækker bruger
   SECURITY DEFINER-funktioner, der selv validerer workspace-medlemskab — aldrig client-side joins
   der omgår RLS.
4. Migrations er additive og navngivet `NNNN_beskrivelse.sql`. Ingen destruktive ændringer
   uden eksplicit aftale.
5. Edge functions: én pr. integration (`stripe-webhook`, `twilio-token`, `email-sync`, …),
   alle secrets via miljøvariabler, alle webhooks idempotente (se 5.2).
6. Al UI har loading-, empty- og error-states. Al tekst via i18n-lag (da som default, en forberedt).

## 3. Datamodel-kontrakt (fælles ordforråd for alle faser)

Kerneentiteter, som ALLE faser bygger på. Navne er bindende:

| Tabel | Formål | Nøglefelter |
|---|---|---|
| `workspaces` | Tenant | `id`, `name`, `country_code`, `settings jsonb` |
| `workspace_members` | Medlemskab + rolle | `workspace_id`, `user_id`, `role` (`owner`/`admin`/`manager`/`rep`) |
| `contacts` | Personer | `workspace_id`, `company_id?`, navn, email, telefon (E.164), `consent jsonb` |
| `companies` | Virksomheder | `workspace_id`, navn, CVR/org-nr (country-aware felt) |
| `pipelines` / `pipeline_stages` | Konfigurerbare pipelines | `workspace_id`, rækkefølge, `is_won`/`is_lost` |
| `deals` | Salgsmuligheder | `workspace_id`, `contact_id`, `stage_id`, `value`, `currency`, `owner_id` |
| `bookings` | Bookede møder (BDR-output) | `workspace_id`, `deal_id?`, `contact_id`, `booked_by`, `held_at`, `outcome`, `quality_score?` |
| `activities` | Tidslinje (calls, emails, sms, noter) | `workspace_id`, `type`, `contact_id`, `actor_id`, `payload jsonb`, `occurred_at` |
| `calls` | Opkald (Phase 2) | `activity_id`, `recording_url?`, `transcript?`, `duration`, `direction` |
| `call_scores` | AI-scoring (Phase 2b) | `call_id`, `layer` (1–4), `parameters jsonb`, `summary` |
| `subscriptions` | Billing (1.7) | `workspace_id`, `product` , `stripe_subscription_id`, `seats`, `status` — **flere rækker pr. workspace tilladt** (et produkt pr. række) |
| `comp_models` | Lønmodel (3a) | `workspace_id`, `user_id?`, `base_salary`, `per_booking_rate`, `bonus_tiers jsonb`, `valid_from` |
| `xp_events` / `streaks` / `skill_nodes` | Gamification (3b) | append-only XP-log; afledte totaler beregnes, gemmes ikke som sandhed |

Princip: **`activities` er den fælles tidslinje.** Calls, emails og SMS er specialiseringer,
der peger på en activity — så CRM-tidslinjen virker automatisk for alle nye kanaler.

## 4. Dependency-graf og parallelisering

```
Phase 1 CRM ──┬──> 1.7 Billing                 (parallel med Phase 2)
              ├──> 3a Earnings + 3b Gamification (kræver KUN bookings — kan starte tidligt)
              └──> 2 Communication Suite
                     2a Power Dialer ──> 2b Transskription ──> AI Call Scoring
                     2c SMS + Email sync (parallel med 2a)
                            │                          │
                            └────────> 3 BDR <─────────┘
                                       3c AI reflection (BLOKERET af Call Scoring)
                                         │
                                       4 Manager (kræver rep-level skill data fra 3)
                                         └──> 4b Onboard (kræver Manager-dashboard)
                                                └──> 5+ AE, CS, Retention, Upsell, Reach, Hire
```

Hårde blokeringer: Call Scoring → AI reflection · BDR skill data → Manager · Manager → Onboard.
Alt andet kan paralleliseres.

## 5. Fase-specs

### Phase 1 — CRM foundation (SKAL BYGGES FØRST)

Auth + workspace-oprettelse og invitationer (roller fra sektion 3) · contacts/companies med
import (CSV) og dubletcheck · pipelines med drag-and-drop deals · activities-tidslinje på
kontakt og deal · bookings med outcome-registrering · dashboard med basale tal (deals pr.
stage, bookings pr. uge) · workspace-settings (land, valuta, brugere).

**Acceptance:** To workspaces kan ikke se hinandens data (verificér med to testbrugere).
En rep kan oprette kontakt → deal → booking → outcome på under 1 minut. CSV-import af
1.000 kontakter uden timeout. RLS-policies har tests.

### Phase 1.7 — Billing (1–1,5 uge, parallel med Phase 2)

Stripe Checkout + Customer Portal (byg ikke egen kort-UI). Tiers: Starter 149 / Pro 259 /
Premium 399 DKK pr. seat pr. md. 14 dages trial uden kort. Free tier: 1 bruger, 100 kontakter,
ingen integrationer. Per-seat med pro-rata via Stripe’s egen proration. Datamodellen
understøtter flere samtidige produkt-subscriptions pr. workspace (CRM + fremtidige moduler).

**Webhooks (idempotente):** gem `stripe_event_id` i en `processed_events`-tabel; duplikat
= no-op. Håndtér mindst: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

**Acceptance:** trial → betalt uden datatab · seat tilføjet/fjernet afspejles korrekt på
næste faktura · faktura-historik i settings · samme webhook afspillet to gange ændrer intet
· nedgradering ved betalingsfejl låser skrive-adgang, ikke læse-adgang.

### Phase 2 — Communication Suite (4–6 uger)

**2a Power Dialer (1,5 uge):** Twilio WebRTC softphone i browseren. Token via edge function.
Klik-til-ring fra kontakt/deal/liste. Opkald logges automatisk som activity + `calls`-række.
Optagelse kræver samtykke-flag styret af `recordingConsentMode` i country-features (DK:
informér modpart). **Rampely Audio** (native headset-optagelse, tool-agnostisk) introduceres
her som separat capture-kilde, der producerer samme `calls`-data.

**2b Transskription + AI Call Scoring (2 uger):** 4-lags arkitektur med eksplicitte
omkostningsgates:
1. **Lag 1 (gratis, alle kald):** metadata — varighed, taletid-fordeling, ringetid, outcome.
2. **Lag 2 (selektiv):** Whisper-transskription, kun kald > 2 min med outcome ≠ no-answer.
3. **Lag 3 (batch, Claude Haiku):** scoring på disse 10 parametre: taletids-ratio,
   spørgsmålsrate, længste monolog, fyldord-frekvens, taletempo, åbning/agenda-struktur,
   discovery-dybde, indvendingshåndtering, next-step-tydelighed, tone/energi. Output som
   `parameters jsonb` med score 1–5 + ét konkret forbedringsforslag pr. parameter.
4. **Lag 4 (bruger-initieret):** deep analysis af enkeltkald med større model.

**Unit economics-gate:** gennemsnitlig AI-omkostning pr. scoret kald skal logges pr.
workspace og må ikke overstige et konfigurerbart loft (default 1 DKK). Overskrides loftet,
falder systemet tilbage til Lag 1.

**2c SMS + Email (1,5 uge, parallel med 2a):** SMS via provider-abstraktion (interface +
country-features vælger provider; DK-kandidat: GatewayAPI eller InMobile — byg interfacet
først, vælg provider i konfiguration). Email-sync Gmail + Outlook (OAuth, edge function,
inkrementel sync), templates med flettefelter, simple sequences (trin = email/sms/opgave,
stop ved svar). Alt lander i `activities`.

**Acceptance:** sælger ringer fra browseren; kaldet optages, transskriberes og scores med
actionable feedback inden for 10 min (batch) · email-tråd vises på kontaktens tidslinje ·
en sequence stopper automatisk ved svar · omkostnings-dashboard pr. workspace viser AI-spend.

### Phase 3 — Rampely BDR (3–4 uger)

**3a Earnings intelligence (1 uge, kan starte under Phase 2):** real-time løn + forecast
fra `comp_models` × bookings. Forecast = nuværende run-rate fremskrevet på måned, vis
"hvad mangler du for næste bonus-tier". Ingen call-data nødvendig.

**3b Gamification (1 uge):** XP for definerede events (booking logget, kald > 2 min,
streak-dag, score-forbedring), levels, daglige streaks, to skill trees til start
(Prospecting, Discovery) hvor noder låses op af målbare handlinger — ikke af selvrapportering.
XP er append-only log; totaler beregnes.

**3c AI reflection engine (1–1,5 uge, BLOKERET af 2b):** ugentlig AI-opsummering af egne
kald: 2 styrker, 1 fokuspunkt, koblet til skill tree-noder. Booking quality scoring
(mødte de op? var det ICP? blev det til deal?) feeder tilbage i quality_score.

**Acceptance:** BDR ser real-time earnings + forecast · logger booking med quality score ·
optjener XP/streaks der matcher event-loggen · får ugentlig AI-coaching på egne kald.

### Phase 4 — Manager + Onboard (3–4 uger)

**Manager:** team-overblik der forbinder rep-level skill-parametre (fra call_scores) til
outcomes (bookings/deals) — "hvilken adfærd korrelerer med resultater". Coaching cards
(auto-genererede forslag pr. rep), leaderboards (opt-in pr. workspace).
**Onboard:** AI-rollespil mod persona-prompts, ramp-milestones med målbare kriterier,
mentor-matching. Mål: 30–40 % reduceret ramp-tid (baseline måles fra workspace-data).

**Forudsætning:** mindst ~50 scorede kald pr. rep før team-analytics vises (ellers empty-state
med forklaring — vis aldrig statistik på tyndt grundlag).

### Phase 5+ — Vision (BYG INTET ENDNU)

AE, CS, Retention, Upsell, Reach, Hire — hver som konfigurationslag: rolle-specifikke
skill trees + AI-prompts oven på fælles kerne. Ingen kode, ingen "forberedende abstraktioner"
før en konkret fase er prioriteret.

## 6. Tværgående krav

- **GDPR fra bunden:** EU-region på alt (Supabase, storage, AI-kald via EU-endpoints hvor
  muligt) · samtykke-felter på contacts · optagelses-samtykke country-aware · data-eksport
  og fuld sletning pr. workspace OG pr. kontakt · retention-politik på optagelser
  (konfigurerbar, default 90 dage) · audit-log på adgang til optagelser.
- **Country-aware:** ny landekonfiguration = ny entry i `country-features.ts`, nul
  feature-kodeændringer.
- **Brand-tone i UI:** varm, direkte, dansk du-form; ingen corporate-floskler.

## 7. Definition of Done (hver feature)

1. RLS-policy + test for workspace-isolation på alle nye tabeller.
2. TypeScript strict, ingen `any` i offentlige API'er, typer genereret fra Supabase-skema.
3. Loading/empty/error-states i al UI; mobile-brugbar (min. 375px).
4. Ingen hardcodede landechecks, valutaer eller hex-farver.
5. Featuren kan slettes ved at fjerne sin mappe + sine migrations uden at andre features brækker.
6. Webhooks/eksterne kald er idempotente og logger fejl observerbart.

## 8. Arbejdsform for Claude Code

- Byg i fase-rækkefølge; én feature ad gangen, migration først, så datalag (hooks/lib),
  så UI.
- Ved tvivl mellem to tolkninger: vælg den simpleste, der opfylder acceptance-kriterierne,
  og notér valget i commit-beskeden.
- Afslut hver feature med en kort verifikation mod fasens acceptance-liste.
- Commit-beskeder: `feat(<feature>): …` / `fix(<feature>): …`.

## 9. Non-goals (byg IKKE)

- Ingen Phase 5+-kode eller abstraktioner "til senere".
- Ingen egen betalings-UI (brug Stripe Checkout/Portal).
- Ingen realtids-transskription i 2a — det kommer i 2b (dialeren må ikke blokeres af det).
- Ingen offentlig API før der er en betalende kunde, der beder om den.
- Ingen role-baserede kodeforgreninger — roller styrer data-adgang og konfiguration, ikke
  parallelle kodebaser.
