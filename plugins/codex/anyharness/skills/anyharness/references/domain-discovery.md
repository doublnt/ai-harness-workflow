# Domain Discovery

AnyHarness must not apply static domain packs as authoritative truth.

## Required pattern

1. Gather evidence.
2. Propose domain hypotheses.
3. Assign confidence.
4. List Unknowns.
5. Ask focused questions.
6. Generate project-specific rules only after confirmation.

## Evidence sources

- README and docs
- directory names
- service, controller, module, package, class, and function names
- API route names
- database schema and migrations
- test names
- dependency names
- deployment and config files
- existing project instructions

## Example hypothesis format

```text
Hypothesis: ecommerce/payment
Confidence: medium
Evidence:
- src/payment/PaymentCallbackController.java
- src/order/OrderService.java
- docs/checkout.md
Unknowns:
- payment callback duplication behavior
- order price freeze policy
- inventory reservation semantics
Questions:
1. Can payment callbacks repeat?
2. Where is signature verification performed?
3. When is inventory reserved?
```
