import {spawn, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import TelegramBot from 'node-telegram-bot-api';

type ComposeExecResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};

type ComposePsRow = {
  service: string;
  state: string;
  health: string;
  status: string;
  ports: string;
  exitCode: number | null;
};

type LifecycleSummary = {
  warnings: string[];
  containerStates: Array<{ container: string; states: string[] }>;
  otherLines: string[];
};

type HostMetrics = {
  sampledAt: Date;
  cpuUsagePct: number | null;
  cpuCores: number;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  memTotalBytes: number | null;
  memUsedBytes: number | null;
  memUsedPct: number | null;
  swapTotalBytes: number | null;
  swapUsedBytes: number | null;
  swapUsedPct: number | null;
  diskTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskUsedPct: number | null;
  uptimeSec: number | null;
};

type PressureLevel = 'OK' | 'WARN' | 'CRITICAL';

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const ALLOWED_USER_IDS = parseNumericIdSet(process.env.TELEGRAM_ALLOWED_USER_IDS, 'TELEGRAM_ALLOWED_USER_IDS');
const ALLOWED_CHAT_IDS = parseNumericIdSet(process.env.TELEGRAM_ALLOWED_CHAT_IDS);

const DEFAULT_ALLOWED_SERVICES = [
  'backend',
  'cleanup-worker',
  'email-worker',
  'image-worker',
  'redis',
  'postgres',
  'minio',
  'migrate',
  'main',
  'photos',
  'cms',
  'caddy',
  'ops-bot',
];

const ALLOWED_SERVICES = new Set(
  parseStringList(process.env.OPS_BOT_ALLOWED_SERVICES).length
    ? parseStringList(process.env.OPS_BOT_ALLOWED_SERVICES).map((value) => value.toLowerCase())
    : DEFAULT_ALLOWED_SERVICES
);

const EXPLICIT_COMPOSE_FILES = parseStringList(process.env.OPS_BOT_COMPOSE_FILES);
const BASE_COMPOSE_FILES = EXPLICIT_COMPOSE_FILES.length ? EXPLICIT_COMPOSE_FILES : ['docker-compose.yml'];
const COMPOSE_WORKDIR = resolveComposeWorkdir((process.env.OPS_BOT_WORKDIR || '').trim(), BASE_COMPOSE_FILES);
const DEFAULT_COMPOSE_FILES = EXPLICIT_COMPOSE_FILES.length
  ? EXPLICIT_COMPOSE_FILES
  : resolveDefaultComposeFiles(COMPOSE_WORKDIR);
const COMPOSE_ENV_FILE = (process.env.OPS_BOT_ENV_FILE || '').trim();
const COMPOSE_PROJECT_NAME = (process.env.OPS_BOT_PROJECT_NAME || '').trim();
let inferredComposeProjectName: string | null = null;
let inferredComposeFiles: string[] | null = null;
let composeLabelsDetected = false;

const DEFAULT_LOG_LINES = clampInt(process.env.OPS_BOT_DEFAULT_LOG_LINES, 120, 1, 500);
const MAX_LOG_LINES = clampInt(process.env.OPS_BOT_MAX_LOG_LINES, 300, 10, 2000);
const COMMAND_TIMEOUT_MS = clampInt(process.env.OPS_BOT_COMMAND_TIMEOUT_MS, 60_000, 5_000, 10 * 60_000);
const MONITOR_TIMEOUT_MS = 10_000;
const CPU_SAMPLE_DELAY_MS = 300;
const TELEGRAM_MAX_BODY = 3200;
const ANSI_ESCAPE_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

