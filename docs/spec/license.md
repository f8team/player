# License engine decision contract

Phase 8 does not implement billing code until the provider and legal owner approve the launch contract.

## Provider decision

| Option        | Fit                                                       | Trade-off                                         |
| ------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Stripe        | Strong API, webhooks, tax/add-ons through ecosystem       | More setup for tax, invoices, and customer portal |
| Lemon Squeezy | Faster software-license launch, merchant-of-record option | Less control for custom enterprise workflows      |

**Decision needed:** choose `Stripe` or `Lemon Squeezy` before adding runtime license validation.

## Required contract before implementation

- `F8_PLAYER_LICENSE_PROVIDER`: `stripe` or `lemon_squeezy`.
- `F8_PLAYER_LICENSE_PUBLIC_KEY`: public verifier key if client-side validation is needed.
- Server webhook route and signature secret for purchase, renewal, cancellation, refund.
- License payload shape: `licenseKey`, `plan`, `expiresAt`, `features`, `signature`.
- Offline behavior: premium plugin must degrade gracefully when no valid license exists.

## Non-goals for this repo pass

- No checkout button or purchase flow.
- No secret in browser bundles.
- No telemetry tied to license identity without explicit opt-in.
