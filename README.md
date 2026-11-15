# MindOrbit

A privacy-first astronaut wellbeing companion built from the supplied MindOrbit blueprint. Chat uses **Gemma 3 4B through a local Ollama runtime**, with clearly labeled guided fallback. Version 1.2 adds dated measurements, learned personal baselines, private care plans with outcome reviews, and optional local journal-pattern analysis. Crew and mission demonstrations are fictional; personal readings are entered or imported by the user. No sensor is connected. This prototype does not diagnose conditions, operate medical alerting, or contact Earth.

The full Gemma companion runs locally; a GitHub repository shares the code, not a hosted AI service. Website is still viewable without Gemma; only the chat companion function requires Gemma.

## Run

Requires Node.js 20 or newer. The website has no package dependencies and needs no API key.

```sh
npm start
```

Open http://localhost:4173/#companion. The chat status shows whether Gemma is available. `npm start` also starts an existing supported local Ollama installation if it is not already running.

## Set up Gemma 3 4B

1. Install [Ollama](https://ollama.com/download), or use the portable runtime installed for this project at `%LOCALAPPDATA%\MindOrbit\ollama\ollama.exe`.
2. Run the one-time model setup while connected to the internet:

```sh
npm run setup:model
```

3. Run `npm start` and open the Companion page. Its status should read **Gemma 3 4B connected**. Each generated reply is labeled **Gemma 3 4B · On this computer**.

The initial download is several GB. The first reply can take longer while the model loads. Model weights are not bundled in this repository or its source archive. For this project's portable runtime, models live under `%LOCALAPPDATA%\MindOrbit\models`, outside the OneDrive project directory. Standard Ollama installations retain their existing model location.

The app calls only `http://127.0.0.1:11434` with the fixed model name `gemma3:4b`. There is no cloud provider or automatic cloud fallback. An Ollama process started by MindOrbit binds to loopback and has cloud features disabled. You can also use an already-running local Ollama service.

### If chat returns prewritten responses

Open **Local AI settings** in the Companion header. The connection panel shows the exact model MindOrbit requires and the models installed in the running Ollama instance. `gemma:latest` is a different model from `gemma3:4b`; installing one does not make the other available. Separate portable and desktop Ollama installations can also use different model libraries.

Run `npm run setup:model` while the intended Ollama instance is running. Setup connects to that running instance before looking for an installed executable, so it also works when a newly installed CLI is not yet on the terminal's PATH. If Ollama must be started, the desktop installation is preferred over the project's portable copy.

Refresh the connection, then send a new message. Earlier prewritten messages remain saved; they do not become generated replies after reconnecting. If model inference fails, a prominent **Prewritten guidance · Not a Gemma reply** notice explains the fallback. Model responses carry **Gemma 3 4B · On this computer** instead.

## Build, deployment, and offline operation

`npm test` runs 50 tests covering monitoring, intervention outcomes, journal counts, consent boundaries, API validation, cancellation, model failure, and request isolation. Automated model tests use stubbed responses. Live Gemma checks were also performed for outcome and writing explanations; this is functional verification, not clinical evaluation.

`npm run build` creates a static copy in `dist/`. **A static-only host cannot run Gemma or this Node API.** It provides cached tools and clearly labeled guided responses. For full AI chat, run the complete Node project and Ollama on the same computer. The current server intentionally binds to `127.0.0.1` and rejects external Host/Origin values; it is not a public deployment configuration.

After the app and model are downloaded, AI chat works without internet while the Node server and Ollama stay running. If either local service stops, the cached app and local resources remain usable, and chat falls back to guided responses. API results are explicitly excluded from service-worker caching.

## Demo walkthrough

### New: follow an activity through to its outcome

1. In **Health insights**, choose **Mission demo → Recovery pattern** using Change scenario. A fresh demo begins on mission day 67. It includes 14 earlier reference days and seven recent days.
2. Open **Care plan**, find **Review the load**, and choose that step. Its three-day before-period is frozen in the encrypted plan, along with a dated follow-up.
3. Select **Simulate next day** three times. The prewritten fictional path now shows mean sleep changing from **5.6 to 6.4 hours**, across three before-days and three after-days. This path is independent of the activity; choosing the activity does not cause the scripted recovery.
4. Select **Record follow-up**. Record participation, helpfulness, symptoms, and other changes such as workload or rest opportunities. Optional notes stay private and outside AI requests.
5. Use **Discuss progress with Orbit** to inspect the calculated summary before approving one local AI explanation. Measurement context is included for this request, even if automatic health context is off. The persistent setting stays unchanged. Gemma receives the selected structured feedback, not the private note. It cannot alter the plan or the calculated outcomes.

Plans remain associated with the personal log or the specific demo scenario where they began. Completing a matching toolkit activity records a completion in an active plan. Follow-up dates are in-app reminders; there is no background notification or clinician connection.

### New: use your own dated measurements

In **Health insights**, choose **My measurements**. Use **Log measurements**, or paste a JSON array using **Import dated readings**. Leave unmeasured fields blank. The initial personal log has no baseline and never borrows a demo baseline.

```json
[
  {
    "at": "2026-11-01T08:00:00Z",
    "metrics": { "sleep": 7.2, "heart": 68, "hrv": 48 },
    "quality": "verified",
    "condition": "rest",
    "workload": "Balanced"
  }
]
```

The example is fictional. Dates/times use UTC. Supported metric fields are `sleep` (hours), `heart` (bpm), `hrv` (ms), `cognitive` (%), `systolic`, and `diastolic` (mmHg). `quality` is `verified` (checked by the user, not medically verified) or `questionable`. `condition` is `rest`, `post-exercise`, `schedule-change`, `unwell`, or `unknown`. Optional workload is `Balanced`, `Moderate`, or `High`. Unknown fields, private notes, invalid values, and future measurements are rejected. An import accepts at most 1,000 records atomically and skips exact timestamp/value duplicates.

Baselines use a median of daily medians over a 7-, 14-, or 28-day reference window ending before the latest seven calendar days. Choose an earlier stable reference end date if appropriate; otherwise it moves with the timeline. Each metric needs at least five comparable reference days. Repeated samples on one day do not replace separate days. Questionable, post-exercise, unwell, and changed-schedule samples are excluded from baseline estimation. Post-exercise heart rate/HRV are also excluded from resting trends. Other contextual samples are shown with limitations. Missing calendar days break consecutive trends and remain chart gaps. There is no automatic diagnostic interpretation of missing data.

Each evidence card shows the last checked value and its date, reference value and sample count, duration, recent coverage, excluded samples, and possible contributors. Large relative blood-pressure changes in either direction suggest verifying the reading and human review; these demonstration rules are not clinical triage or absolute clinical thresholds.

### New: optional writing comparisons

1. In **My journal**, choose **Review & enable** and read the consent panel. Analysis starts off. Enabling computes local word counts, distinct-word proportions, and sentence lengths from existing and future entries.
2. Compare the most recent seven calendar days with the preceding seven. A comparison requires at least two entries on two separate days in each week. You can backdate journal entries using the entry-date field.
3. **Try fictional sample entries** adds eight clearly labeled samples without replacing your reflections. Use this on a demo browser profile when presenting.
4. **Preview a summary for Orbit** shows the exact derived numeric summary. Only after choosing **Use this summary once** is it added to one local AI request. Raw entries, titles, individual entry IDs, and private notes are excluded. The generated response remains in chat history and may enter subsequent turns until a new conversation starts.
5. **Turn off & remove derived features** removes the numeric feature records and stops analysis. Journal entries and existing chat remain. Re-enabling rebuilds features locally.

Lexical diversity is distinct words divided by all words in an entry. Entry length, language, topic, and time available affect it. Counts cannot establish distress, sarcasm, mood, or a psychiatric condition.

### Existing companion and privacy tools

1. Start on Overview with the **Recovery pattern** scenario. Inspect sleep, heart rate, HRV, and the trend chart. “Why am I seeing this?” explains the deterministic rule, uncertainty, and suggested action.
2. Complete a private check-in and add context. Exercise context does not erase an existing sustained pattern.
3. Talk with Orbit about sleep, stress, missing home, privacy, or your signals. Gemma generates replies using recent chat history and, optionally, an app-calculated simulated health summary. Check the source label under each reply. Use **Local AI settings** to disable health-summary context. Use **Stop response** to cancel inference.
4. Write a private journal reflection. There is no automatic psychiatric classification or sentiment risk score.
5. In Privacy & sharing, preview a support packet. Toggle categories and inspect the exact JSON. Journals are excluded by default. Approval saves a Level 3 demonstration request locally; it does not send anything. Downloads are explicitly labeled unencrypted.
6. Switch the scenario to **After exercise**. The isolated heart-rate rise is explained with exertion context; stable sleep and cognitive readings do not create a sustained multi-signal finding.
7. Try the breathing pause and offline reflection resources. Load the app once successfully before disconnecting; the service worker caches the app shell and support tools. NASA reference links still require internet.
8. Use Immediate support to inspect the separate Level 4 emergency simulation. No real responder is connected. For any actual emergency, use the mission's established onboard medical pathway.

The header's **Start a new conversation** button keeps earlier messages in a collapsed history section and excludes them from subsequent AI prompts. Legacy guided conversations are retained there when upgrading. A separate **Clear all saved chat** action in Local AI settings requires confirmation before deleting saved messages.

## Architecture

- `src/engine.js`: dated measurement validation, daily aggregation, fictional timeline generation, learned baselines, structured evidence, and limited scripted safety routing. Legacy fixed-scenario helpers remain for compatibility tests; the current UI and AI context use the dated engine.
- `src/interventions.js`: independent resource rules, frozen before-periods, dated follow-ups, participation feedback, and descriptive outcome calculations.
- `src/journal-analysis.js`: local descriptive feature extraction, separate-period comparisons, and explicit numeric-only AI summary projection.
- `src/feature-views.js` and `src/feature-controller.js`: measurement controls, care-plan screens, journal consent, and one-request explanation previews.
- `src/storage.js`: IndexedDB vault with AES-GCM encryption, random per-write IVs, and a non-exportable CryptoKey. Writes are serialized. If secure storage cannot initialize or save, the app reports a memory-only session.
- `src/app.js`: responsive app, check-ins, journal, chat, exercises, chart controls, consent preview, export, local activity log, and erasure.
- `src/llm-client.js`: same-origin requests, model availability, and response validation.
- `server/companion.mjs`: fixed local Gemma model, persona and boundaries, bounded history, server-calculated health context, structured output schema, response validation, deterministic demo safety routing, and guided fallback.
- `server/context.mjs`: strict allowlists for each new request field, independent monitoring/outcome calculations, and concise model context without raw journals or private notes.
- `scripts/ollama-runtime.mjs`: finds and starts a local Ollama runtime with a hidden background process. Logs contain runtime and request metadata; MindOrbit does not log chat bodies.
- `scripts/setup-model.mjs`: starts Ollama and downloads the fixed `gemma3:4b` model with progress reporting.
- `sw.js`: offline app and tool caching.
- `server.mjs`: dependency-free local web and chat server, loopback binding, request size limits, and Host/Origin checks.

Personal baselines are calculated from dated records. The demo's fictional reference records reproduce the blueprint's starting values; deviations and minimum sample counts are illustrative workflow rules, not medically validated thresholds. Four workflow stages distinguish routine monitoring, a private check-in, a locally saved professional-support request, and a separate emergency demonstration. Insufficient data has its own explicit status.

## Privacy and limitations

No analytics, remote fonts, cloud inference, or remote health-data endpoints are included. AI requests contain the latest message and bounded recent conversation history, sent to the local Node server and local Ollama runtime. When enabled, health context contains the selected demo timeline or relevant personal readings, baseline settings, structured check-in choices, and a predefined clarification. At most 1,000 relevant measurement records are accepted per request; larger sets require a narrower reference period rather than silent truncation. The server calculates the evidence and sends concise findings to Gemma. Optional, explicitly selected care-plan and writing summaries can accompany a request. Raw journals and private notes are rejected in all structured context fields; incoming system-role messages are rejected. Text the user deliberately types in chat is chat content, including anything copied from elsewhere.

Turning off health context removes that context from automatic requests; it does not remove information already written into prior conversation text. Explicitly discussing a measured care-plan outcome asks permission for its measurement context once. Start a new conversation to exclude earlier chat from AI requests while retaining it in saved history. The model has no file, network, sharing, or application-control tools. Its resource suggestion must match a request-specific list selected by independent rules; even a known resource ID is rejected when it is not permitted. The model cannot change monitoring levels or approve sharing. Rendering uses escaped plain text, never model-provided HTML.

The model processes plaintext in local memory. Messages are retained only in the app's encrypted browser vault when available, not in a server conversation database. Each request supplies its own history; conversations are not accumulated in server globals. Downloads remain user-controlled and unencrypted. A single model request is processed at a time; another request receives an honestly labeled guided fallback rather than an unbounded inference queue.

Encryption is protection for stored bytes, not a user authentication system. The encryption key resides in the same browser profile. Someone who controls the browser profile or origin can access/decrypt the data. The activity log is editable local data, not a tamper-evident medical audit trail. Erasure clears the application vault and key; it cannot remove files already downloaded or guarantee forensic erasure of browser disk sectors.

The scripted urgent-language checks are deliberately limited and can miss, or misinterpret, language. They run before model inference and can return fixed guidance even when the model is busy or unavailable. They are not a validated safety assessment. Prompt instructions and JSON validation do not ensure medical accuracy: Gemma may hallucinate, misunderstand distress, or produce inappropriate advice. The app has no background medical monitoring and no external emergency notification. A real mission would require clinician-owned protocols, validated thresholds and models, identity and role enforcement, approved support materials, secure key management, clinical validation, accessibility review, and agency-specific consent and emergency disclosure policies.

## Model configuration

The implementation pins `gemma3:4b`, a 4,096-token context, 320 output tokens, temperature 0.4, one concurrent inference, and a five-minute keep-alive. The input boundary accepts at most 10 preceding messages within 6,000 total conversation characters. Before inference, history is reduced further to at most 4,000 characters and an estimated 11,000-character prompt budget, retaining the latest user message and current structured context. This is not a tokenizer-based guarantee. Requests time out after three minutes and cancellation propagates from browser disconnect/Stop to the local model request. The runtime may need additional time for its initial load on a new machine.

Windows defaults to CPU inference with eight threads. To try Ollama's automatic GPU selection on compatible hardware, set `MINDORBIT_USE_GPU=1` before starting the Node server. Other platforms default to Ollama's automatic hardware selection. This is an application setting; no GPU driver or system security setting is changed.

Response shape, permitted suggestion IDs, and a bounded set of causal claims and reversed writing-comparison phrases are checked in code. A rejected explanation falls back to labeled code-calculated guidance with the actual values. The phrase checks are deliberately limited; they do not verify every statement, prevent all hallucinations, or establish clinical accuracy. Live testing exposed misleading causal wording and a reversed lexical-diversity comparison, which informed regression tests and these checks. Broader model evaluation remains necessary. There is no claim of clinically validated screening, secure model alignment, or mission qualification. Reference API behavior: [Ollama chat](https://docs.ollama.com/api/chat), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs), and [local-only mode](https://docs.ollama.com/faq#how-do-i-disable-ollamas-cloud-features).

## Reference

NASA's [Behavioral Health & Performance](https://www.nasa.gov/reference/jsc-behavioral-health/) overview informed the project's focus on psychological support, sleep, and mission context. This project is independent; it is not NASA-approved or clinically certified.
