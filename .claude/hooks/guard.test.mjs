import { describe, expect, it } from 'vitest';
import { check, GIT_ADD_MESSAGE, GIT_COMMIT_MESSAGE } from './guard.mjs';

const call = (command, tool = 'Bash') => ({ tool_name: tool, tool_input: { command } });

describe('guard: whole-tree staging is blocked', () => {
  it.each([
    'git add -A',
    'git add .',
    'git add ./',
    'git add --all',
    'git add -Av',
    'git -C sub add -A',
    'npm test && git add .',
    'git add . && git commit -m "x"',
  ])('blocks %s', (command) => {
    expect(check(call(command))).toBe(GIT_ADD_MESSAGE);
    expect(check(call(command, 'PowerShell'))).toBe(GIT_ADD_MESSAGE);
  });

  it.each(['git commit -a', 'git commit -am "msg"', 'git commit --all -m x', 'git commit -m x -a'])(
    'blocks %s',
    (command) => {
      expect(check(call(command))).toBe(GIT_COMMIT_MESSAGE);
      expect(check(call(command, 'PowerShell'))).toBe(GIT_COMMIT_MESSAGE);
    },
  );
});

describe('guard: named staging and quoted text are allowed', () => {
  it.each([
    'git add src/x.ts',
    'git add .claude/hooks/guard.mjs',
    'git add src/x.ts ./docs/a.md',
    'git commit -m "add -A"',
    "git commit -m 'git add . was wrong'",
    'git commit -m "never git commit -a"',
    'git status',
    'git add -p src/x.ts',
  ])('allows %s', (command) => {
    expect(check(call(command))).toBeNull();
    expect(check(call(command, 'PowerShell'))).toBeNull();
  });

  it('ignores a Bash heredoc commit body that describes the mistake', () => {
    const command = [
      "git commit -F - <<'EOF'",
      'fix: stop using git add -A',
      "it's the guard's job to catch git commit -a",
      'EOF',
    ].join('\n');
    expect(check(call(command))).toBeNull();
  });

  it('ignores a PowerShell here-string commit body, apostrophes included', () => {
    const command = [
      "git commit -m @'",
      "don't git add . anymore",
      'and never git commit -a',
      "'@",
    ].join('\n');
    expect(check(call(command, 'PowerShell'))).toBeNull();
  });

  it('still blocks a real command after a heredoc', () => {
    const command = ['cat <<EOF', 'body', 'EOF', 'git add -A'].join('\n');
    expect(check(call(command))).toBe(GIT_ADD_MESSAGE);
  });

  it('ignores tools other than Bash and PowerShell', () => {
    expect(check({ tool_name: 'Write', tool_input: { content: 'git add -A' } })).toBeNull();
  });
});