if (!BOT_TOKEN) {
  console.error('Missing required env: TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

if (ALLOWED_USER_IDS.size === 0) {
  console.error('Missing required env: TELEGRAM_ALLOWED_USER_IDS (comma-separated numeric Telegram user IDs).');
  process.exit(1);
}

if (ALLOWED_SERVICES.size === 0) {
  console.error('OPS_BOT_ALLOWED_SERVICES is empty. Refusing to start without service allowlist.');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/^\/start(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;
  await sendHelp(msg.chat.id);
});

bot.onText(/^\/help(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;
  await sendHelp(msg.chat.id);
});

bot.onText(/^\/ping(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;
  await sendHtmlMessage(msg.chat.id, '<b>pong</b>');
});

bot.onText(/^\/services(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;

  const running = await getRunningServices();
  const allowed = Array.from(ALLOWED_SERVICES).sort();
  const runningAllowed = running.filter((service) => ALLOWED_SERVICES.has(service));

  const message = [
    '<b>Services</b>',
    '',
    '<b>Allowed</b>',
    `<code>${escapeHtml(allowed.join(', ') || 'none')}</code>`,
    '',
    '<b>Running (allowed)</b>',
    `<code>${escapeHtml(runningAllowed.join(', ') || 'none')}</code>`,
  ].join('\n');

  await sendHtmlMessage(msg.chat.id, message);
});

bot.onText(/^\/status(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;
  await sendStatus(msg.chat.id);
});

bot.onText(/^\/monitor(?:@\w+)?$/i, async (msg) => {
  if (!isAuthorized(msg)) return;
  await sendMonitor(msg.chat.id);
});

bot.onText(/^\/logs(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const rawArgs = (match?.[1] || '').trim();
  if (!rawArgs) {
    await sendHtmlMessage(msg.chat.id, 'Usage: <code>/logs &lt;service&gt; [lines]</code>');
    return;
  }

  const args = rawArgs.split(/\s+/).filter(Boolean);
  const service = args[0]?.toLowerCase() || '';
  if (!isAllowedService(service)) {
    await sendHtmlMessage(msg.chat.id, `Service is not allowed: <code>${escapeHtml(service || '(empty)')}</code>`);
    return;
  }

  const parsedLines = Number.parseInt(args[1] || '', 10);
  const lines = Number.isFinite(parsedLines)
    ? Math.min(Math.max(parsedLines, 1), MAX_LOG_LINES)
    : DEFAULT_LOG_LINES;

  await sendHtmlMessage(
    msg.chat.id,
    `<b>Logs</b>\nReading <code>${escapeHtml(service)}</code> (tail <code>${lines}</code>)...`
  );
  const result = await runComposeCommand([
    'logs',
    '--no-color',
    '--no-log-prefix',
    '--tail',
    String(lines),
    service,
  ]);

  await sendLogsResult(msg.chat.id, service, lines, result);
});

bot.onText(/^\/restart(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const rawArgs = (match?.[1] || '').trim();
  if (!rawArgs) {
    await sendHtmlMessage(msg.chat.id, 'Usage: <code>/restart &lt;service1[,service2]|all&gt;</code>');
    return;
  }

  const targetServices = await resolveTargetServices(rawArgs);
  if (!targetServices.length) {
    await sendHtmlMessage(msg.chat.id, 'No allowed running services found for restart.');
    return;
  }

  await sendHtmlMessage(
    msg.chat.id,
    `<b>Restart</b>\nTarget: <code>${escapeHtml(targetServices.join(', '))}</code>`
  );
  const result = await runComposeCommand(['restart', ...targetServices]);
  await sendLifecycleResult(msg.chat.id, 'restart', targetServices, result);
});

bot.onText(/^\/recreate(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const rawArgs = (match?.[1] || '').trim();
  if (!rawArgs) {
    await sendHtmlMessage(msg.chat.id, 'Usage: <code>/recreate &lt;service1[,service2]|all&gt;</code>');
    return;
  }

  const targetServices = await resolveTargetServices(rawArgs);
  if (!targetServices.length) {
    await sendHtmlMessage(msg.chat.id, 'No allowed running services found for force recreation.');
    return;
  }

  await sendHtmlMessage(
    msg.chat.id,
    `<b>Recreate</b>\nTarget: <code>${escapeHtml(targetServices.join(', '))}</code>`
  );
  const result = await runComposeCommand(['up', '-d', '--force-recreate', ...targetServices]);
  await sendLifecycleResult(msg.chat.id, 'recreate', targetServices, result);
});

bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error);
});

bot.on('message', async (msg) => {
  if (!msg.text?.startsWith('/')) return;

  const knownPrefix = /^\/(start|help|ping|services|status|monitor|logs|restart|recreate)(?:@\w+)?\b/i;
  if (knownPrefix.test(msg.text)) return;

  if (!isAuthorized(msg)) return;
  await sendHtmlMessage(msg.chat.id, 'Unknown command. Use <code>/help</code>.');
});

console.log('Ops bot started.');
console.log(`Compose workdir: ${COMPOSE_WORKDIR}`);
console.log(`Compose files: ${getComposeFiles().join(', ')}`);
console.log(`Compose project: ${COMPOSE_PROJECT_NAME || getInferredComposeProjectName() || '(default)'}`);
console.log(`Allowed services: ${Array.from(ALLOWED_SERVICES).sort().join(', ')}`);

