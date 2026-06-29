import {existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawn, type ChildProcess} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {logger} from '../../services/logger/logger.service.ts';

export interface TrayIcon {
	id: string;
	icon: string;
	tooltip: string;
}

export type TrayAction = 'settings' | 'exit';

const TRAY_TOOLTIP_MAX = 63;

let currentTrayIcon: TrayIcon | null = null;
let trayProcess: ChildProcess | null = null;
let trayActionHandler: ((action: TrayAction) => void) | null = null;
let trayIconPath: string | null = null;
let trayScriptPath: string | null = null;

function scheduleTrayIconApply(
	iconPath?: string,
	delaysMs = [250, 800, 1800],
): void {
	for (const delay of delaysMs) {
		setTimeout(() => {
			if (!trayProcess || trayProcess.killed) {
				return;
			}
			applyTrayIcon(iconPath);
		}, delay);
	}
}

const TRAY_DAEMON_SCRIPT = String.raw`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$script:shuttingDown = $false
$script:customIcon = $null
$script:queue = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "YouTube Music CLI"
$notifyIcon.Visible = $true
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$settingsItem = $menu.Items.Add("Settings")
$exitItem = $menu.Items.Add("Exit")
$notifyIcon.ContextMenuStrip = $menu
$settingsItem.Add_Click({
  [Console]::Out.WriteLine("ACTION:settings")
  [Console]::Out.Flush()
})
$exitItem.Add_Click({
  [Console]::Out.WriteLine("ACTION:exit")
  [Console]::Out.Flush()
})
function Set-TrayIconFromPath([string]$iconPath) {
  if (-not (Test-Path -LiteralPath $iconPath)) { return }
  try {
    $ext = [System.IO.Path]::GetExtension($iconPath).ToLower()
    $newIcon = $null
    if ($ext -eq ".png" -or $ext -eq ".jpg" -or $ext -eq ".jpeg") {
      $bmp = [System.Drawing.Bitmap]::FromFile($iconPath)
      $newIcon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    } else {
      $newIcon = New-Object System.Drawing.Icon($iconPath)
    }
    if ($null -ne $newIcon) {
      if ($null -ne $script:customIcon) { $script:customIcon.Dispose() }
      $notifyIcon.Icon = $newIcon
      $script:customIcon = $newIcon
    }
  } catch {}
}
function Process-TrayCommand([string]$line) {
  if ($null -eq $line) { return }
  if ($line -eq "EXIT") {
    $script:shuttingDown = $true
    return
  }
  if ($line.StartsWith("TOOLTIP:")) {
    $text = $line.Substring(8)
    if ($text.Length -gt 63) { $text = $text.Substring(0, 63) }
    $notifyIcon.Text = $text
    return
  }
  if ($line.StartsWith("ICON:")) {
    Set-TrayIconFromPath $line.Substring(5)
    return
  }
  if ($line.StartsWith("BALLOON:")) {
    $parts = $line.Substring(8).Split("|", 2)
    if ($parts.Length -eq 2) {
      $title = $parts[0]
      $body = $parts[1]
      if ($title.Length -gt 63) { $title = $title.Substring(0, 63) }
      if ($body.Length -gt 255) { $body = $body.Substring(0, 255) }
      $notifyIcon.ShowBalloonTip(3000, $title, $body, [System.Windows.Forms.ToolTipIcon]::Info)
    }
  }
}
$form = New-Object System.Windows.Forms.Form
$form.Text = "ymc-tray"
$form.ShowInTaskbar = $false
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedToolWindow
$form.Opacity = 0
$form.Width = 1
$form.Height = 1
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point(-32000, -32000)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 50
$timer.Add_Tick({
  $line = $null
  while ($script:queue.TryDequeue([ref]$line)) {
    Process-TrayCommand $line
  }
  if ($script:shuttingDown) {
    $timer.Stop()
    $notifyIcon.Visible = $false
    if ($null -ne $script:customIcon) { $script:customIcon.Dispose() }
    $notifyIcon.Dispose()
    $form.Close()
  }
})
$timer.Start()
$form.Add_FormClosed({
  if ($null -ne $script:customIcon) { $script:customIcon.Dispose() }
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
})
$stdinThread = New-Object System.Threading.Thread([System.Threading.ThreadStart]{
  try {
    while ($true) {
      $line = [Console]::In.ReadLine()
      if ($null -eq $line) { break }
      $null = $script:queue.Enqueue($line)
    }
  } catch {}
  finally {
    $null = $script:queue.Enqueue("EXIT")
  }
})
$stdinThread.IsBackground = $true
$stdinThread.Start()
[void]$form.Show()
[System.Windows.Forms.Application]::Run($form)
`;

