# Aquira.org — Projects & Dialogue

This repository contains the **static source of truth** for `aquira.org`. It provides the Aquira ecosystem’s project, dialogue, collaboration, and social-facing practice entry point. It does not make unverified claims about programs, partners, results, locations, qualifications, dates, or booking availability.

## Update workflow

1. Edit `content/site-content.js`. Add a project only after its title, participants, date/location where relevant, permissions, and supporting source are confirmed.
2. Run `node scripts/build-site.mjs`.
3. Run `node scripts/validate-site.mjs`.
4. Review the generated HTML, `robots.txt`, and `sitemap.xml`.
5. Open a pull request; deploy after DNS/hosting are connected to this static project and live canonical/redirect checks pass.

## Cross-domain roles

| Domain | Authoritative role |
|---|---|
| `aquira.art` | Works, official artist profile, collaboration and licensing enquiries |
| `aquira1978.com` | Origin, historical record, archive and official-name record |
| `aquira.org` | Projects, dialogue and social-facing collaboration |

The code is deliberately conservative. Publish only information that is accurate, attributable, and suitable for a public, indexable site.
