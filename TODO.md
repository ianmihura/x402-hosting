Must have:
- architecture description

Extra points:
- Analytics or visitor tracking
    - R2 native solution?
- Account creation / claim flow
    - give the user an api token in R2
    https://developers.cloudflare.com/r2/api/tokens/#create-api-tokens-via-api
- Password-protected sites
- Custom domains / CNAME support
- Site renewal payments (just expiry for now)
    - gracefull site expiry - send to quarentine (business logic)
    https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- Facilitator locally, or redundancy
- content moderation:
    - in filesValidate
    - check index.html exists
- API discoverability
- SIWX storage correctness:
    - make sure re-deployments are not possible

Nice to have:
- nice homescreen in render/index.html
- nice homescreen in r2/index.html
    - deploy hooks to deploy this index.html?
- network as a global variable / as an array?
- gracefull shutdown
