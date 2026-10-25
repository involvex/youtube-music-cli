// YouTube Music account login/logout view
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {useState, useCallback, useEffect, useRef} from 'react';
import {
	COOKIE_LOGIN_HINT,
	getAuthService,
	OAUTH_UNSUPPORTED_MESSAGE,
} from '../../services/auth/auth.service.ts';

type LoginState = 'idle' | 'pending' | 'authenticating' | 'success' | 'error';

export default function LoginView() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const authService = getAuthService();
	const status = authService.getStatus();

	const [loginState, setLoginState] = useState<LoginState>('idle');
	const [progress, setProgress] = useState('Starting login...');
	const [deviceCode, setDeviceCode] = useState<{
		verificationUrl: string;
		userCode: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showCookieFallback, setShowCookieFallback] = useState(false);
	const loginInitiated = useRef(false);

	useKeyBinding(resolveKeybinding('BACK'), () => {
		dispatch({category: 'GO_BACK'});
	});

	const handleLogin = useCallback(async () => {
		if (status.loggedIn) {
			return;
		}

		setLoginState('pending');
		setProgress('Starting login...');
		setError(null);
		setShowCookieFallback(false);
		setDeviceCode(null);

		const result = await getAuthService().signIn({
			onProgress: message => {
				setProgress(message);
			},
			onDeviceCode: info => {
				setDeviceCode(info);
				setLoginState('authenticating');
			},
		});

		if (result.success) {
			setLoginState('success');
			return;
		}

		setLoginState('error');
		setError(result.error ?? 'Login failed');
		setShowCookieFallback(true);
	}, [status.loggedIn]);

	useKeyBinding(['r'], () => {
		if (loginState === 'error' || showCookieFallback) {
			setLoginState('idle');
			setError(null);
			setShowCookieFallback(false);
			loginInitiated.current = true;
			void handleLogin();
		}
	});

	useEffect(() => {
		if (status.loggedIn || loginInitiated.current) {
			return;
		}

		loginInitiated.current = true;
		queueMicrotask(() => {
			void handleLogin();
		});
	}, [handleLogin, status.loggedIn]);

	return (
		<Box flexDirection="column" paddingX={1} paddingY={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					Account
				</Text>
			</Box>

			{status.loggedIn ? (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color={theme.colors.text}>
							Signed in as:{' '}
							<Text bold color={theme.colors.primary}>
								{status.accountName ?? 'YouTube account'}
							</Text>
						</Text>
					</Box>
					{status.method === 'cookie' ? (
						<Box>
							<Text color={theme.colors.text}>
								Using cookie-based authentication
							</Text>
						</Box>
					) : (
						<>
							<Box flexDirection="column">
								{OAUTH_UNSUPPORTED_MESSAGE.split('\n').map(line => (
									<Text key={line} color="yellow">
										{line}
									</Text>
								))}
							</Box>
							{!status.tokenValid && (
								<Box>
									<Text color="yellow">
										Token expired (will refresh automatically)
									</Text>
								</Box>
							)}
						</>
					)}
					<Box>
						<Text color={theme.colors.dim}>Esc to go back</Text>
					</Box>
				</Box>
			) : loginState === 'authenticating' && deviceCode ? (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color={theme.colors.text}>
							Open{' '}
							<Text bold color={theme.colors.primary}>
								{deviceCode.verificationUrl}
							</Text>{' '}
							in your browser
						</Text>
					</Box>
					<Box>
						<Text color={theme.colors.text}>Enter this code:</Text>
					</Box>
					<Box
						justifyContent="center"
						borderStyle="round"
						borderColor={theme.colors.primary}
						paddingX={2}
						paddingY={1}
					>
						<Text color={theme.colors.primary} bold>
							{deviceCode.userCode}
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color={theme.colors.dim}>Waiting for authorization...</Text>
					</Box>
				</Box>
			) : loginState === 'success' ? (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color="green" bold>
							✓ Successfully signed in!
						</Text>
					</Box>
					<Box>
						<Text color={theme.colors.dim}>Press Esc to continue</Text>
					</Box>
				</Box>
			) : loginState === 'error' ? (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color="red" bold>
							✗ Login failed
						</Text>
					</Box>
					{error && (
						<Box>
							<Text color={theme.colors.dim}>{error}</Text>
						</Box>
					)}
					{showCookieFallback && (
						<Box flexDirection="column" gap={1} marginTop={1}>
							{COOKIE_LOGIN_HINT.split('\n').map(line => (
								<Box key={line}>
									<Text color={theme.colors.text}>{line}</Text>
								</Box>
							))}
						</Box>
					)}
					<Box>
						<Text color={theme.colors.dim}>
							Press{' '}
							<Text bold color={theme.colors.primary}>
								R
							</Text>{' '}
							to retry, Esc to go back
						</Text>
					</Box>
				</Box>
			) : (
				<Box>
					<Text color={theme.colors.dim}>{progress}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>Esc to go back</Text>
			</Box>
		</Box>
	);
}
