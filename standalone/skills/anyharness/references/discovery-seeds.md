# Domain Interview Seeds

These are not domain packs. They are prompts for discovery — starting questions to ask
when a domain signal is detected. Only promote answers to authoritative rules after
the user confirms them with repository evidence.

## Payment-like code

Ask:

- Can callbacks repeat?
- How is signature verification performed?
- Is amount and currency checked against frozen order data?
- What is the idempotency key?
- What happens on partial failure?

## Electron-like code

Ask:

- Does renderer load remote content?
- What preload APIs are exposed?
- Is IPC allowlisted?
- Where are tokens stored?
- Is auto-update signed?

## Trading-like code

Ask:

- Is there a latency SLO?
- Is the hot path allocation-free?
- How are out-of-order messages handled?
- How are duplicate execution reports handled?
- Where is risk checked before routing?

## AI agent / LLM-like code

Ask:

- Are tool call results validated before acting on them?
- Is prompt injection possible through external data sources?
- Are LLM outputs treated as untrusted until validated?
- How are model API failures handled?
- Is there a cost or rate-limit guard?

## See also

- `domain-discovery.md` — the required discovery pattern and hypothesis format
- `safety.md` — Rule 4: seeds are not authoritative rules
