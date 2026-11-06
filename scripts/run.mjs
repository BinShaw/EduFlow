import { readFile, realpath } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [configPath, command] = process.argv.slice(2);
const allowed = new Set([
  'dev',
  'dev:api',
  'dev:web',
  'db:generate',
  'db:migrate',
  'db:deploy',
  'db:seed',
  'build',
  'test',
  'test:integration',
]);
if (!configPath || !allowed.has(command)) {
  console.error('Usage: node scripts/run.mjs <absolute external env file> <npm script>');
  process.exit(1);
}
const resolved = await realpath(configPath);
const relative = path.relative(await realpath(root), resolved);
if (
  !path.isAbsolute(configPath) ||
  (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
) {
  throw new Error('Configuration must be stored outside the project directory.');
}
const env = { ...process.env, ...parseEnv(await readFile(resolved, 'utf8')) };
const child =
  process.platform === 'win32'
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm run ${command}`], {
        cwd: root,
        env,
        stdio: 'inherit',
        windowsHide: true,
      })
    : spawn('npm', ['run', command], { cwd: root, env, stdio: 'inherit' });
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
child.on('error', () => {
  console.error('Unable to start npm. Check Node.js and PATH.');
  process.exitCode = 1;
});
