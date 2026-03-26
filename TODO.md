Must have:
- test delete endpoint
- test: integration third party things:
    siwx
    multer
    x402 middleware (full e2e with testnet) setup testnet payments
- test e2e with anvil:
    - no mocking: should actually get the file to r2
- site expiry define (business)
    https://developers.cloudflare.com/r2/buckets/object-lifecycles/

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
- test negative case:
    - we cant see metadata/delete of another wallet (even if we are owner of our own wallets)
