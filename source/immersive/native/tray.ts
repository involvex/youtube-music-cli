import {spawn, type ChildProcess} from 'node:child_process';
import process from 'node:process';

export interface TrayIcon {
	id: string;
	icon: string;
	tooltip: string;
}

let currentTrayIcon: TrayIcon | null = null;
let trayProcess: ChildProcess | null = null;

const TRAY_DAEMON_SCRIPT = String.raw`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Visible = $true
$notifyIcon.Text = "YouTube Music CLI"
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line -eq "EXIT") {
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    break
  }
  if ($line.StartsWith("TOOLTIP:")) {
    $notifyIcon.Text = $line.Substring(8)
  }
  if ($line.StartsWith("BALLOON:")) {
    $parts = $line.Substring(8).Split("|", 2)
    if ($parts.Length -eq 2) {
      $notifyIcon.ShowBalloonTip(3000, $parts[0], $parts[1], [System.Windows.Forms.ToolTipIcon]::Info)
    }
  }
}
`;

function ensureTrayDaemon(): boolean {
	if (process.platform !== 'win32') {
		return false;
	}

	if (trayProcess && !trayProcess.killed) {
		return true;
	}

	try {
		const spawned = spawn(
			'powershell',
			['-NoProfile', '-Sta', '-Command', TRAY_DAEMON_SCRIPT],
			{
				windowsHide: true,
				stdio: ['pipe', 'ignore', 'ignore'],
			},
		);

		trayProcess = spawned;

		spawned.on('close', () => {
			trayProcess = null;
			currentTrayIcon = null;
		});

		return true;
	} catch {
		return false;
	}
}

function sendTrayCommand(command: string): void {
	if (!trayProcess || trayProcess.killed || !trayProcess.stdin?.writable) {
		return;
	}

	trayProcess.stdin.write(`${command}\n`);
}

export function createTrayIcon(icon: TrayIcon): boolean {
	if (process.platform !== 'win32') {
		return false;
	}

	currentTrayIcon = icon;
	if (!ensureTrayDaemon()) {
		return false;
	}

	sendTrayCommand(`TOOLTIP:${icon.tooltip}`);
	return true;
}

export function updateTrayIcon(tooltip: string): boolean {
	if (!currentTrayIcon) {
		currentTrayIcon = {
			id: 'youtube-music-cli',
			icon: '',
			tooltip,
		};
	}

	currentTrayIcon.tooltip = tooltip;

	if (!ensureTrayDaemon()) {
		return false;
	}

	sendTrayCommand(`TOOLTIP:${tooltip}`);
	return true;
}

export function removeTrayIcon(): void {
	if (!currentTrayIcon) {
		return;
	}

	currentTrayIcon = null;
	sendTrayCommand('EXIT');

	if (trayProcess && !trayProcess.killed) {
		trayProcess.kill();
		trayProcess = null;
	}
}

export function showBalloonTip(title: string, message: string): boolean {
	if (!ensureTrayDaemon()) {
		return false;
	}

	sendTrayCommand(`BALLOON:${title}|${message}`);
	return true;
}

export function minimizeToTray(): boolean {
	return false;
}

export function restoreFromTray(): boolean {
	return false;
}
