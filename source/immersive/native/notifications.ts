import {showBalloonTip} from './tray.ts';

export interface ToastNotification {
	title: string;
	body: string;
	icon?: string;
}

export function showToast(notification: ToastNotification): void {
	showBalloonTip(notification.title, notification.body);
}

export function showTrackChangeToast(trackTitle: string, artist: string): void {
	showToast({
		title: trackTitle,
		body: artist,
	});
}

export function clearToastNotifications(): void {
	// Balloon tips auto-dismiss; no persistent notifier to clear.
}
