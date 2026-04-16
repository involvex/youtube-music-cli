declare module 'node-notifier' {
	interface NotificationOptions {
		title?: string;
		message?: string;
		sound?: boolean;
		wait?: boolean;
	}

	interface NotificationCallback {
		(err: Error | null): void;
	}

	interface NodeNotifier {
		notify(options: NotificationOptions, callback?: NotificationCallback): void;
	}

	const defaultNotifier: NodeNotifier;
	export = defaultNotifier;
}
