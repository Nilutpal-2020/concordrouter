# Security Policy

## Security Architecture & Guarantees

ConcordRouter is built with a strict **BYOA (Bring Your Own Account)** local-first privacy model:

1. **Zero Proxying / Zero Markup**:
   - Requests are dispatched directly to official provider endpoints (Anthropic, OpenAI, Google, Ollama, OpenRouter).
   - No remote proxy server intercepts or logs user prompts or model completions.

2. **Authenticated Encryption at Rest**:
   - Provider API keys are encrypted at rest using **AES-256-GCM** (Galois/Counter Mode) with unique 96-bit cryptographic nonces.
   - Master key is configured via the `CONCORD_ENCRYPTION_KEY` environment variable.

3. **Masked Client Previews**:
   - Plaintext keys are never returned back across the wire once saved. The frontend only receives masked previews (e.g. `sk-ant-...4x9f`).

4. **Local SQLite Storage**:
   - All session histories, turns, and merges are stored in a local SQLite file (`concordrouter.db`) on the user's filesystem with WAL mode.

---

## Reporting a Vulnerability

If you discover a security vulnerability in ConcordRouter, please do **NOT** open a public GitHub issue.

Please report vulnerabilities privately by emailing the maintainers or creating a private security advisory on GitHub.

We commit to:
- Acknowledging your report within 48 hours.
- Providing a timeline for investigation and fix.
- Releasing a patch before disclosing details publicly.