function findPackageRoot(startDir: string): string | null {
	let dir = startDir;
	for (let i = 0; i < 8; i++) {
		if (existsSync(path.join(dir, 'package.json'))) {
			return dir;
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			break;
		}

		dir = parent;
	}

	return null;
}

export function parseTrayActionLine(line: string): TrayAction | null {
	const trimmed = line.trim();
	if (trimmed === 'ACTION:settings') {
		return 'settings';
	}
	if (trimmed === 'ACTION:exit') {
		return 'exit';
	}
	return null;
}

export function truncateTrayTooltip(tooltip: string): string {
	if (tooltip.length <= TRAY_TOOLTIP_MAX) {
		return tooltip;
	}

	return `${tooltip.slice(0, TRAY_TOOLTIP_MAX - 3)}...`;
}

export function resolveTrayIconPath(): string | null {
	const moduleDir = path.dirname(fileURLToPath(import.meta.url));
	const packageRoot = findPackageRoot(moduleDir);
	const distDir = path.join(moduleDir, '..', '..', '..');

	const candidates = [
		packageRoot ? path.join(packageRoot, 'assets', 'icon.ico') : null,
		packageRoot ? path.join(packageRoot, 'dist', 'tray-icon.ico') : null,
		path.join(distDir, 'tray-icon.ico'),
		path.join(distDir, 'assets', 'icon.ico'),
		path.join(path.dirname(process.execPath), 'tray-icon.ico'),
		path.join(path.dirname(process.execPath), 'assets', 'icon.ico'),
		path.join(process.cwd(), 'assets', 'icon.ico'),
		path.join(process.cwd(), 'dist', 'tray-icon.ico'),
	].filter((candidate): candidate is string => Boolean(candidate));

	for (const candidate of candidates) {
		const normalized = path.normalize(candidate);
		if (existsSync(normalized)) {
			return normalized;
		}
	}

	return null;
}

export function setTrayActionHandler(
	handler: ((action: TrayAction) => void) | null,
): void {
	trayActionHandler = handler;
}

function handleTrayStdout(chunk: Buffer | string): void {
	const lines = chunk.toString().split(/\r?\n/);
	for (const line of lines) {
		const action = parseTrayActionLine(line);
		if (action && trayActionHandler) {
			trayActionHandler(action);
		}
	}
}

function getTrayScriptPath(): string {
	if (trayScriptPath) {
		return trayScriptPath;
	}

	const dir = mkdtempSync(path.join(tmpdir(), 'ymc-tray-'));
	trayScriptPath = path.join(dir, 'tray-daemon.ps1');
	writeFileSync(trayScriptPath, TRAY_DAEMON_SCRIPT, 'utf8');
	return trayScriptPath;
}

function resetTrayDaemon(): void {
	if (trayProcess && !trayProcess.killed) {
		try {
			trayProcess.kill();
		} catch {
			// Ignore kill errors during reset.
		}
	}
	trayProcess = null;
}

function sendTrayCommand(command: string): void {
	if (!ensureTrayDaemon()) {
		return;
	}

	if (!trayProcess || trayProcess.killed || !trayProcess.stdin?.writable) {
		resetTrayDaemon();
		if (!ensureTrayDaemon()) {
			return;
		}
	}

	const normalized = command.startsWith('ICON:')
		? `ICON:${command.slice(5).replace(/\//g, '\\')}`
		: command;

	const stdin = trayProcess?.stdin;
	if (!stdin?.writable) {
		return;
	}

	try {
		stdin.write(`${normalized}\n`);
	} catch {
		resetTrayDaemon();
	}
}

