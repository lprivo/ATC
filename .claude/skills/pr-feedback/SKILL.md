---
name: pr-feedback
source: own
description: Address PR review feedback on the current branch by agreeing each comment with the author before coding, implementing, verifying, pushing, then replying; use when a pull request has unresolved review comments.
---

## Config

Needs: `code-host`, `default-branch`.

Read `.claude/skills-config.md` in the project, then `~/.claude/skills-config.md`; the project file wins per field. For each needed field that is missing, ask the user once (one question, with a recommended answer inferred from the repo), use the answer for this run, then offer to save it to the project or user config. Never guess a missing field. The `skills-config` skill describes each field.

Handle the complete PR feedback loop: fetch unresolved comments, agree each one with the author before writing any code, implement, review the fix itself, commit and push, **then** reply on the code host, re-request review, and capture a lesson when a recurring pattern emerges. A bot's comments run unattended end to end; a teammate's are agreed item by item. Forward any extra instructions given with the invocation (e.g. "Don't defer anything") into the decisions you make below.

This skill assumes a GitHub-style pull request workflow (the examples use the `gh` CLI); adapt the commands to the project's code host. Discover the project's build, test, lint and type-check commands from the repo (README, CI config, package manifests) rather than assuming a stack.

**Critical ordering rule.** Replying and resolving are separate actions, but the same risk applies to both: if either lands before the commit is pushed to the remote, reviewers see progress on a change that isn't yet on the branch. **Always push first, reply/resolve second.** Phases 6 and 7 enforce this split.

**Never post a reply the user did not ask you to post.** This holds anywhere in the session, including outside the phase flow below. The phases assume an unattended run, and a user driving the session by hand is not one. Two independent triggers, either sufficient on its own:

1. **A question about a reply is never an instruction to post it.** "What should I reply to X", "how would you answer this", "what do you make of this comment" all ask for text, not for an action. Return the draft and stop. This applies from the first turn, with no prior signal needed.
2. **Once the user has posted any reply themselves this session, every later reply is draft-only** for the rest of it. Return the text and wait for them to say post it. Their having posted one by hand is the signal that they are driving the replies, not you.

Neither trigger overrides the unattended path in an actual feedback run: bot reviews and the author's own self-notes still post and resolve without asking (Phase 2.0), because running the skill _is_ the instruction to post those. What these triggers catch is a reply posted when no such instruction was given at all.

## Phase 1: Fetch and Analyse Feedback

