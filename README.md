# MindOrbit

A privacy-first astronaut wellbeing companion built from the supplied MindOrbit blueprint. Chat uses **Gemma 3 4B through a local Ollama runtime**, with guided fallback when inference is unavailable. This is a hackathon prototype with fictional crew and mission data. It does not diagnose conditions, operate medical alerting, or contact Earth.

For uploading the project and sharing it with teammates or judges, see [the GitHub sharing guide](GITHUB.md). The full Gemma companion runs locally; a GitHub repository shares the code, not a hosted AI service.

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

`npm test` runs monitoring, consent, API, cancellation, model failure, and request-isolation tests. These tests use stubbed model responses; actual model quality needs separate evaluation.

`npm run build` creates a static copy in `dist/`. **A static-only host cannot run Gemma or this Node API.** It provides cached tools and clearly labeled guided responses. For full AI chat, run the complete Node project and Ollama on the same computer. The current server intentionally binds to `127.0.0.1` and rejects external Host/Origin values; it is not a public deployment configuration.

After the app and model are downloaded, AI chat works without internet while the Node server and Ollama stay running. If either local service stops, the cached app and local resources remain usable, and chat falls back to guided responses. API results are explicitly excluded from service-worker caching.

## Demo walkthrough

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

- `src/engine.js`: simulated datasets, personal baseline comparisons, explainable monitoring rules, limited scripted safety routing, local companion responses, and allowlisted sharing packet construction.
- `src/storage.js`: IndexedDB vault with AES-GCM encryption, random per-write IVs, and a non-exportable CryptoKey. Writes are serialized. If secure storage cannot initialize or save, the app reports a memory-only session.
- `src/app.js`: responsive app, check-ins, journal, chat, exercises, chart controls, consent preview, export, local activity log, and erasure.
- `src/llm-client.js`: same-origin requests, model availability, and response validation.
- `server/companion.mjs`: fixed local Gemma model, persona and boundaries, bounded history, server-calculated health context, structured output schema, response validation, deterministic demo safety routing, and guided fallback.
- `scripts/ollama-runtime.mjs`: finds and starts a local Ollama runtime with a hidden background process. Logs contain runtime and request metadata; MindOrbit does not log chat bodies.
- `scripts/setup-model.mjs`: starts Ollama and downloads the fixed `gemma3:4b` model with progress reporting.
- `sw.js`: offline app and tool caching.
- `server.mjs`: dependency-free local web and chat server, loopback binding, request size limits, and Host/Origin checks.

The fixed demonstration baselines and deviations are illustrative workflow rules, not medically validated thresholds. Baseline values come from the supplied blueprint. Four workflow stages distinguish routine monitoring, a private check-in, a locally saved professional-support request, and a separate emergency demonstration.

## Privacy and limitations

No analytics, remote fonts, cloud inference, or remote health-data endpoints are included. AI requests contain the latest message and a bounded recent conversation history, sent to the local Node server and local Ollama runtime. Journal entries and private check-in notes are never added automatically. When enabled, health context consists of the selected simulated scenario and a predefined clarification; measurements and monitoring explanations are recomputed on the server. The server rejects journal/check-in payload fields and incoming system-role messages.

Turning off health-summary context removes that summary from future requests; it does not remove measurements already written into prior conversation text. Start a new conversation to exclude earlier chat from AI requests while retaining it in saved history. The model has no file, network, sharing, or application-control tools. Its optional resource suggestion must match a fixed allowlist. It cannot change monitoring levels or approve sharing. Rendering uses escaped plain text, never model-provided HTML.

The model processes plaintext in local memory. Messages are retained only in the app's encrypted browser vault when available, not in a server conversation database. Each request supplies its own history; conversations are not accumulated in server globals. Downloads remain user-controlled and unencrypted. A single model request is processed at a time; another request receives an honestly labeled guided fallback rather than an unbounded inference queue.

Encryption is protection for stored bytes, not a user authentication system. The encryption key resides in the same browser profile. Someone who controls the browser profile or origin can access/decrypt the data. The activity log is editable local data, not a tamper-evident medical audit trail. Erasure clears the application vault and key; it cannot remove files already downloaded or guarantee forensic erasure of browser disk sectors.

The scripted urgent-language checks are deliberately limited and can miss, or misinterpret, language. They run before model inference and can return fixed guidance even when the model is busy or unavailable. They are not a validated safety assessment. Prompt instructions and JSON validation do not ensure medical accuracy: Gemma may hallucinate, misunderstand distress, or produce inappropriate advice. The app has no background medical monitoring and no external emergency notification. A real mission would require clinician-owned protocols, validated thresholds and models, identity and role enforcement, approved support materials, secure key management, clinical validation, accessibility review, and agency-specific consent and emergency disclosure policies.

## Model configuration

The implementation pins `gemma3:4b`, a 4,096-token context, 320 output tokens, temperature 0.4, one concurrent inference, and a five-minute keep-alive. Earlier chat is bounded to 10 preceding messages and a combined 6,000 characters with the latest message. This character budget estimates context size; it is not a tokenizer-based guarantee. Requests time out after three minutes and cancellation propagates from browser disconnect/Stop to the local model request. The runtime may need additional time for its initial load on a new machine.

Windows defaults to CPU inference with eight threads. During setup on this computer, the automatic CUDA path stalled, while explicit CPU inference returned successfully. To try Ollama's automatic GPU selection on compatible hardware, set `MINDORBIT_USE_GPU=1` before starting the Node server. Other platforms default to Ollama's automatic hardware selection. This is an application setting; no GPU driver or system security setting is changed.

Only response shape and allowed actions are validated programmatically. There is no claim of clinically validated screening, secure model alignment, or mission qualification. Reference API behavior: [Ollama chat](https://docs.ollama.com/api/chat), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs), and [local-only mode](https://docs.ollama.com/faq#how-do-i-disable-ollamas-cloud-features).

## Reference

NASA's [Behavioral Health & Performance](https://www.nasa.gov/reference/jsc-behavioral-health/) overview informed the project's focus on psychological support, sleep, and mission context. This project is independent; it is not NASA-approved or clinically certified.
