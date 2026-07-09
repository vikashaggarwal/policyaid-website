# Instructions for Claude

## Git workflow: fully automatic commit + push

The user (vikashaggarwal) has explicitly authorized fully automatic git operations in this repo:

- Commit and push to `origin/main` immediately after making file changes, with **no confirmation prompts**.
- This applies to routine content/code edits (copy fixes, SEO tweaks, bug fixes, new pages, etc.).
- Still use judgment: skip auto-push (and ask first) for anything unusually risky — e.g. changes touching `policyaid-backend.gs`-adjacent config, DNS/CNAME, deletions of whole pages/sections, or anything that could break the live site rather than just adjust content.
- Write clear, conventional commit messages per existing repo style (see `git log`).

### Why this matters here

There is **no staging environment or CI gate** — every push to `main` triggers an immediate GitHub Pages rebuild and goes live on policyaid.co.in within a couple minutes. "Automatic" push means mistakes go live automatically too. The user has accepted this tradeoff for speed; if something looks destructive or ambiguous, flag it in the response even though you're proceeding, so it's easy to spot and revert.

### Reverting

If a bad push goes live, revert with a new commit (`git revert`) rather than force-pushing/rewriting history, unless the user explicitly asks for a force-push.