async function sendHelp(chatId: number) {
  await sendHtmlMessage(
    chatId,
    [
      '<b>Ops Bot</b>',
      '',
      '<code>/status</code> - docker compose ps',
      '<code>/monitor</code> - host CPU/RAM/swap/disk/uptime',
      '<code>/services</code> - show allowlisted/running services',
      '<code>/logs &lt;service&gt; [lines]</code> - tail logs',
      '<code>/restart &lt;service1[,service2]|all&gt;</code> - restart',
      '<code>/recreate &lt;service1[,service2]|all&gt;</code> - force recreate',
      '<code>/ping</code> - health check',
    ].join('\n')
  );
}

function isAuthorized(msg: TelegramBot.Message): boolean {
  const userId = msg.from?.id;
  const chatId = msg.chat?.id;

  if (!userId || !ALLOWED_USER_IDS.has(userId)) {
    return false;
  }

  if (ALLOWED_CHAT_IDS.size > 0 && (!chatId || !ALLOWED_CHAT_IDS.has(chatId))) {
    return false;
  }

  return true;
}

function parseNumericIdSet(rawValue?: string, envName?: string): Set<number> {
  const list = parseStringList(rawValue);
  const values = new Set<number>();

  for (const item of list) {
    const parsed = Number.parseInt(item, 10);
    if (!Number.isSafeInteger(parsed)) {
      if (envName) {
        console.error(`${envName} contains invalid numeric ID: ${item}`);
        process.exit(1);
      }
      continue;
    }
    values.add(parsed);
  }

  return values;
}

function parseStringList(rawValue?: string): string[] {
  return (rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}


function isAllowedService(service: string): boolean {
  if (!service) return false;
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(service)) return false;
  return ALLOWED_SERVICES.has(service.toLowerCase());
}

