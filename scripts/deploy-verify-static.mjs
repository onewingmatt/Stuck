#!/usr/bin/env node
/**
 * deploy-verify-static — prove a BUILT-artifact deploy came from this revision.
 *
 * For static deploys (nginx serving a vite/webpack output) there is no verbatim file to hash
 * against git: the container holds build output, and `git show HEAD:dist/...` does not exist.
 * The provenance chain is instead:
 *
 *   clean worktree at HEAD  ->  local build output  ==  bytes the container is serving
 *
 * Step 1 matters as much as step 2: if the tree was dirty when the artifact was built, the bytes
 * cannot be attributed to HEAD at all, so this fails rather than guessing.
 *
 * Config (same deploy.json shape, with `artifact` instead of `files`):
 *   {
 *     "host": "onewing@10.0.0.145",
 *     "container": "mahjong_ascent",
 *     "artifact": { "localDir": "dist", "containerDir": "/usr/share/nginx/html", "trackedPrefix": "src" },
 *     "url": "https://mahjong.onewing.top/"
 *   }
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const cfgPath = process.argv[2] || join(HERE, '..', 'deploy.json');
if (!existsSync(cfgPath)) {
  console.error(`deploy-verify-static: no ${cfgPath}`);
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const art = cfg.artifact;
if (!art || !art.localDir || !art.containerDir) {
  console.error('deploy-verify-static: deploy.json needs artifact.localDir and artifact.containerDir');
  process.exit(2);
}
const repoRoot = join(HERE, '..');
const md5 = (b) => createHash('md5').update(b).digest('hex').slice(0, 8);
const sh = (cmd, opts = {}) => {
  try {
    return { out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }), code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? 1 };
  }
};

const fails = [];
console.log(`◈ deploy-verify-static — ${cfg.host}:${cfg.container} (${art.containerDir})`);

// 1. the tree must be clean where it matters, or the artifact cannot be attributed to HEAD
const dirty = sh(`git status --porcelain${art.trackedPrefix ? ` -- ${art.trackedPrefix}` : ''}`, { cwd: repoRoot });
if (dirty.code !== 0) {
  fails.push('not a git repo here — cannot attribute the artifact to a revision');
} else if (dirty.out.trim()) {
  fails.push(`worktree is DIRTY under ${art.trackedPrefix || 'the repo'} — the artifact cannot be attributed to HEAD: ${dirty.out.trim().split('\n').length} changed path(s)`);
} else {
  const head = sh('git rev-parse --short HEAD', { cwd: repoRoot }).out.trim();
  console.log(`  tree clean at ${head} (the artifact is attributable to it)`);
}

// 2. every local artifact file must exist in the container with the same bytes
const walk = (dir, base = dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push(relative(base, p));
  }
  return acc;
};
const localDir = join(repoRoot, art.localDir);
if (!existsSync(localDir)) {
  fails.push(`${art.localDir} does not exist — build it first (the deploy cannot be checked without a local build)`);
} else {
  const files = walk(localDir);
  if (!files.length) fails.push(`${art.localDir} is empty`);
  const remote = sh(
    `ssh -o ConnectTimeout=25 -o BatchMode=yes ${cfg.host} ${JSON.stringify(`docker exec ${cfg.container} sh -c 'cd ${art.containerDir} && find . -type f | sort | xargs md5sum'`)}`,
  );
  const have = new Map();
  for (const line of remote.out.split('\n')) {
    const m = line.match(/^([0-9a-f]{32})\s+\.\/(.+)$/);
    if (m) have.set(m[2].trim(), m[1].slice(0, 8));
  }
  let ok = 0;
  for (const rel of files) {
    const want = md5(readFileSync(join(localDir, rel)));
    const got = have.get(rel);
    if (!got) fails.push(`${art.containerDir}/${rel}: missing from the container`);
    else if (got !== want)
      fails.push(
        `${art.containerDir}/${rel}: serving ${got}, local build is ${want} — the served bytes and the local build disagree. Identify WHICH side is stale before concluding the deploy is wrong: rebuild locally (npm run build) and re-check, then diff the served file against the built one. Measured case: this fired because the local dist-server predated the fix, while the container was correct.`,
      );
    else ok++;
  }
  console.log(`  ${ok}/${files.length} artifact files byte-identical between ${art.localDir} and the container`);
}

if (cfg.url) {
  const status = sh(`curl -s -o /dev/null -w '%{http_code}' ${cfg.url}`).out.trim();
  const want = String(cfg.expectStatus ?? 200);
  if (status !== want) fails.push(`${cfg.url}: answered ${status}, expected ${want}`);
  else console.log(`  ${cfg.url} -> ${status}`);
}

if (fails.length) {
  console.error(`\n  DEPLOY VERIFY FAILED — ${fails.length} problem(s):`);
  for (const f of fails) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('  deploy verify PASSED — the running artifact is this revision\'s build');
