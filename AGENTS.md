<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Shared detail dialogs stay within the dynamic viewport; summary and transaction layouts adapt to container width so nested details remain readable on narrow screens.
- Recurring expenses use owner-scoped Cloud rows and a daily SQL scheduler; occurrence keys prevent duplicates and the local ledger imports each generated row once without changing existing PIN data.
- Transaction-form recurrence starts in the following month and retains the Cloud recurrence ID on the local transaction so saving edits cannot create a second schedule.
- Share the descending-value chart sorter between the category list and arrow labels so the highest expenses stay first and at the top of each label column.
- Detail transaction cards expose their category color through a CSS variable; shared CSS owns the neutral background and readable typography without changing financial value tones.
- Each dashboard category card carries its own limit bar (dark track, spend fill, "Limite R$ X · Y%" line) via CategoryLimitBar and the shared limitBar helper; no standalone bar chart, and bars must not cause horizontal scrolling on narrow screens.
- CloudSyncProvider owns auth transitions and owner-scoped financial snapshots; revision-checked writes and three-way merges preserve offline edits and deletions across devices.
- Keep local caches account-scoped and import legacy device data once; cloud PINs use salted PBKDF2 hashes, never plaintext, and account authentication remains the security boundary.
- Financial PDF exports use a saved snapshot without PIN fields, a shared spreadsheet model (report-data) rendered as vector PDF tables with user-chosen text size, contrast and orientation, and as CSV in the same layout and embedded Unicode fonts; prepare before a separate download click to retain mobile file-sharing support.
- Keep PDF defaults in a browser-safe options module shared by the export dialog and renderer; wrap full category/item descriptions in dynamically sized, paginated table rows to prevent truncation.
- PDF report rows preserve individual transactions and their registered dates via an explicit report-model option; CSV retains its existing description-based aggregation.
- CinematicScene owns decorative pointer/scroll parallax planes with requestAnimationFrame and reduced-motion cleanup; shared CSS owns materials and reveal motion so financial content remains stationary and readable.
- Preserve the pre-migration financial schema in a replay-safe managed baseline; verify reconstruction with isolated PostgreSQL tests so schema recovery never requires exporting user data.
- Dashboard currency uses FitAmount to measure its available width and shrink only when needed; keep monetary strings unbroken so compact cards never split cents onto another line.
- Login artwork uses CDN-hosted crops for the brand and floor, with actual OAuth/PIN controls between them; never render mockup fields as if they were interactive.