function sendTrayTooltip(tooltip: string): void {
	sendTrayCommand(`TOOLTIP:${truncateTrayTooltip(tooltip)}`);
}

function applyTrayIcon(iconPath?: string): void {
	const resolved = iconPath || trayIconPath || resolveTrayIconPath();
	if (!resolved) {
		logger.warn(
			'Tray',
			'Tray icon file not found; using default application icon',
		);
		return;
	}

	trayIconPath = resolved;
	sendTrayCommand(`ICON:${resolved}`);
}

function ensureTrayDaemon(): boolean {
	if (process.platform !== 'win32') {
		return false;
	}

	if (trayProcess && !trayProcess.killed) {
		return true;
	}

	try {
		const scriptPath = getTrayScriptPath();
		const spawned = spawn(
			'powershell.exe',
			[
				'-NoProfile',
				'-Sta',
				'-WindowStyle',
				'Hidden',
				'-ExecutionPolicy',
				'Bypass',
				'-File',
				scriptPath,
			],
			{
				windowsHide: true,
				stdio: ['pipe', 'pipe', 'pipe'],
			},
		);

		trayProcess = spawned;

		spawned.stdout?.on('data', handleTrayStdout);
		spawned.stderr?.on('data', chunk => {
			const message = chunk.toString().trim();
			if (message) {
				logger.warn('Tray', 'Tray daemon stderr', {message});
			}
		});

		spawned.on('close', code => {
			if (code !== 0 && code !== null) {
				logger.warn('Tray', 'Tray daemon exited', {code});
			}
			trayProcess = null;
			currentTrayIcon = null;
		});

		spawned.once('spawn', () => {
			scheduleTrayIconApply();
		});

		return true;
	} catch (error) {
		logger.error('Tray', 'Failed to start tray daemon', {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

export function createTrayIcon(icon: TrayIcon): boolean {
	if (process.platform !== 'win32') {
		return false;
	}

	currentTrayIcon = icon;
	if (!ensureTrayDaemon()) {
		return false;
	}

	const iconPath = icon.icon || resolveTrayIconPath();
	if (iconPath) {
		trayIconPath = iconPath;
		logger.info('Tray', 'Creating tray icon', {iconPath});
		scheduleTrayIconApply(iconPath);
	} else {
		logger.warn('Tray', 'Creating tray with default icon');
		scheduleTrayIconApply();
	}

	sendTrayTooltip(icon.tooltip);
	return true;
}

export function updateTrayIcon(tooltip: string): boolean {
	if (!currentTrayIcon) {
		currentTrayIcon = {
			id: 'youtube-music-cli',
			icon: resolveTrayIconPath() ?? '',
			tooltip,
		};
	}

	currentTrayIcon.tooltip = tooltip;

	if (!ensureTrayDaemon()) {
		return false;
	}

	sendTrayTooltip(tooltip);
	return true;
}

export function removeTrayIcon(): void {
	if (!currentTrayIcon && !trayProcess) {
		return;
	}

	currentTrayIcon = null;
	trayIconPath = null;
	sendTrayCommand('EXIT');

	setTimeout(() => {
		if (trayProcess && !trayProcess.killed) {
			trayProcess.kill();
			trayProcess = null;
		}
	}, 300);
}

export function showBalloonTip(title: string, message: string): boolean {
	if (!ensureTrayDaemon()) {
		return false;
	}

	const safeTitle = truncateTrayTooltip(title.replaceAll('|', ' '));
	const safeBody = message.replaceAll('|', ' ');
	const safeMessage =
		safeBody.length > 255 ? `${safeBody.slice(0, 252)}...` : safeBody;
	sendTrayCommand(`BALLOON:${safeTitle}|${safeMessage}`);
	return true;
}

export function minimizeToTray(): boolean {
	return false;
}

export function restoreFromTray(): boolean {
	return false;
}
