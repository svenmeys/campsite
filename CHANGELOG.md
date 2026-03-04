# Changelog

## 0.3.0

- **Numbered backlog** — side quests are now numbered lines, not markdown checkboxes
- **`sq done <n>`** — remove side quests by number, remaining entries renumber automatically
- **CLI hook variant** — `campsite hook --cli` for a lightweight hook that uses campsite commands directly
- **Stripped `--type`/`--title` from journal** — CLI is a pure pipe-to-file writer, the skill handles formatting
- **Entry types in skill** — journal skill guides agents to categorize sessions (quest, shiny, squirrel, rabbit-hole)
- Code review fixes: explicit repo args, session-numbered plan files, sync file writes, cleaned imports

## 0.2.0

- **Vocabulary overhaul** — trail log→journal, trail map→context, cairn→sq, switchbacks→decompose, summit check→ship
- **Simplified commands** — `campsite context` reads, `campsite context "text"` writes, `campsite context -` for piped stdin
- **Folder consolidation** — merged quests+plans into `plans/`
- **First-run setup** — `campsite init` prompts for stash location on first run
- **Tests** — 26 tests across 4 files (args, config, session, stash)
- **Testability** — env var overrides (`CAMPSITE_STASH_ROOT`, `CAMPSITE_CONFIG_DIR`), lazy config evaluation
- **Absolute paths in config** — `~` resolved before writing to `config.json`
- **stdin fix** — explicit `-` flag prevents hanging in `&&` chains and non-TTY contexts
- Updated all skills, instructions, and README with new terminology

## 0.1.0

- Initial release
- Commands: init, log, sq, context, status, backlog, hook, config
- Session numbering (YYYY-MM-DD-S{N}.md)
- Skills: journal, sq, decompose, ship
- Instructions: Claude Code, Codex, Cursor
- Session-start hook with auto-install
- Published as `@svenmeys/campsite` on npm