function clampInt(rawValue: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function buildComposeArgs(commandArgs: string[]): string[] {
  const args: string[] = ['compose'];

  for (const composeFile of getComposeFiles()) {
    args.push('-f', composeFile);
  }

  if (COMPOSE_ENV_FILE) {
    args.push('--env-file', COMPOSE_ENV_FILE);
  }

  const projectName = COMPOSE_PROJECT_NAME || getInferredComposeProjectName();
  if (projectName) {
    args.push('-p', projectName);
  }

  args.push(...commandArgs);
  return args;
}

async function runComposeCommand(commandArgs: string[], timeoutMs = COMMAND_TIMEOUT_MS): Promise<ComposeExecResult> {
  const dockerArgs = buildComposeArgs(commandArgs);
  return runShellCommand('docker', dockerArgs, timeoutMs, COMPOSE_WORKDIR);
}

async function runShellCommand(
  command: string,
  args: string[],
  timeoutMs: number,
  cwd = process.cwd()
): Promise<ComposeExecResult> {
  const startedAt = Date.now();

  return await new Promise<ComposeExecResult>((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      stderr += `Spawn error: ${error.message}\n`;
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function getRunningServices(): Promise<string[]> {
  const result = await runComposeCommand(['ps', '--services', '--status', 'running']);
  if (result.code !== 0) {
    return [];
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

async function resolveTargetServices(rawArgs: string): Promise<string[]> {
  const normalized = rawArgs.trim().toLowerCase();

  if (normalized === 'all') {
    const running = await getRunningServices();
    return running.filter((service) => ALLOWED_SERVICES.has(service));
  }

  const requested = normalized
    .split(/[\s,]+/)
    .map((service) => service.trim().toLowerCase())
    .filter(Boolean);

  const uniqueRequested = Array.from(new Set(requested));
  return uniqueRequested.filter((service) => isAllowedService(service));
}

async function sendCommandResult(chatId: number, title: string, result: ComposeExecResult) {
  const statusPrefix = result.code === 0 && !result.timedOut ? 'SUCCESS' : 'FAILED';
  const codePart = result.code === null ? 'n/a' : String(result.code);
  const cleanStdout = sanitizeOutput(result.stdout);
  const cleanStderr = sanitizeOutput(result.stderr);

  const summary = [
    `<b>${statusPrefix}</b> <code>${escapeHtml(title)}</code>`,
    `<code>exit_code=${escapeHtml(codePart)}${result.timedOut ? ' timeout' : ''} duration_ms=${result.durationMs}</code>`,
  ].join('\n');

  await sendHtmlMessage(chatId, summary);

  if (cleanStdout) {
    await sendPreformatted(chatId, 'Output', cleanStdout);
  }

  if (cleanStderr) {
    await sendPreformatted(chatId, cleanStdout ? 'Errors' : 'Details', cleanStderr);
  }
}

async function sendLogsResult(chatId: number, service: string, requestedTail: number, result: ComposeExecResult) {
  if (result.code !== 0 || result.timedOut) {
    await sendCommandResult(
      chatId,
      `docker compose logs --no-log-prefix --tail ${requestedTail} ${service}`,
      result
    );
    return;
  }

  const cleanStdout = sanitizeOutput(result.stdout);
  const cleanStderr = sanitizeOutput(result.stderr);
  const formattedLines = formatLogLines(cleanStdout);

  const summary = [
    `<b>SUCCESS</b> <code>/logs ${escapeHtml(service)} ${requestedTail}</code>`,
    `<code>lines=${formattedLines.length} duration_ms=${result.durationMs}</code>`,
  ].join('\n');

  await sendHtmlMessage(chatId, summary);

  if (formattedLines.length === 0) {
    await sendHtmlMessage(chatId, '<b>Logs</b>\n<code>No log lines in selected tail window.</code>');
  } else {
    await sendPreformatted(chatId, `${service} logs`, formattedLines.join('\n'));
  }

  if (cleanStderr) {
    await sendPreformatted(chatId, 'Warnings', cleanStderr);
  }
}

async function sendStatus(chatId: number) {
  await sendHtmlMessage(chatId, '<b>Status</b>\nRunning <code>docker compose ps --all --format json</code>...');

  const result = await runComposeCommand(['ps', '--all', '--format', 'json']);
  if (result.code !== 0 || result.timedOut) {
    await sendCommandResult(chatId, 'docker compose ps --all --format json', result);
    return;
  }

  const rows = parseComposePsRows(result.stdout).filter((row) => ALLOWED_SERVICES.has(row.service));
  rows.sort((a, b) => a.service.localeCompare(b.service));

  const runningCount = rows.filter((row) => row.state === 'running').length;
  const healthyCount = rows.filter((row) => row.health === 'healthy').length;

  const summary = [
    '<b>Status</b>',
    `<code>services=${rows.length} running=${runningCount} healthy=${healthyCount} duration_ms=${result.durationMs}</code>`,
  ].join('\n');

  await sendHtmlMessage(chatId, summary);

  if (rows.length === 0) {
    await sendHtmlMessage(chatId, '<b>Details</b>\n<code>No allowed containers found.</code>');
    return;
  }

  const table = formatStatusTable(rows);
  await sendPreformatted(chatId, 'Containers', table);
}

async function sendMonitor(chatId: number) {
  await sendHtmlMessage(chatId, '<b>Monitor</b>\nSampling host CPU/RAM/swap/disk...');

  const metrics = await collectHostMetrics();
  const pressure = evaluatePressure(metrics);

  const summary = [
    '<b>Monitor</b>',
    `<code>level=${pressure.level} sampled_at=${escapeHtml(metrics.sampledAt.toISOString())}</code>`,
  ].join('\n');
  await sendHtmlMessage(chatId, summary);

  const lines = [
    `CPU   ${formatPercent(metrics.cpuUsagePct)}  load=${formatLoad(metrics.load1)}/${formatLoad(metrics.load5)}/${formatLoad(metrics.load15)} cores=${metrics.cpuCores}`,
    `RAM   ${formatBytes(metrics.memUsedBytes)} / ${formatBytes(metrics.memTotalBytes)} (${formatPercent(metrics.memUsedPct)})`,
    `SWAP  ${formatBytes(metrics.swapUsedBytes)} / ${formatBytes(metrics.swapTotalBytes)} (${formatPercent(metrics.swapUsedPct)})`,
    `DISK  ${formatBytes(metrics.diskUsedBytes)} / ${formatBytes(metrics.diskTotalBytes)} (${formatPercent(metrics.diskUsedPct)})`,
    `UP    ${formatDuration(metrics.uptimeSec)}`,
  ];

  await sendPreformatted(chatId, 'Host metrics', lines.join('\n'));

  if (pressure.notes.length > 0) {
    await sendPreformatted(chatId, `${pressure.level} checks`, pressure.notes.join('\n'));
  }
}


async function sendLifecycleResult(
  chatId: number,
  action: 'restart' | 'recreate',
  targetServices: string[],
  result: ComposeExecResult
) {
  if (result.code !== 0 || result.timedOut) {
    const command =
      action === 'restart'
        ? `docker compose restart ${targetServices.join(' ')}`
        : `docker compose up -d --force-recreate ${targetServices.join(' ')}`;
    await sendCommandResult(chatId, command, result);
    return;
  }

  const parsed = parseLifecycleSummary(result.stdout, result.stderr);

  const summary = [
    '<b>SUCCESS</b> <code>/' + escapeHtml(action) + ' ' + escapeHtml(targetServices.join(',')) + '</code>',
    `<code>targets=${targetServices.length} containers=${parsed.containerStates.length} warnings=${parsed.warnings.length} duration_ms=${result.durationMs}</code>`,
  ].join('\n');

  await sendHtmlMessage(chatId, summary);

  if (parsed.containerStates.length > 0) {
    const rows = parsed.containerStates.map(({ container, states }) => `${container}  ${states.join(' -> ')}`);
    await sendPreformatted(chatId, 'Containers', rows.join('\n'));
  }

  if (parsed.warnings.length > 0) {
    await sendPreformatted(chatId, 'Warnings', parsed.warnings.join('\n'));
  }

  if (parsed.otherLines.length > 0) {
    await sendPreformatted(chatId, 'Details', parsed.otherLines.join('\n'));
  }
}

async function collectHostMetrics(): Promise<HostMetrics> {
  const [cpuUsagePct, memInfo, diskInfo, uptimeSec] = await Promise.all([
    sampleCpuUsagePct(),
    readLinuxMemInfo(),
    readDiskUsage('/'),
    readUptimeSec(),
  ]);

  const memTotalBytes = memInfo?.MemTotal ?? null;
  const memAvailableBytes = memInfo?.MemAvailable ?? null;
  const memUsedBytes = memTotalBytes !== null && memAvailableBytes !== null
    ? Math.max(memTotalBytes - memAvailableBytes, 0)
    : null;
  const memUsedPct = percent(memUsedBytes, memTotalBytes);

  const swapTotalBytes = memInfo?.SwapTotal ?? null;
  const swapFreeBytes = memInfo?.SwapFree ?? null;
  const swapUsedBytes = swapTotalBytes !== null && swapFreeBytes !== null
    ? Math.max(swapTotalBytes - swapFreeBytes, 0)
    : null;
  const swapUsedPct = percent(swapUsedBytes, swapTotalBytes);

  const load = safeLoadAvg();

  return {
    sampledAt: new Date(),
    cpuUsagePct,
    cpuCores: Math.max(os.cpus().length, 1),
    load1: load?.[0] ?? null,
    load5: load?.[1] ?? null,
    load15: load?.[2] ?? null,
    memTotalBytes,
    memUsedBytes,
    memUsedPct,
    swapTotalBytes,
    swapUsedBytes,
    swapUsedPct,
    diskTotalBytes: diskInfo?.totalBytes ?? null,
    diskUsedBytes: diskInfo?.usedBytes ?? null,
    diskUsedPct: diskInfo?.usedPct ?? null,
    uptimeSec,
  };
}

async function sampleCpuUsagePct(): Promise<number | null> {
  const first = await readCpuSnapshot();
  if (!first) return null;
  await sleep(CPU_SAMPLE_DELAY_MS);
  const second = await readCpuSnapshot();
  if (!second) return null;

  const totalDelta = second.total - first.total;
  const activeDelta = second.active - first.active;
  if (!Number.isFinite(totalDelta) || totalDelta <= 0) return null;
  if (!Number.isFinite(activeDelta) || activeDelta < 0) return null;

  return (activeDelta / totalDelta) * 100;
}

async function readCpuSnapshot(): Promise<{ active: number; total: number } | null> {
  try {
    const raw = await readFile('/proc/stat', 'utf8');
    const firstLine = raw.split('\n').find((line) => line.startsWith('cpu '));
    if (!firstLine) return null;

    const fields = firstLine.trim().split(/\s+/).slice(1).map((value) => Number(value));
    if (fields.length < 8 || fields.some((value) => !Number.isFinite(value))) return null;

    const user = fields[0] ?? 0;
    const nice = fields[1] ?? 0;
    const system = fields[2] ?? 0;
    const idle = fields[3] ?? 0;
    const iowait = fields[4] ?? 0;
    const irq = fields[5] ?? 0;
    const softirq = fields[6] ?? 0;
    const steal = fields[7] ?? 0;

    const active = user + nice + system + irq + softirq + steal;
    const total = active + idle + iowait;

    return { active, total };
  } catch {
    return null;
  }
}

async function readLinuxMemInfo(): Promise<Record<string, number> | null> {
  try {
    const raw = await readFile('/proc/meminfo', 'utf8');
    const parsed: Record<string, number> = {};

    for (const line of raw.split('\n')) {
      const match = line.match(/^([A-Za-z_()\d]+):\s+(\d+)\s+kB$/);
      if (!match) continue;
      parsed[match[1]] = Number(match[2]) * 1024;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function readDiskUsage(targetPath: string): Promise<{ totalBytes: number; usedBytes: number; usedPct: number } | null> {
  const result = await runShellCommand('df', ['-P', targetPath], MONITOR_TIMEOUT_MS);
  if (result.code !== 0 || result.timedOut) return null;

  const lines = sanitizeOutput(result.stdout).split('\n').filter(Boolean);
  if (lines.length < 2) return null;

  const parts = lines[1].trim().split(/\s+/);
  if (parts.length < 6) return null;

  const totalKb = Number(parts[1]);
  const usedKb = Number(parts[2]);
  const usedPct = Number((parts[4] || '').replace('%', ''));
  if (!Number.isFinite(totalKb) || !Number.isFinite(usedKb) || !Number.isFinite(usedPct)) return null;

  return {
    totalBytes: totalKb * 1024,
    usedBytes: usedKb * 1024,
    usedPct,
  };
}

async function readUptimeSec(): Promise<number | null> {
  try {
    const raw = await readFile('/proc/uptime', 'utf8');
    const seconds = Number(raw.trim().split(/\s+/)[0]);
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

function safeLoadAvg(): [number, number, number] | null {
  try {
    const values = os.loadavg();
    if (!Array.isArray(values) || values.length < 3) return null;
    if (values.some((value) => !Number.isFinite(value))) return null;
    return [values[0], values[1], values[2]];
  } catch {
    return null;
  }
}

function percent(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

function evaluatePressure(metrics: HostMetrics): { level: PressureLevel; notes: string[] } {
  const notes: string[] = [];
  let critical = 0;
  let warn = 0;

  if (metrics.memUsedPct !== null) {
    if (metrics.memUsedPct >= 92) {
      critical += 1;
      notes.push(`RAM critical: ${metrics.memUsedPct.toFixed(1)}% used`);
    } else if (metrics.memUsedPct >= 85) {
      warn += 1;
      notes.push(`RAM high: ${metrics.memUsedPct.toFixed(1)}% used`);
    }
  }

  if (metrics.swapTotalBytes !== null && metrics.swapTotalBytes > 0 && metrics.swapUsedPct !== null) {
    if (metrics.swapUsedPct >= 50) {
      critical += 1;
      notes.push(`Swap critical: ${metrics.swapUsedPct.toFixed(1)}% used`);
    } else if (metrics.swapUsedPct >= 20) {
      warn += 1;
      notes.push(`Swap elevated: ${metrics.swapUsedPct.toFixed(1)}% used`);
    }
  }

  if (metrics.cpuUsagePct !== null) {
    if (metrics.cpuUsagePct >= 95) {
      critical += 1;
      notes.push(`CPU critical: ${metrics.cpuUsagePct.toFixed(1)}% busy`);
    } else if (metrics.cpuUsagePct >= 85) {
      warn += 1;
      notes.push(`CPU high: ${metrics.cpuUsagePct.toFixed(1)}% busy`);
    }
  }

  if (metrics.load1 !== null && metrics.cpuCores > 0) {
    const loadRatio = metrics.load1 / metrics.cpuCores;
    if (loadRatio >= 1.5) {
      critical += 1;
      notes.push(`Load critical: 1m load/core=${loadRatio.toFixed(2)}`);
    } else if (loadRatio >= 1.0) {
      warn += 1;
      notes.push(`Load elevated: 1m load/core=${loadRatio.toFixed(2)}`);
    }
  }

  if (metrics.diskUsedPct !== null) {
    if (metrics.diskUsedPct >= 92) {
      critical += 1;
      notes.push(`Disk critical: ${metrics.diskUsedPct.toFixed(1)}% used`);
    } else if (metrics.diskUsedPct >= 85) {
      warn += 1;
      notes.push(`Disk high: ${metrics.diskUsedPct.toFixed(1)}% used`);
    }
  }

  const level: PressureLevel = critical > 0 ? 'CRITICAL' : warn > 0 ? 'WARN' : 'OK';
  return { level, notes };
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'n/a';

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const digits = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(digits)}${units[index]}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(1)}%`;
}

function formatLoad(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(2);
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return 'n/a';

  const seconds = Math.floor(totalSeconds);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function splitText(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > maxChunkSize) {
    const slice = rest.slice(0, maxChunkSize);
    const newlineIndex = slice.lastIndexOf('\n');
    const cutAt = newlineIndex > 200 ? newlineIndex : maxChunkSize;

    chunks.push(rest.slice(0, cutAt));
    rest = rest.slice(cutAt);
  }

  if (rest.length > 0) {
    chunks.push(rest);
  }

  return chunks;
}

function sanitizeOutput(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, '').replace(/\r/g, '').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendHtmlMessage(chatId: number, html: string) {
  await bot.sendMessage(chatId, html, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

async function sendPreformatted(chatId: number, label: string, text: string) {
  const chunks = splitText(text, TELEGRAM_MAX_BODY);

  for (let index = 0; index < chunks.length; index += 1) {
    const suffix = chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : '';
    const body = `<b>${escapeHtml(label)}${suffix}</b>\n<pre>${escapeHtml(chunks[index])}</pre>`;
    await sendHtmlMessage(chatId, body);
  }
}

function resolveComposeWorkdir(explicitWorkdir: string, composeFiles: string[]): string {
  if (explicitWorkdir) {
    return explicitWorkdir;
  }

  let currentDir = process.cwd();
  while (true) {
    const hasComposeFiles = composeFiles.every((composeFile) => existsSync(path.join(currentDir, composeFile)));
    if (hasComposeFiles) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return process.cwd();
}

function resolveDefaultComposeFiles(workdir: string): string[] {
  const files = ['docker-compose.yml'];
  if (existsSync(path.join(workdir, 'docker-compose.override.yml'))) {
    files.push('docker-compose.override.yml');
  }
  return files;
}

function getComposeFiles(): string[] {
  if (EXPLICIT_COMPOSE_FILES.length > 0) {
    return EXPLICIT_COMPOSE_FILES;
  }

  const inferred = getInferredComposeFiles();
  if (inferred.length > 0) {
    return inferred;
  }

  return DEFAULT_COMPOSE_FILES;
}

function getInferredComposeProjectName(): string {
  ensureComposeLabelsDetected();
  if (inferredComposeProjectName === null) return '';
  return inferredComposeProjectName;
}

function getInferredComposeFiles(): string[] {
  ensureComposeLabelsDetected();
  return inferredComposeFiles || [];
}

function ensureComposeLabelsDetected(): void {
  if (composeLabelsDetected) return;
  composeLabelsDetected = true;

  const containerId = sanitizeContainerId(process.env.HOSTNAME || '');
  if (!containerId) {
    inferredComposeProjectName = '';
    inferredComposeFiles = [];
    return;
  }

  try {
    const result = spawnSync(
      'docker',
      ['inspect', '--format', '{{ json .Config.Labels }}', containerId],
      {
        env: process.env,
        encoding: 'utf8',
        timeout: 3_000,
      }
    );

    if (result.error || result.status !== 0) {
      inferredComposeProjectName = '';
      inferredComposeFiles = [];
      return;
    }

    const rawLabels = (result.stdout || '').trim();
    if (!rawLabels || rawLabels === 'null' || rawLabels === '<no value>') {
      inferredComposeProjectName = '';
      inferredComposeFiles = [];
      return;
    }

    const labels = JSON.parse(rawLabels) as Record<string, string>;
    const projectName = normalizeComposeLabel(labels['com.docker.compose.project']);
    const configFiles = normalizeComposeLabel(labels['com.docker.compose.project.config_files']);

    inferredComposeProjectName = projectName;
    inferredComposeFiles = resolveComposeFilesFromLabel(configFiles, COMPOSE_WORKDIR);
  } catch {
    inferredComposeProjectName = '';
    inferredComposeFiles = [];
  }
}

function sanitizeContainerId(value: string): string {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(trimmed)) return '';
  return trimmed;
}

function normalizeComposeLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '<no value>') return '';
  return trimmed;
}

function resolveComposeFilesFromLabel(configFilesLabel: string, workdir: string): string[] {
  if (!configFilesLabel) return [];

  const resolved: string[] = [];
  for (const rawPath of configFilesLabel.split(',')) {
    const candidate = path.basename(rawPath.trim());
    if (!candidate) continue;
    if (!existsSync(path.join(workdir, candidate))) continue;
    if (!resolved.includes(candidate)) {
      resolved.push(candidate);
    }
  }

  return resolved;
}

function parseLifecycleSummary(stdout: string, stderr: string): LifecycleSummary {
  const warnings: string[] = [];
  const otherLines: string[] = [];
  const statesByContainer = new Map<string, string[]>();

  const combined = [sanitizeOutput(stdout), sanitizeOutput(stderr)]
    .filter(Boolean)
    .join('\n');

  for (const rawLine of combined.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const warningMessage = parseDockerWarning(line);
    if (warningMessage) {
      warnings.push(warningMessage);
      continue;
    }

    const containerMatch = line.match(/^Container\s+(\S+)\s+(.+)$/i);
    if (containerMatch) {
      const container = containerMatch[1];
      const state = containerMatch[2].trim().toLowerCase();
      const states = statesByContainer.get(container) || [];
      if (states[states.length - 1] !== state) {
        states.push(state);
      }
      statesByContainer.set(container, states);
      continue;
    }

    if (!line.startsWith('time=')) {
      otherLines.push(line);
    }
  }

  const containerStates = Array.from(statesByContainer.entries())
    .map(([container, states]) => ({ container, states }))
    .sort((a, b) => a.container.localeCompare(b.container));

  return {
    warnings: dedupe(warnings),
    containerStates,
    otherLines: dedupe(otherLines),
  };
}

function parseDockerWarning(line: string): string | null {
  const dockerWarningWithMsg = line.match(/^time="[^"]+"\s+level=warning\s+msg="(.+)"$/);
  if (dockerWarningWithMsg?.[1]) {
    return dockerWarningWithMsg[1];
  }
  if (line.toLowerCase().includes('warning')) {
    return line;
  }
  return null;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function parseComposePsRows(rawOutput: string): ComposePsRow[] {
  const clean = sanitizeOutput(rawOutput);
  if (!clean) return [];

  const parsedObjects = parseComposePsObjects(clean);
  const rows: ComposePsRow[] = [];

  for (const item of parsedObjects) {
    const service = normalizePsString(item.Service).toLowerCase();
    if (!service) continue;

    const state = normalizePsString(item.State).toLowerCase() || 'unknown';
    const health = normalizePsString(item.Health).toLowerCase() || '-';
    const status = normalizePsString(item.Status);
    const ports = extractPsPorts(item);
    const exitCode = Number.isFinite(item.ExitCode) ? Number(item.ExitCode) : null;

    rows.push({ service, state, health, status, ports, exitCode });
  }

  return rows;
}

function parseComposePsObjects(cleanOutput: string): Array<Record<string, any>> {
  const trimmed = cleanOutput.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const objects: Array<Record<string, any>> = [];
  for (const line of trimmed.split('\n')) {
    const candidate = line.trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        objects.push(parsed);
      }
    } catch {
      // Ignore malformed lines.
    }
  }
  return objects;
}

function normalizePsString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractPsPorts(item: Record<string, any>): string {
  const publishers = Array.isArray(item.Publishers) ? item.Publishers : [];
  const rendered = new Set<string>();

  for (const publisher of publishers) {
    const targetPort = Number(publisher?.TargetPort);
    const publishedPort = Number(publisher?.PublishedPort);
    const protocol = normalizePsString(publisher?.Protocol || 'tcp').toLowerCase() || 'tcp';

    if (!Number.isFinite(targetPort) || targetPort <= 0) continue;

    if (Number.isFinite(publishedPort) && publishedPort > 0) {
      rendered.add(`${publishedPort}->${targetPort}/${protocol}`);
    } else {
      rendered.add(`${targetPort}/${protocol}`);
    }
  }

  if (rendered.size > 0) {
    return Array.from(rendered).join(',');
  }

  const portsText = normalizePsString(item.Ports);
  if (portsText) {
    return portsText.replace(/\s+/g, '');
  }

  return '-';
}

function formatStatusTable(rows: ComposePsRow[]): string {
  const serviceWidth = Math.max('SERVICE'.length, ...rows.map((row) => row.service.length));
  const stateWidth = Math.max('STATE'.length, ...rows.map((row) => row.state.length));
  const healthWidth = Math.max('HEALTH'.length, ...rows.map((row) => row.health.length));

  const lines: string[] = [];
  lines.push(
    `${padRight('SERVICE', serviceWidth)}  ${padRight('STATE', stateWidth)}  ${padRight('HEALTH', healthWidth)}  INFO`
  );
  lines.push(
    `${'-'.repeat(serviceWidth)}  ${'-'.repeat(stateWidth)}  ${'-'.repeat(healthWidth)}  ${'-'.repeat(24)}`
  );

  for (const row of rows) {
    const info = summarizeRowInfo(row);
    lines.push(
      `${padRight(row.service, serviceWidth)}  ${padRight(row.state, stateWidth)}  ${padRight(row.health, healthWidth)}  ${info}`
    );
  }

  return lines.join('\n');
}

function summarizeRowInfo(row: ComposePsRow): string {
  if (row.ports !== '-') {
    return clipText(row.ports, 64);
  }

  if (row.state !== 'running' && row.exitCode !== null) {
    return `exit=${row.exitCode}`;
  }

  if (row.status) {
    return clipText(row.status.replace(/^Up\s+/i, 'up '), 64);
  }

  return '-';
}

function padRight(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`;
}

function clipText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 3)}...`;
}

function formatLogLines(text: string): string[] {
  if (!text) return [];

  return text
    .split('\n')
    .map((line) => stripComposeLogPrefix(line.trimRight()))
    .filter((line) => line.trim().length > 0);
}

function stripComposeLogPrefix(line: string): string {
  return line.replace(/^\s*[\w.-]+-\d+\s+\|\s?/, '');
}
