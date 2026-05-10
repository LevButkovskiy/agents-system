# sync-claude-md

Analyze recent git changes and update CLAUDE.md if structural changes warrant it.

## Steps

1. Run `git diff HEAD~1 HEAD -- src/ package.json .env.example` to get the last commit diff. If nothing is staged yet, also check `git diff --cached -- src/ package.json .env.example` for staged changes.

2. Read the current `CLAUDE.md`.

3. Determine if an update is needed. Update ONLY when:
   - A new `src/` module or top-level directory was added or removed → update **Architecture** section
   - A new npm script appeared in `package.json` → update **Commands** section
   - New environment variable keys appeared in `.env.example` → update **Environment Variables** section
   - A new top-level architectural pattern or project-wide convention was introduced

4. Do NOT change CLAUDE.md for:
   - Bug fixes, refactoring, implementation details
   - Model name or version changes
   - Code-level changes (functions, configs, imports, tests)
   - Anything easily derivable by reading source files
   - Adding code snippets or step-by-step tutorials

5. CLAUDE.md style rules (enforce these even if rewriting a section):
   - Max ~80 lines total
   - No code snippets, no specific model IDs, no version numbers
   - Architecture section: directory tree at module level only (not individual files)
   - Patterns/conventions: names and one-line descriptions only
   - Stable, high-level information only

6. If an update is needed, edit `CLAUDE.md` directly and briefly explain what changed and why.

7. If no update is needed, say so in one sentence.
