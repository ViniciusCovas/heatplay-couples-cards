# Supabase consolidation — 27 October 2026

## Observed access

The source project referenced by the app is `bbdeyohqrutithaziulp`. It is absent from both connected project inventories. No migration, transfer, billing change or database write was performed.

Connected organizations:
- `viniciusmexico@gmail.com's Org` (`ziztridqzkwfoftdxgnz`): Free; Astra active, Duoversa staging and Multiverso paused.
- `ViniciusCovas.com` (`jkxdxuggmlpsfxhydayp`): Free; personal website project active.

The owner's goal is one account/billing arrangement, with a separate Let's Get Close project. Recommended: one organization for the apps, retaining separate projects. Each organization has one subscription; additional active projects incur compute charges. Consolidation does not make all projects free under a fixed subscription. Do not merge unrelated application tables or Auth users to save one project charge.

## Transfer rather than recreate

Prefer transferring the original project into the chosen organization. The connected Supabase tools have no transfer operation, and the source is not accessible. The owner must initiate the transfer from the original project's Settings → General → Transfer project (or connect that organization for further inventory). Source ownership and destination membership are required; active Supabase GitHub integrations, project-scoped roles and log drains can block transfer. Review destination plan/free quota before starting. The existing repository can remain on GitHub; an active Supabase GitHub integration is a separate service connection.

Do not create a replacement until we have inspected source data, Auth, Storage, functions, migration history and entitlements. A new blank project would not preserve those automatically.

## Integration after access

1. Confirm source identity and target organization. Inspect remote migration history and schema against this repository; migrations include repeated historical table definitions, so do not replay the directory blindly.
2. Inventory levels/questions by language, room membership and turn fields, game responses, credit ledger/subscriptions, AI analyses and deployed functions. Check backups and security advisors before mutation. Do not log private answers or credentials.
3. Implement versioned rounds with immutable asker/respondent, agreed level, card key/catalog version, topic and phase. Keep private selections and per-person feedback behind participant-owned RLS. Realtime publishes readiness and the permitted shared result, never the other's unrevealed choices.
4. Enforce submissions on the server: authenticated membership; current round/version; valid option IDs for this level/card; one accepted event per participant/action; no reveal before both submit. Required feedback needs both a valid feeling and a valid pace. Pass/stop remain separate explicit events, not synthetic feedback.
5. Compute prediction-match evidence server-side from the submitted choices. Record direction (who predicted whom), level, topic, card version and sample count. Prediction accuracy and shared preferences are different signals. Neither implies compatibility, honesty or consent to intensify. Visible screen duration is exposure, not time speaking.
6. Feed only permitted contextual evidence to the selector; preserve mutual level limits and discomfort precedence from `round-policy.ts`. Reports cite the events used and state sample limitations. No private mismatch choice is exposed through a report.
7. Test two authenticated clients plus an unrelated third client: private reads denied, duplicates and stale events rejected, reconnect restores server state, roles alternate, both approvals are required for shared memory, and one person's discomfort lowers the pace.
8. Verify Auth redirects, Edge Function secrets/configuration, payment webhook destinations, Storage policies and build environment before changing the production route. Run a backup/rollback rehearsal and a two-phone acceptance session before replacing the original game.

## Implemented independently of transfer

The preview now opens directly on the question, requires explicit feeling and pace on completed conversation cards, and uses a four-language catalog with 16 questions, 16 matching followups, and separate prediction/matching/action content for each level. Local round outcomes include level/topic/card version context. This is in-memory preview evidence, not persisted Supabase data or an AI analysis.

## Official references checked

- https://supabase.com/docs/guides/platform/project-transfer
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/platform/migrating-within-supabase
- https://supabase.com/changelog.md (reviewed; database/API exposure changes must be checked against the actual source version before applying migrations)

## Product correction and launch runbook

The product is two phones, one identity per participant. The one-screen experience is only a local card demo. See [two-phone-launch.md](two-phone-launch.md) for the current access blocker, owner transfer steps, environment setup, server integration contract and release criteria. Inventory rechecked on 27 October: original project is still absent from both connected accounts.
