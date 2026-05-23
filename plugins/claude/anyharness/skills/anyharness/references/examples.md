# Domain Interview Seeds

These are not domain packs. They are prompts for discovery.

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
