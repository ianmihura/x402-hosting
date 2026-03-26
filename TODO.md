Must have:
- test: integration: third party things:
    siwx
    multer
    x402 middleware (full e2e with testnet) setup testnet payments
- site expiry define
- nice readme
- fix helmet

Extra points:
- Analytics or visitor tracking
    - R2 native solution?
- Account creation / claim flow
    - give the user an api token in R2
    https://developers.cloudflare.com/r2/api/tokens/#create-api-tokens-via-api
- Password-protected sites
- Custom domains / CNAME support
- Site renewal payments (just expiry for now)
- gracefull shutdown
- gracefull site expiry (business logic)
- facilitator reliability?
- content moderation:
    - in filesValidate
    - check index.html exists


Nice to have:
- nice homescreen in render/index.html
- nice homescreen in r2/index.html
    - deploy hooks to deploy this index.html?
- network as a global variable / as an array?
