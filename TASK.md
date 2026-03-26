# Agent Web Hosting Service — Product Requirements Document

**Target build time:** 2 days
**Author:** Openfort
**Date:** March 26, 2026


## What We're Building

A minimalistic web hosting service where AI agents can deploy static sites and files to the web by making a single HTTP request and paying with the [x402 protocol](https://github.com/coinbase/x402) (USDC on Base). No accounts, no dashboards, no sign-up — just an API endpoint that accepts a payment and returns a live URL.

An agent sends files + payment → gets back a live, globally-accessible URL. That's it.


## User Stories

**As an AI agent, I want to deploy a static site by sending files and paying via x402**, so that I get a live URL without needing an API key, account, or any authentication flow. The payment itself is my credential.

**As an AI agent, I want to update a site I previously deployed**, so that I can iterate on content without generating a new URL every time. Ownership is proven by the same wallet that originally paid.

**As an AI agent, I want to delete a site I own**, so that I can clean up content I no longer need.

**As an AI agent, I want to check metadata about a deployed site** (files, expiry, size), so that I can manage my deployments programmatically.

**As a visitor, I want to open a URL in my browser and see the hosted content**, served fast and over HTTPS.

**As an agent builder, I want to integrate this into any agent framework**, so the API should be plain HTTP — no SDK required, no special client.


## x402 Payment Model

The service uses [HTTP 402 Payment Required](https://www.x402.org/) as a native payment gate. When an agent hits the deploy endpoint without a payment, it gets back a `402` with the payment requirements (amount, token, network, receiver address). The agent signs a payment, resubmits, and the service verifies and settles it via an x402 facilitator before returning the live URL.

- **Network:** Base (Chain ID 8453)
- **Token:** USDC
- **Scheme:** `exact`
- **Cost:** Flat fee per deploy (e.g., $0.01 USDC)
- **Facilitator:** Coinbase's public facilitator (or self-hosted)

The x402 TypeScript SDK (`@x402/express`, `@x402/hono`, etc.) handles this as a one-liner middleware. See the [x402 GitHub repo](https://github.com/coinbase/x402) and [Coinbase docs](https://docs.cdp.coinbase.com/x402/welcome) for integration details.


## Constraints & Limits

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max site size | 10 MB | Agents deploy small artifacts — keep it lightweight |
| Max files per deploy | 50 | Prevents abuse |
| Site expiry | 30 days | Sites expire unless renewed with another payment |
| Allowed file types | HTML, CSS, JS, JSON, images, fonts, .txt, .md | No executables, no server-side code |
| Rate limit | 60 deploys/min per wallet | Prevents spam |



## Extra points

- Account creation / claim flow
- Password-protected sites
- Custom domains / CNAME support
- Analytics or visitor tracking
- Site renewal payments (just expiry for now)
- Content moderation beyond file-type filtering


## Success Criteria

The MVP is done when an agent can hit the deploy endpoint, get a 402, pay with USDC on Base via x402, resubmit, and receive a live URL that loads in a browser. Updates and deletes work via wallet ownership. The whole round-trip works end-to-end with a real payment.