1. Fetch the unresolved review threads for the PR on the current branch (e.g. via the code host's API/GraphQL, or `gh pr view --json reviews,comments` plus the review-threads API). Request only unresolved threads to keep the payload small.

2. From the result: verify the current branch, note the PR number/URL, the PR author, and the base commit SHA, count unresolved comments, and flag CI/build failures. Capture the **base SHA now**, before any fix touches the tree; Phases 4a/4b diff against it.

3. Categorise each unresolved comment by type (code quality, security, performance, best practices, style/format, logic/bugs, clarification). Keep each comment's id and its thread id; you will need them in Phase 7. For each thread also record:
   - `requires_approval`: the thread contains a comment from a real teammate (anyone other than the PR author or a bot). This gates the _reply_.
   - `resolvable_by_developer`: every comment in the thread is the PR author's own or a bot's. This gates the _resolve_. A real teammate's comment makes this `false`, because they close their own thread once they see the fix.

   Note both, but don't act on either yet: Phase 7 re-fetches and re-classifies immediately before posting, since this snapshot can be stale by then.

## Phase 2: Analyse, then agree each item with the author (NO code changes yet)

Phase 2 decides **what to do**; Phase 3 writes the code. Nothing is edited here, so an item the author declines costs no wasted work.

### 2.0 Split the threads

Threads where `requires_approval = false` never enter the interactive loop below. That is two sources, and both are unattended by design:

- **Bot reviews** (automated reviewers and the like): machine output the developer judges like any other finding, not a colleague waiting on a reply.
- **The author's own comments**, including a code-review pass they ran on their own PR. These are the author's findings about their own code; they read the whole diff before merging anyway, so routing their own findings back to them for approval adds a decision without adding information.

Analyse both, decide the fix yourself, and carry them into Phase 3 with a drafted reply. They post and resolve unattended in Phase 7. **Their fixes are reviewed exactly as hard as an interactive item's**: Phase 4a/4b covers the whole fix diff, so nothing lands unchecked just because no one was asked about it.

Everything else (any thread a real teammate commented on) goes through 2.1 to 2.3.

### 2.1 Analyse and group

Read every comment with its code context: body, diff hunk, file path, line numbers, prior thread.

**Group by same fix.** If one edit resolves several comments, they are one item, even across files or reviewers. Two comments on the same function that need different changes stay separate items. Grouping is your call; state which comments a grouped item covers when you present it.

**Grouping merges the decision, never the reply.** A grouped item is one proposal and one draft, but it still posts to every thread it covers: each reviewer gets an answer on their own comment, not a pointer to someone else's. Carry the full list of covered thread ids forward; Phase 7 reconciles against it.

Then announce the batch once, before the first item:

> 20 unresolved comments from Alice and Bob, in 14 items (6 grouped). Working through them one at a time.

### 2.2 Present each item: one at a time, never batched

Each item opens in exactly one of two modes.

**Mode A: Proposed solution.** The comment is valid. Show `path:line`, the reviewer, their ask, and the concrete fix you intend: which files change and how.

**Mode B: Rebuttal.** You think the comment is wrong. Argue that case **to the author, here, in place of a proposal**: what the code actually does, why the comment's premise doesn't hold, what would break if you complied. Propose no fix. This argument is for the author only and is never posted to the reviewer; if the author accepts it, they answer the reviewer themselves.

**Escalate to a deep-reasoning design sub-agent before presenting** when either holds:

- The comment is a design/architecture challenge (approach selection, cross-layer root cause, refactor sequencing, boundary placement) **and** the honest fix reaches beyond the commented file/line, crosses a layer/project boundary, changes a public contract, or contradicts the tech design.
- The honest fix is a **revert or removal of a guard, conditional branch, validation, or a tested feature**. This shape can sit entirely inside the commented function and never trip the first trigger, but still needs the same depth of reasoning.

Naming, style, nits, typos, missing tests, local null-checks, and dead-code/unused-import/comment/logging removal never escalate. Spawn the sub-agent directly from this skill (never from inside another sub-agent). Present its decision as the proposal, and cite it in the reply.

**Treat a revert/removal as new code, not a return to known-good.** If the proposal reverts or removes a guard, branch, validation, or a feature together with its tests, state in the proposal what behaviour the removed code prevented and what the resulting state now permits that the default branch does not (this excludes dead code, unused imports, comments, and logging). **Before proposing to delete a test**, name the behaviour it pinned and confirm that behaviour no longer exists; if it still exists, propose replacing the test rather than deleting it. Both statements feed Phase 4a's cross-check and must survive it.

Offer exactly these four options:

1. **Accept**: take the proposal (Mode A) or the rebuttal (Mode B).
2. **Explain the code**: what the referenced code currently does and what the reviewer is pointing at, in plain terms. Teams review across disciplines, so the author may not know the area. Re-shows the menu; never counts as a decision, and can be chosen repeatedly.
3. **Discuss**: argue it out. The author pushes back, you respond, ending in a revised proposal and the menu again. **You may push back more than once, but only while you have a genuinely new argument**; once you would be restating a point the author has already rejected, stop arguing and take their decision. The author is final.
4. **Something else**: the author dictates a different approach, or skips, defers, or declines the item.

### 2.3 Draft the reply immediately, while the context is fresh

As soon as an item is decided, draft its reply into a per-comment scratch file in a git-ignored scratch directory (e.g. `reply-<short-slug>.md`), and record the reply type (`comment` / `fixed` / `deferred` / `ignored`) with each covered comment's id and thread id. Show the draft to the author for a glance, to amend or accept, while the reasoning is still fresh. Phase 7 shows the whole set once more before anything posts, so this is a quick look, not a second sign-off.

**Write the body text only. Don't prefix it with `[FIXED]`/`[DEFERRED]`/etc. yourself** if your posting step adds that tag from the reply type; a pre-tagged draft is double-tagged.

Reply type guidance: `fixed` if the code will change, `comment` for a clarification, `deferred` for valid-but-out-of-scope (explain), `ignored` if the item was declined (always explain).

**Never post a rebuttal to the reviewer.** Where the author accepted a Mode B rebuttal, record the thread as `needs-author-response` with factual context only: what the comment asked, why the code did not change. Phase 7 presents those with no draft; the author answers the reviewer directly.

Then move to the next item. **Do not post any reply yet.** Replies post in Phase 7, after the push.

## Phase 3: Implement every accepted item

Only now does code change. Work through the decisions from Phase 2 in one pass: accepted proposals, author-dictated approaches, and the unattended items from 2.0 (bot reviews and the author's own comments). Skipped, deferred and declined items produce no code.

Make the changes following DRY/KISS/SOLID and the project's conventions. Look for the same issue in nearby code and fix it there too. If a reviewer pushed a deliberately-incomplete "suggestions" commit (pseudo-code hints, broken references), treat it as a refactoring blueprint: build first to surface all breakage, then fix from the dependency root outward.

**If an implementation deviates from what the author accepted (a third call site turns up, or the agreed approach does not work), stop and re-open that item.** Show the author what changed and why, take a fresh decision, and re-show that item's reply for amendment. Their approved reply must never describe a fix that did not happen; that is the same false signal the push-before-reply rule exists to prevent.

## Phase 4: Verify and Test

1. Check CI status for the PR (`gh pr checks`); fix any failures introduced by the new changes.
2. Run the verifications appropriate to the impacted areas, using the project's own commands: build, type-check, lint, and tests for each affected package/project.
3. If the project has an end-to-end or integration suite relevant to the changed files, run the relevant subset now, against the code as it stands after this round's fixes. If the command that determines "what changed" itself fails, treat that as a real failure, not "nothing to run". A failing or warning result is a real regression from this round's fixes: resolve it before continuing, like any other test failure.

Do not run the commit/formatting hooks by hand here; the commit step in Phase 5 triggers them once. Running them here would duplicate that work.

### Phase 4a + 4b: Review the fix itself (inward + outward, in parallel)

A fix that resolves its own comment can still break something else, and this pass exists because that keeps happening. It covers **every** fix in the diff, interactive and unattended alike: an autonomous run over bot or self-review comments gets the same scrutiny as one the author walked through. Scope the reviews to the fix diff, not the whole PR:

```bash
git fetch origin <default-branch>
git diff <base_sha> > fix.diff   # in a git-ignored scratch location
```

Spawn the following review sub-agents together, in parallel, each given the fix diff:

- **4a inward: behaviour delta.** Checks each changed function's behaviour delta against the default branch, enumerates multi-input condition rows, checks that deleted tests' behaviour actually disappeared, and reasons about conditions in both directions. Never early-exits on a deletion-heavy diff.
- **4b outward: completeness and blast radius.** Catches a fix that touches a shared helper without updating a sibling call site; looks outward from the diff at callers and dependents not updated.
- **4b surfaces: testing, security, and area-specific concerns.** A testing review earns its place on every fix: the inward review only flags a missing test when it can name an uncovered condition row or a deleted test whose behaviour survived, so a fix that adds a plain new branch with no test at all trips neither. Security and area-specific reviews (database migrations, layer boundaries, auth, injection) are cheap on a diff that doesn't reach them but catch a fix that quietly lands there.
- **4b scope: change relevance.** Given the fix diff and the accepted-items scope baseline serialised inline (each `fixed` item's `path:line` and intent, plus the allowance for sanctioned nearby fixes), it maps each fix hunk to an accepted item or a sanctioned category and flags unmapped hunks as creep. It is advisory: unmapped-hunk findings are **not** remediated as defects but ride the Phase 4c carry-forward into the Phase 7 report and the Phase 8 PR description.

**Do not add the general design reviewers here** (SOLID, DRY, complexity, readability, patterns). On a small fix diff they return design opinions rather than regressions, and the volume trains the reader to skim 4c, which is exactly what this gate cannot afford. A full code review is where the whole PR gets that pass.

If sub-agents are unavailable, perform these checks yourself in the same order.

### Phase 4c: Remediate

A finding that is a straightforward defect in your own implementation (a missed call site, a typo, a stale reference) you fix directly, then re-run 4a+4b.

**A finding that invalidates a solution the author accepted goes back to the author.** If the review shows the agreed approach breaks something they never saw, re-open that item with the finding attached and take a fresh decision, exactly as in Phase 3. Never silently redesign an approved fix.

Cap at **two remediation rounds**. Anything still open past the cap is carried into the Phase 7 report and the PR description, never silently dropped.

If 4a reports an uncovered multi-input row or a deleted test whose behaviour survives, or the testing review names an untested branch the fix introduced, hand those rows/behaviours as the literal spec to a test-writing sub-agent (or write the tests yourself). The enumeration already happened in the cheap read-only pass; only the missing test itself goes to the test-writer, and only when there is an actual gap.

## Phase 5: Commit

Commit the changes with a short message (`Address PR feedback: <brief summary>`), following the project's commit conventions. Let the project's commit hooks (formatting, lint, type-check) run once, and fix formatting auto-fixes if they alter files. Never skip hooks and never amend commits; every change is a new commit.

## Phase 6: Push

Push to the remote branch.

**Do not proceed to Phase 7 until the push completes successfully.** If the push fails (rejected, network error, branch deleted upstream), stop and surface the error to the user. Replying now would falsely signal "fixed" for a change that is not on the remote.

If the push reveals the upstream branch is gone (e.g. the PR was merged or the branch deleted while you were working), stop and tell the user. Resolving threads on a stale/closed PR doesn't help anyone; the fix likely needs a new branch + PR.

## Phase 7: Post the agreed replies

Every solution posted about here was already agreed in Phase 2, so this phase does not reopen decisions. It does two things first: re-check whether the world moved underneath it, and show the author the replies as a set before any of them lands on the code host.

### Two decisions baked in (don't re-ask)

- **The solution gate lives in Phase 2, not here.** The author decided each fix before any code was written; the read-through below covers the reply text, never the decision behind it. Re-litigating a settled item now is the approval fatigue this design removes.
- **Resolving is never offered for a thread a real teammate touched.** `resolvable_by_developer` is `false` whenever anyone other than the PR author or a bot commented. That reviewer closes their own thread once they see the fix, the same way you wouldn't resolve someone else's comment on a doc by hand. Check each thread's comment authors before resolving; null-author comments, an empty or missing comment list, and threads that hit the API's pagination cap all fail toward gating, never toward auto-posting or auto-resolving.

### Re-fetch before acting

The Phase 1 snapshot can be tens of minutes stale by now. Re-fetch the unresolved threads and re-classify before touching any thread:

- A thread **resolved out-of-band** in the interim is gone from this result and is simply skipped.
- A thread that **first appeared in this re-fetch** has no Phase 2 decision and no draft. If it `requires_approval` (a teammate's), do not invent one: list it in the report as newly arrived and leave it for the next run, which will analyse it in its own Phase 2. If it does **not** (a bot's, or the author's own), handle it now: it needed no approval in the first place, so picking it up mid-run bypasses nothing. Analyse it, and if the fix is code, go back to Phase 3 for it and come through 4-6 again rather than posting a reply for a change that isn't pushed. Only where no code changes (a rebuttal to the bot, or a deferral) reply and resolve from here directly.
- A thread whose **`requires_approval` flipped to `true`** since Phase 1 (a teammate commented mid-run) must not post its Phase 2 draft unseen: that draft was agreed when the thread was still unattended. Show the author the new comment and the existing draft, and take one decision: post as drafted, amend, or hold for the next run.
- A thread whose **`resolvable_by_developer` flipped to `false`** posts its reply but is no longer resolved, whatever Phase 2 assumed.

### Reconcile, then read the whole set through once

Before posting anything, account for **every** unresolved thread in the re-fetch. Each one must land in exactly one bucket:

| Bucket                  | Meaning                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `reply`                 | Has a draft, from its own item or a grouped one                   |
| `needs-author-response` | Mode B rebuttal the author accepted; the author answers, not you  |
| `skipped`               | Author skipped, deferred or declined it in 2.2                    |
| `newly-arrived`         | Teammate thread that first appeared in the re-fetch               |

**A thread in no bucket is a bug, not an omission**, most often a grouped item that replied to its representative thread and forgot the rest. Do not post until every thread is accounted for; if one cannot be, stop and show the author which thread and why.

Then show the full set as one table (thread, reviewer, `path:line`, reply type, and the draft body, or the bucket where there is no draft) with any unaccounted thread flagged. Take **one** decision: post as shown, or name which drafts to amend. This is not a per-item re-approval. The solutions were agreed in Phase 2 and are not reopened here. It is the last chance to read the replies as a set: tone, a `fixed` tag on something that was actually deferred, and above all a thread that quietly has nothing to say.

### Post

For each thread in the `reply` bucket (**every** thread, including each one a grouped item covers, not one per item), in order: post the reply on that comment with its reply type, then resolve the thread only when `resolvable_by_developer` is true.

- **Bot and self-note threads** (`resolvable_by_developer = true`): post and resolve.
- **Teammate threads**: post only. Say "fixed in `<sha>`" where useful and let the commenter resolve once they have seen it.
- **`needs-author-response` threads** (the author accepted a Mode B rebuttal): post nothing. The author answers the reviewer directly; you never post a rebuttal on their behalf. List these in the report.
- **Skipped / declined items**: post nothing, resolve nothing.
- If the thread already has a satisfying answer from the PR author sitting unresolved, don't post a redundant "already answered" reply. That's noise. Say so and move on.

If resolving fails after the reply already posted (network blip, API error, thread resolved concurrently out-of-band), catch it, report that thread distinctly as "posted, resolve failed: `<error>`" in the report and the PR description, and move on. Never retry silently, and never treat it as a reason to stop the whole pass.

### Re-request review

If **at least one reply was posted** this pass, re-request review from every reviewer whose latest review is `CHANGES_REQUESTED`, minus the PR author. This no-ops cleanly if none qualify. If the PR author cannot be determined, fail closed rather than risk re-requesting the author's own review: report "review re-request skipped: could not determine PR author" and continue. **This never fails the pass**: replies and resolves have already landed by this point, and an unattended run must not abort over a best-effort re-request. A reviewer who has since lost repo access surfaces as a distinct per-login failure, not a hard stop. If nothing was posted (the author declined everything), skip this entirely; the review decision stays untouched.

## Phase 8: Update PR Description

Regenerate the PR description from scratch (or delegate that to a PR-writing sub-agent). Analyse the diff against the default branch, follow the repo's PR template if it has one, and describe the **current** state, not chronological history. Running this after the push means the description reflects what is actually on the branch. Include any still-open Phase 4c findings and any "posted, resolve failed" threads from Phase 7.

## Phase 9: Capture a Lesson (only if a real pattern exists)

**Short-circuit.** If you did not detect a **recurring pattern** across the feedback you addressed, skip this phase entirely. Most cycles will skip; that is the point.

A pattern qualifies only if:

- It appeared **more than once** in this cycle, or it clearly repeats issues seen in prior cycles on the same branch/area.
- You can state the lesson in **one clear imperative sentence**.
- It is **generic enough to apply to future work across the area**, not specific to this PR.

If the bar is met, write a short lesson into the project's shared lessons/conventions location (or delegate to a sub-agent that does): a one-paragraph pattern summary (what kept happening, why), the area it applies to, and optional file paths or comment excerpts for context. Check for duplicates against existing lessons and conventions first, and decline if it is already covered. Never edit human-curated rule or pattern files; mention a candidate rule in the PR description for the reviewer to decide.

## Output Format

End with a concise summary:

```markdown
## PR Feedback Resolution Summary

### Comments Addressed: X of Y

**Changes Made:**

1. <file:line> | <issue type> | <what was changed>
2. ...

**Threads:** N fetched; all accounted for (X reply, Y author-response, Z skipped, W newly arrived)
**Items:** X agreed, Y declined/skipped, Z flagged for author (rebuttal accepted)
**Reviewer Replies:** X posted (Y bot/self auto, Z agreed with author), A not posted
**Resolves:** X resolved, Y left open, Z failed-to-resolve (see above)
**Review Re-requested:** yes (N reviewers) | no (nothing posted) | no-op (none qualified) | skipped (author unresolved)
**Fix-diff Review (4a/4b):** clean | N findings fixed in M round(s) | N findings still open (see PR description)
**PR Description:** Rewritten from scratch
**Build Status:** passing, or a warning with specifics
**Lesson:** Wrote <path> | Skipped (already covered) | No pattern detected
```

## Rules

- **Push before you reply or resolve.** Posting or resolving before the commit is on the remote lets reviewers see progress for a change that isn't yet on the branch.
- **Agree the solution before writing the code.** A teammate's comment is decided with the author in Phase 2, one item at a time; nothing is edited until they have accepted. Never present a fix you have already written as a decision they still get to make.
- **Never auto-post to a thread a real teammate touched.** Bot reviews and the author's own self-notes are the unattended paths; a colleague's comment is not.
- **Never post a reply the user did not ask you to post.** A question about what to reply asks for text, not for an action: answer it and stop. And once the user has posted a reply by hand this session, every later reply is draft-only until they say post it. Both triggers hold outside the phase flow, where the failure actually happens.
- **Never resolve a thread a real teammate commented on.** They close their own thread once they've seen the fix: reply, don't resolve. Never override the author/bot safety check.
- **Argue a rebuttal to the author, never to the reviewer.** When you think a comment is wrong, make that case to the author in place of a proposal. If they accept it, they answer the reviewer themselves; you never post a rebuttal on their behalf.
- **The author is final, but you may push back more than once**, only while you have a genuinely new argument. Once you would be restating a point they have rejected, implement their decision.
- **Never silently redesign an approved fix.** If implementation or the fix-diff review invalidates what the author accepted, re-open that item and take a fresh decision.
- **Every fetched thread is accounted for before anything posts.** Reply, author-response, skipped, or newly-arrived: a thread in no bucket is a dropped comment, and grouping is the usual way one goes missing. Grouping merges the decision, never the reply.
- Address all feedback in a single iteration where possible; don't fragment into multiple commits.
- Don't introduce unrelated changes; stay focused on the feedback.
- Never skip commit hooks. Never amend commits.
- Look for the same issue elsewhere in the PR; apply fixes consistently.
