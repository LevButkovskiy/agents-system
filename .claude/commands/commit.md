# commit

Sync CLAUDE.md, stage all changes, and prepare a conventional commit message — but do NOT commit.

## Steps

1. Invoke the `sync-claude-md` skill to update CLAUDE.md if needed.

2. Run `git status` and `git diff --cached` (plus `git diff` for unstaged) to get the full picture of what will be committed. Also run `git log --oneline -5` to match the repo's commit style.

3. Stage relevant changed files with `git add` (specific file names — never `git add -A` or `git add .` to avoid committing `.env` or other sensitive files). Include `CLAUDE.md` if it was modified in step 1.

4. Analyze all staged changes and pick the right conventional commit type:
   - `feat:` — new user-facing feature or capability
   - `fix:` — bug fix
   - `refactor:` — restructuring without behavior change
   - `chore:` — build, tooling, deps, config (no production code)
   - `docs:` — documentation only
   - `test:` — tests only
   - `style:` — formatting, linting (no logic change)
   - `perf:` — performance improvement

   Add a scope in parentheses when changes are clearly scoped to one module, e.g. `feat(telegram):` or `chore(deps):`.

5. Write a commit message:
   - Subject line: `<type>(<scope>): <short imperative summary>` — max 72 chars, no period
   - Body (optional): max 1-2 sentences, plain language, no bullet points — only if the subject alone isn't enough

6. Write the message to `.git/COMMIT_EDITMSG` using a HEREDOC so it pre-populates the next `git commit`:

   ```
   cat <<'EOF' > .git/COMMIT_EDITMSG
   <subject line>

   <optional body>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   ```

   Do NOT run `git commit`. Stop here.

7. Show the prepared message to the user and tell them to run `git commit` to finalize.
