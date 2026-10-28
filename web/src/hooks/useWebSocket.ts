import {useCallback, useEffect, useRef, useState} from 'react';
import type {ServerMessage, ClientMessage} from '../types';

interface UseWebSocketOptions {
	onMessage?: (message: ServerMessage) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Event) => void;
}

const MAX_QUEUED_MESSAGES = 32;

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
	const onMessageRef = useRef(options.onMessage);
	const onConnectRef = useRef(options.onConnect);
	const onDisconnectRef = useRef(options.onDisconnect);
	const onErrorRef = useRef(options.onError);
	const urlRef = useRef(url);
	const intentionalCloseRef = useRef(false);
	const connectRef = useRef<() => void>(() => undefined);
	const pendingMessagesRef = useRef<ClientMessage[]>([]);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [isConnected, setIsConnected] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [lastSendFailed, setLastSendFailed] = useState(false);

	useEffect(() => {
		onMessageRef.current = options.onMessage;
		onConnectRef.current = options.onConnect;
		onDisconnectRef.current = options.onDisconnect;
		onErrorRef.current = options.onError;
	});

	useEffect(() => {
		urlRef.current = url;
	}, [url]);

	const flushPendingMessages = useCallback((ws: WebSocket): void => {
		if (ws.readyState !== WebSocket.OPEN) {
			return;
		}
		const queued = pendingMessagesRef.current;
		pendingMessagesRef.current = [];
		for (const message of queued) {
			try {
				ws.send(JSON.stringify(message));
			} catch {
				pendingMessagesRef.current.push(message);
				break;
			}
		}
		setLastSendFailed(pendingMessagesRef.current.length > 0);
	}, []);

	const queueMessage = useCallback((message: ClientMessage): void => {
		const queue = pendingMessagesRef.current;
		if (queue.length >= MAX_QUEUED_MESSAGES) {
			queue.shift();
		}
		queue.push(message);
		setLastSendFailed(true);
	}, []);

	const connect = useCallback(() => {
		if (
			wsRef.current?.readyState === WebSocket.OPEN ||
			wsRef.current?.readyState === WebSocket.CONNECTING
		) {
			return;
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		const previous = wsRef.current;
		if (
			previous &&
			(previous.readyState === WebSocket.CLOSING ||
				previous.readyState === WebSocket.CLOSED)
		) {
			wsRef.current = null;
		} else if (previous) {
			intentionalCloseRef.current = true;
			try {
				previous.close();
			} catch {
				// Ignore
			}
			wsRef.current = null;
		}

		intentionalCloseRef.current = false;
		setIsConnecting(true);

		try {
			const target = urlRef.current;
			const wsUrl =
				target.startsWith('ws://') || target.startsWith('wss://')
					? target
					: `ws://${window.location.host}/ws`;

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				if (wsRef.current !== ws) {
					return;
				}
				setIsConnected(true);
				setIsConnecting(false);
				flushPendingMessages(ws);
				onConnectRef.current?.();
			};

			ws.onmessage = event => {
				try {
					const message = JSON.parse(event.data as string) as ServerMessage;
					onMessageRef.current?.(message);
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error);
				}
			};

			ws.onclose = () => {
				if (wsRef.current === ws) {
					wsRef.current = null;
				}
				setIsConnected(false);
				setIsConnecting(false);
				onDisconnectRef.current?.();

				if (intentionalCloseRef.current) {
					intentionalCloseRef.current = false;
					return;
				}

				reconnectTimeoutRef.current = setTimeout(() => {
					connectRef.current();
				}, 3000);
			};

			ws.onerror = error => {
				setIsConnecting(false);
				onErrorRef.current?.(error);
			};
		} catch (error) {
			setIsConnecting(false);
			onErrorRef.current?.(error as Event);
		}
	}, [flushPendingMessages]);

	connectRef.current = connect;

	const disconnect = useCallback(() => {
		intentionalCloseRef.current = true;
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			try {
				wsRef.current.close();
			} catch {
				// Ignore
			}
			wsRef.current = null;
		}

		setIsConnected(false);
		setIsConnecting(false);
	}, []);

	const send = useCallback(
		(message: ClientMessage): boolean => {
			const ws = wsRef.current;
			if (ws?.readyState === WebSocket.OPEN) {
				try {
					ws.send(JSON.stringify(message));
					setLastSendFailed(false);
					return true;
				} catch {
					queueMessage(message);
					connect();
					return false;
				}
			}

			queueMessage(message);
			if (ws?.readyState !== WebSocket.CONNECTING) {
				connect();
			}
			return false;
		},
		[connect, queueMessage],
	);

	useEffect(() => {
		connect();
		return () => {
			disconnect();
		};
	}, [url, connect, disconnect]);

	return {
		isConnected,
		isConnecting,
		lastSendFailed,
		send,
		connect,
		disconnect,
	};
}
