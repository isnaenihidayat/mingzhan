import { homedir } from "node:os";
import path from "node:path";
import {
  comparablePath,
  getUserConfigDir,
  resolveWithRealpath,
} from "@mingzhan/core";

const MINGZHAN_SECRET_FILE_PATTERN =
  /(?:^|[\s/=:<>(`])(?:config\.ini|local-auth-token|tool-credentials\.key|whatsapp-context-token|mingzhan\.(?:sqlite|db))(?=$|[\s;|&)<>`])/i;

/** Credential or database shapes, refused when the command also reaches the config dir. */
const MINGZHAN_STATE_PATTERN =
  /\.(?:sqlite3?|db|ini|key)\b|\bsqlite3\b|token|\/auth\b/i;

const SHELL_WORD_DELIMITER = /[\s;|&<>()`]+/;

const OTHER_WORKSPACE_REFUSAL =
  "Refused: this command reaches into MíngZhàn's org data outside this profile's workspace. Bash can only read this profile's own files. Use the MíngZhàn tools assigned to this profile for anything else.";

const MINGZHAN_STATE_REFUSAL =
  "Refused: this command reads MíngZhàn's internal state (local auth token, config.ini, credential keys, or server SQLite databases). The bash tool cannot call the MíngZhàn API or read its databases. Use the MíngZhàn tools assigned to this profile; if no tool fits, tell the user what is missing.";

/**
 * Defense in depth, not a sandbox: refuse commands that name MíngZhàn's secret
 * files or reach into the config dir for credentials and databases. Profile
 * workspaces under the config dir stay usable.
 */
export function refuseMíngZhànStateAccess(
  command: string,
  cwd: string,
  workspaceDirs: string[]
): void {
  // Fold quoting, backslashes, and ${VAR} into one shape before matching.
  const normalized = command
    .replaceAll("\\", "/")
    .replace(/["']/g, "")
    .replace(/\$\{(\w+)\}/g, "$$$1");

  if (MINGZHAN_SECRET_FILE_PATTERN.test(normalized)) {
    throw new Error(MINGZHAN_STATE_REFUSAL);
  }

  if (
    MINGZHAN_STATE_PATTERN.test(normalized) &&
    reachesMíngZhànConfigDir(normalized, cwd, workspaceDirs)
  ) {
    throw new Error(MINGZHAN_STATE_REFUSAL);
  }

  // Other orgs' and profiles' files hold no secret-shaped name, so the
  // pattern gate above never sees them. Anything under orgs/ outside this
  // profile's workspace is refused.
  if (reachesMíngZhànConfigDir(normalized, cwd, workspaceDirs, "orgs")) {
    throw new Error(OTHER_WORKSPACE_REFUSAL);
  }
}

function reachesMíngZhànConfigDir(
  command: string,
  cwd: string,
  workspaceDirs: string[],
  subdir = ""
): boolean {
  const configDir = path.resolve(getUserConfigDir());
  const configRoots = [configDir, resolveWithRealpath(configDir)];
  const scopes = configRoots.map((root) => path.join(root, subdir));

  const exemptDirs = workspaceDirs
    .flatMap((dir) => [path.resolve(dir), resolveWithRealpath(dir)])
    .filter((dir) =>
      configRoots.some((root) => isInsideDir(dir, root) && dir !== root)
    );

  // With a subdir, a parent of it inside the config dir counts too:
  // `grep -r x ~/.mingzhan` reads orgs/.
  const reachesState = (target: string) =>
    configRoots.some((root) => isInsideDir(target, root)) &&
    scopes.some(
      (scope) =>
        isInsideDir(target, scope) ||
        (subdir !== "" && isInsideDir(scope, target))
    ) &&
    !exemptDirs.some((dir) => isInsideDir(target, dir));

  const homeRelative = path
    .relative(homedir(), configDir)
    .replaceAll("\\", "/");

  const prefixes = new Map<string, string>([
    ["$MINGZHAN_CONFIG_DIR", configDir],
  ]);

  for (const root of configRoots) {
    prefixes.set(root.replaceAll("\\", "/"), root);
  }

  if (homeRelative && !homeRelative.startsWith("..")) {
    for (const home of ["~", "$HOME"]) {
      prefixes.set(`${home}/${homeRelative}`, configDir);
    }
  }

  for (const [prefix, root] of prefixes) {
    let index = command.indexOf(prefix);

    while (index !== -1) {
      const rest = command.slice(index + prefix.length);
      const tail = rest.split(SHELL_WORD_DELIMITER)[0] ?? "";

      if (
        (tail === "" || tail.startsWith("/")) &&
        reachesState(path.join(root, tail))
      ) {
        return true;
      }

      index = command.indexOf(prefix, index + prefix.length);
    }
  }

  // Globs never match the literal prefixes above: the shell expands
  // `~/.nak?ma/config.ini`, a glob inside a variable assignment, a bracket
  // expression, or a brace list only at command time. Substitute the
  // assignments this command makes, expand brace alternatives, resolve the
  // word against the cwd (which folds `..`), then compare segment by segment
  // against the scope root. A word pinned inside an exempt workspace keeps
  // its trailing globs, so ordinary workspace globs still run.
  const scopeSegments = pathSegments(path.join(configDir, subdir));
  const assignments = collectShellAssignments(command);

  for (const rawWord of command.split(SHELL_WORD_DELIMITER)) {
    const word = rawWord.replace(/^\w+=/, "");
    const substituted = substituteShellVars(word, assignments, configDir);

    if (!hasGlobChars(substituted)) {
      continue;
    }

    for (const alternative of expandBraces(substituted)) {
      const resolved = path.resolve(cwd, alternative);

      // A brace list can expand to a plain path (`~/.nak{ma,x}/...`), so those
      // alternatives go through the literal containment check instead.
      if (hasGlobChars(alternative)) {
        if (globWordReachesScope(resolved, scopeSegments, exemptDirs)) {
          return true;
        }
      } else if (reachesState(resolved)) {
        return true;
      }
    }
  }

  return command
    .split(SHELL_WORD_DELIMITER)
    .some(
      (word) => word.includes("..") && reachesState(path.resolve(cwd, word))
    );
}

function isInsideDir(target: string, dir: string): boolean {
  const relative = path.relative(comparablePath(dir), comparablePath(target));

  return (
    relative === "" || !(relative.startsWith("..") || path.isAbsolute(relative))
  );
}

/** Fold separators (and case on Windows) so glob words compare against real paths. */
function globComparable(value: string): string {
  const slashes = value.replaceAll("\\", "/");

  return process.platform === "win32" ? slashes.toLowerCase() : slashes;
}

function pathSegments(value: string): string[] {
  return globComparable(value)
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".");
}

/** Every shell glob family this gate can resolve: `*`, `?`, `[...]` and `{a,b}`. */
function hasGlobChars(word: string): boolean {
  return /[*?[{]/.test(word);
}

function segmentMatches(word: string, actual: string): boolean {
  return hasGlobChars(word)
    ? globWordToRegExp(word).test(actual)
    : word === actual;
}

/**
 * A shell word as a matcher for one concrete segment. `*` and `?` stay inside
 * the segment, `[...]` becomes a character class, and `{a,b}` becomes an
 * alternation, so a pattern that can name the scope root also matches it.
 */
function globWordToRegExp(word: string): RegExp {
  const source = translateGlob(word);

  return new RegExp(`^${source}$`);
}

const POSIX_CLASSES = {
  "[:alnum:]": "a-zA-Z0-9",
  "[:alpha:]": "a-zA-Z",
  "[:blank:]": " \\t",
  "[:digit:]": "0-9",
  "[:lower:]": "a-z",
  "[:space:]": "\\s",
  "[:upper:]": "A-Z",
  "[:word:]": "a-zA-Z0-9_",
  "[:xdigit:]": "0-9a-fA-F",
} satisfies Record<string, string>;

function findClosingBracket(word: string, openIndex: number): number {
  let index = openIndex + 1;

  if (word[index] === "!" || word[index] === "^") {
    index += 1;
  }

  if (word[index] === "]") {
    index += 1;
  }

  while (index < word.length) {
    if (word[index] === "[" && word[index + 1] === ":") {
      const classEnd = word.indexOf(":]", index + 2);

      if (classEnd !== -1) {
        index = classEnd + 2;
        continue;
      }
    }

    if (word[index] === "]") {
      return index;
    }

    index += 1;
  }

  return -1;
}

function translateGlob(word: string): string {
  let source = "";

  for (let index = 0; index < word.length; index += 1) {
    const ch = word[index] ?? "";

    if (ch === "?") {
      source += "[^/]";
      continue;
    }

    if (ch === "*") {
      source += "[^/]*";
      continue;
    }

    if (ch === "[") {
      const close = findClosingBracket(word, index);

      if (close !== -1) {
        source += translateBracket(word.slice(index + 1, close));
        index = close;
        continue;
      }
    }

    if (ch === "{") {
      const close = word.indexOf("}", index + 1);

      if (close !== -1) {
        const alternatives = word
          .slice(index + 1, close)
          .split(",")
          .map((part) => translateGlob(part));

        source += `(?:${alternatives.join("|")})`;
        index = close;
        continue;
      }
    }

    source += escapeRegExpChar(ch);
  }

  return source;
}

/** `[abc]`, `[a-z]`, `[]8]`, `[[:alnum:]]` and `[!abc]` as a character class. */
function translateBracket(body: string): string {
  if (body === "") {
    return "\\[\\]";
  }

  const negated = body.startsWith("!") || body.startsWith("^");
  const content = negated ? body.slice(1) : body;

  // One pass: escape backslash and `]`, and expand POSIX classes, so the
  // `\s` from `[:space:]` is not escaped again into a literal backslash.
  const escaped = content.replace(/\[:[a-z]+:\]|[\\\]]/g, (match) =>
    match.length === 1 ? `\\${match}` : (POSIX_CLASSES[match] ?? "")
  );

  return negated ? `[^/${escaped}]` : `[${escaped}]`;
}

function escapeRegExpChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `NAME=value` assignments this command makes, in order. */
function collectShellAssignments(command: string): Map<string, string> {
  const assignments = new Map<string, string>();

  for (const word of command.split(SHELL_WORD_DELIMITER)) {
    const match = /^([A-Za-z_]\w*)=(.*)$/.exec(word);

    if (match?.[1] !== undefined) {
      assignments.set(match[1], match[2] ?? "");
    }
  }

  return assignments;
}

/**
 * Expand the variable references a later word may hide the config dir behind.
 * A name assigned earlier in the same command wins; the shorthands this gate
 * already knows stay expanded. Unknown names stay literal, which keeps the
 * comparison conservative.
 */
function substituteShellVars(
  word: string,
  assignments: Map<string, string>,
  configDir: string
): string {
  const withVars = word.replace(
    /\$\{?([A-Za-z_]\w*)\}?/g,
    (whole, name: string) => {
      const assigned = assignments.get(name);

      if (assigned !== undefined) {
        return assigned;
      }

      if (name === "HOME") {
        return homedir();
      }

      if (name === "MINGZHAN_CONFIG_DIR") {
        return configDir;
      }

      return whole;
    }
  );

  return expandHomePrefix(withVars, configDir);
}

/** Expand the leading home and config-dir shorthands a glob word may hide behind. */
function expandHomePrefix(word: string, configDir: string): string {
  if (word === "~" || word.startsWith("~/")) {
    return `${homedir()}${word.slice(1)}`;
  }

  if (word === "$HOME" || word.startsWith("$HOME/")) {
    return `${homedir()}${word.slice("$HOME".length)}`;
  }

  if (word.startsWith("$MINGZHAN_CONFIG_DIR")) {
    return `${configDir}${word.slice("$MINGZHAN_CONFIG_DIR".length)}`;
  }

  return word;
}

const MAX_BRACE_ALTERNATIVES = 1000;

function expandNumericSequence(
  startStr: string,
  endStr: string,
  stepStr?: string
): string[] {
  const start = Number.parseInt(startStr, 10);
  const end = Number.parseInt(endStr, 10);
  let step = stepStr === undefined ? 1 : Math.abs(Number.parseInt(stepStr, 10));

  if (step === 0) {
    step = 1;
  }

  const isZeroPadded =
    (startStr.length > 1 && startStr.startsWith("0")) ||
    (endStr.length > 1 && endStr.startsWith("0"));

  const width = Math.max(startStr.length, endStr.length);
  const count = Math.floor(Math.abs(end - start) / step) + 1;

  if (count > MAX_BRACE_ALTERNATIVES) {
    throw new Error(MINGZHAN_STATE_REFUSAL);
  }

  const result: string[] = [];
  const dir = start <= end ? 1 : -1;
  const actualStep = step * dir;

  for (let val = start; dir > 0 ? val <= end : val >= end; val += actualStep) {
    let str = String(val);

    if (isZeroPadded && str.length < width && val >= 0) {
      str = str.padStart(width, "0");
    }

    result.push(str);
  }

  return result;
}

function expandCharSequence(
  startChar: string,
  endChar: string,
  stepStr?: string
): string[] {
  const start = startChar.charCodeAt(0);
  const end = endChar.charCodeAt(0);
  let step = stepStr === undefined ? 1 : Math.abs(Number.parseInt(stepStr, 10));

  if (step === 0) {
    step = 1;
  }

  const count = Math.floor(Math.abs(end - start) / step) + 1;

  if (count > MAX_BRACE_ALTERNATIVES) {
    throw new Error(MINGZHAN_STATE_REFUSAL);
  }

  const result: string[] = [];
  const dir = start <= end ? 1 : -1;
  const actualStep = step * dir;

  for (let val = start; dir > 0 ? val <= end : val >= end; val += actualStep) {
    result.push(String.fromCharCode(val));
  }

  return result;
}

function expandBraceInner(inner: string): string[] | null {
  const numMatch = /^([+-]?\d+)\.\.([+-]?\d+)(?:\.\.([+-]?\d+))?$/.exec(inner);

  if (numMatch?.[1] && numMatch[2]) {
    return expandNumericSequence(numMatch[1], numMatch[2], numMatch[3]);
  }

  const charMatch = /^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.([+-]?\d+))?$/.exec(inner);

  if (charMatch?.[1] && charMatch[2]) {
    return expandCharSequence(charMatch[1], charMatch[2], charMatch[3]);
  }

  if (inner.includes(",")) {
    return inner.split(",");
  }

  return null;
}

/**
 * Expand brace lists and sequences (`~/.nak{ma,x}/...`, `{8..8}`, `{a..z}`).
 * Capped at 1,000 alternatives to prevent denial-of-service stalls.
 */
function expandBraces(word: string): string[] {
  let current = [word];

  for (let depth = 0; depth < 8; depth += 1) {
    let hasMore = false;
    const next: string[] = [];

    for (const item of current) {
      const open = item.indexOf("{");

      if (open === -1) {
        next.push(item);
        continue;
      }

      const close = item.indexOf("}", open + 1);

      if (close === -1) {
        next.push(item);
        continue;
      }

      const inner = item.slice(open + 1, close);
      const alternatives = expandBraceInner(inner);

      if (!alternatives) {
        next.push(item);
        continue;
      }

      hasMore = true;
      const prefix = item.slice(0, open);
      const suffix = item.slice(close + 1);

      for (const alt of alternatives) {
        next.push(`${prefix}${alt}${suffix}`);

        if (next.length > MAX_BRACE_ALTERNATIVES) {
          throw new Error(MINGZHAN_STATE_REFUSAL);
        }
      }
    }

    current = next;

    if (!hasMore) {
      break;
    }
  }

  return current;
}

/**
 * True when the glob word can name the scope root or anything under it. A word
 * whose leading segments equal an exempt workspace path is pinned there, so
 * its trailing globs can only name workspace files.
 */
function globWordReachesScope(
  word: string,
  scopeSegments: string[],
  exemptDirs: string[]
): boolean {
  const words = pathSegments(word);

  if (words.length < scopeSegments.length) {
    // A strict ancestor (or an unrelated path): the literal pass owns those.
    return false;
  }

  for (let index = 0; index < scopeSegments.length; index += 1) {
    if (!segmentMatches(words[index] ?? "", scopeSegments[index] ?? "")) {
      return false;
    }
  }

  for (const dir of exemptDirs) {
    const exemptSegments = pathSegments(dir);

    if (exemptSegments.length === 0 || words.length < exemptSegments.length) {
      continue;
    }

    let pinned = true;

    for (let index = 0; pinned && index < exemptSegments.length; index += 1) {
      pinned = words[index] === exemptSegments[index];
    }

    if (pinned) {
      return false;
    }
  }

  return true;
}
