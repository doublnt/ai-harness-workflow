# AnyHarness v3 Examples

## 1. Existing Java e-commerce project

User:

```text
Use AnyHarness to adopt this existing repository safely.
```

AnyHarness scans and reports:

```text
Detected stack:
- Java / Spring Boot
- REST API
- SQL migrations
- Messaging signals

Domain hypotheses:
- ecommerce/payment: medium confidence
- inventory consistency: medium confidence

Evidence:
- OrderService.java
- PaymentCallbackController.java
- InventoryReservationRepository.java
- docs/checkout.md
```

Then it asks focused questions before generating rules.

## 2. Electron desktop client

AnyHarness should not apply generic web rules only. It should discover:

```text
main process
renderer process
preload bridge
ipcMain / ipcRenderer
local file access
auto updater
```

Then it creates expert roles:

```text
Electron Security Reviewer
IPC Boundary Reviewer
Local Storage and Secrets Reviewer
Desktop Release Reviewer
```

## 3. C++ trading service

AnyHarness should discover domain signals:

```text
market_data
order_book
execution_report
venue
risk_check
sequence number
replay
```

Then it should ask:

```text
Is there a latency SLO?
Is the hot path allocation-free?
How are duplicate or out-of-order messages handled?
Where is the order state machine defined?
```

## 4. Cross-model review packet

Instead of asking another model to review without context, ask:

```text
Use AnyHarness to create a performance review packet for the staged diff.
```

Give the generated packet to another model and ask it to perform only the selected expert role.
