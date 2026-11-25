/**
 * PreToolUse guard against whole-tree git staging, ported from ChoiceMods'
 * `.claude/hooks/guard.py` (Node here: ChoiceBuds has no Python venv).
 *
 * Claude Code passes the tool call as JSON on stdin; exit code 2 blocks it and
 * shows stderr to Claude. Rules only look at what a regex can tell apart from
 * quoted, heredoc or here-string text: a rule that fires on a commit message
 * describing the mistake is worse than no rule.
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `<<<` is a here-string, not a heredoc; the delimiter may be quoted, and `<<-` strips leading tabs.
const HEREDOC_OPENER = /(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/g;
// PowerShell here-strings: the closing `'@`/`"@` must start its own line, so the
// body can hold apostrophes that would break the plain quote stripping below.
const PS_HERE_STRING = /@(['"])\r?\n[\s\S]*?\r?\n\1@/g;
// `.` and `./` as a pathspec stage the whole tree, the same as -A.
const GIT_ADD_ALL =
  /\bgit\s+(?:-C\s+\S+\s+)*add\b[^;&|\n]*?\s(?:-[a-zA-Z]*A[a-zA-Z]*|--all|\.\/?)(?=\s|$|[;&|])/;
const GIT_COMMIT_ALL =
  /\bgit\s+(?:-C\s+\S+\s+)*commit\b[^;&|\n]*?\s(?:-[a-zA-Z]*a[a-zA-Z]*|--all)(?=\s|$|[;&|])/;
const QUOTED = /'[^']*'|"(?:\\.|[^"\\])*"/g;

export const GIT_ADD_MESSAGE =
  'Stage files by name, not with `git add -A` or `git add .`: they pick up anything untracked the ignore rules miss.';
export const GIT_COMMIT_MESSAGE =
  "Stage files by name and commit without `-a`: it commits every modified tracked file, not just this leg's.";

/** Return `command` with every heredoc body removed, keeping the lines that open and close it. */
export function stripHeredocBodies(command) {
  const kept = [];
  const pending = [];
  for (const line of command.split('\n')) {
    if (pending.length) {
      const { delimiter, stripTabs } = pending[0];
      const candidate = stripTabs ? line.replace(/^\t+/, '') : line;
      if (candidate.trim() === delimiter) {
        pending.shift();
        kept.push(line);
      }
      continue;
    }
    kept.push(line);
    for (const m of line.matchAll(HEREDOC_OPENER)) {
      pending.push({ delimiter: m[3], stripTabs: m[1] === '-' });
    }
  }
  return kept.join('\n');
}

function unquoted(command) {
  return stripHeredocBodies(command.replace(PS_HERE_STRING, "''")).replace(QUOTED, "''");
}

/**
 * Return the message to block `call` with, or null to let it run.
 * `call` is the PreToolUse payload (`tool_name`, `tool_input`).
 */
export function check(call) {
  const tool = call?.tool_name ?? '';
  if (tool !== 'Bash' && tool !== 'PowerShell') return null;
  const command = unquoted(call.tool_input?.command ?? '');
  if (GIT_ADD_ALL.test(command)) return GIT_ADD_MESSAGE;
  if (GIT_COMMIT_ALL.test(command)) return GIT_COMMIT_MESSAGE;
  return null;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const message = check(JSON.parse(input));
  if (message) {
    process.stderr.write(message + '\n');
    process.exit(2);
  }
}

// Only run as a hook, not when Vitest imports check(). Compared lowercased via
// realpath because Windows hands us `d:` vs `D:` depending on the caller's cwd.
const self = realpathSync(fileURLToPath(import.meta.url)).toLowerCase();
const entry = process.argv[1] ? realpathSync(process.argv[1]).toLowerCase() : '';
if (self === entry) await main();
