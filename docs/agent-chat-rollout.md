# Direct-payment agent chat rollout

1. Deploy the compatible backend with offer creation gated until the index exists. Stop policy-writing traffic and the batch worker before applying migration; never overlap an older writer.
2. Run `npm run migrate:purchase-open -- --check`. It reads policies and reports duplicate open purchases without changing records. Resolve conflicts explicitly; the migration never deletes or cancels them.
3. With writers paused, run `npm run migrate:purchase-open -- --apply`, then repeat `--check`. This backfills purchaseOpen and creates the one_open_purchase index. If interrupted, keep writers paused and rerun --apply; it is idempotent.
4. Resume the new backend/worker and deploy the frontend. Old purchasePolicy callers receive instructions to contact the agent, never an active policy.

Clients pay agents directly. Confirmation records the agent's acknowledgment, not independently verified funds. New policies use accepted coverage snapshots. Chat data is participant-only; admins see issued policies but no draft offers/messages.

Rollback: hide new frontend actions, leave saved records in place, and keep the direct-activation endpoint blocked. Do not drop the unique index or restore old writers that ignore purchaseOpen. No automatic deletion, cancellation, or refund is performed.
