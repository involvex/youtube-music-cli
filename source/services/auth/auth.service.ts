import type {
	AuthCredentials,
	AuthStatus,
	AuthMethod,
	DeviceCodeInfo,
	SignInOptions,
} from '../../types/auth.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatError} from '../../utils/error.ts';
import {logger} from '../logger/logger.service.ts';
import {parseCookiesFile, parseBrowserCookies} from './cookie-utils.ts';
import type {CookiesFromBrowser} from '../player/ytdl-cookies.ts';
import {
	existsSync,
	readFileSync,
	writeFileSync,
	renameSync,
	unlinkSync,
	mkdirSync,
} from 'node:fs';
import {Innertube, type OAuth2Tokens} from 'youtubei.js';

const CREDENTIALS_FILE = `${CONFIG_DIR}/credentials.json`;
const SCHEMA_VERSION = 1;
const OAUTH_STEP_TIMEOUT_MS = 45_000;

type DeviceAndUserCode = {
	device_code: string;
	expires_in: number;
	interval: number;
	user_code: string;
	verification_url: string;
	error_code?: string;
};

export const COOKIE_LOGIN_HINT =
	'OAuth device login can stall on YouTube TV client-id fetch. Use cookies instead:\n' +
	'  ymc login --cookies-file <path-to-cookies.txt>\n' +
	'  ymc login --cookies-from-browser edge';

export async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	message: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_resolve, reject) => {
				timer = setTimeout(() => {
					reject(new Error(message));
				}, ms);
			}),
		]);
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
	}
}

export async function obtainDeviceAndUserCode(oauth: {
	client_id?: unknown;
	getClientID: () => Promise<unknown>;
	getDeviceAndUserCode: () => Promise<DeviceAndUserCode>;
}): Promise<DeviceAndUserCode> {
	if (!oauth.client_id) {
		oauth.client_id = await withTimeout(
			oauth.getClientID(),
			OAUTH_STEP_TIMEOUT_MS,
			'Timed out fetching YouTube TV OAuth client id. YouTube may have changed the TV page.',
		);
	}

	const deviceCode = await withTimeout(
		oauth.getDeviceAndUserCode(),
		OAUTH_STEP_TIMEOUT_MS,
		'Timed out requesting a YouTube device code.',
	);

	if (deviceCode.error_code) {
		throw new Error(`OAuth error: ${deviceCode.error_code}`);
	}

	if (!deviceCode.verification_url || !deviceCode.user_code) {
		throw new Error('YouTube did not return a verification URL and user code.');
	}

	return deviceCode;
}

export function parseCredentialsFileContent(
	data: unknown,
): AuthCredentials | null {
	if (!data || typeof data !== 'object') {
		return null;
	}

	const obj = data as Record<string, unknown>;

	if (obj['schemaVersion'] !== SCHEMA_VERSION) {
		return null;
	}

	const method = obj['method'] as AuthMethod | undefined;

	// Handle legacy credentials without method field (assume oauth2)
	const resolvedMethod: AuthMethod = method ?? 'oauth2';

	if (resolvedMethod === 'cookie') {
		const cookie =
			typeof obj['cookie'] === 'string' ? obj['cookie'] : undefined;
		if (!cookie) {
			return null;
		}

		return {
			schemaVersion: SCHEMA_VERSION,
			method: 'cookie',
			cookie,
			signedInAt:
				typeof obj['signedInAt'] === 'string' ? obj['signedInAt'] : '',
			accountName:
				typeof obj['accountName'] === 'string' ? obj['accountName'] : undefined,
		};
	}

	// OAuth2 method (default/legacy)
	const tokens = obj['tokens'];

	if (!tokens || typeof tokens !== 'object') {
		// Allow credentials without tokens for cookie-based auth
		return null;
	}

	const t = tokens as Record<string, unknown>;

	// Minimal token validation (some tokens may be partial)
	if (typeof t['access_token'] !== 'string' || !t['access_token']) {
		return null;
	}

	return {
		schemaVersion: SCHEMA_VERSION,
		method: resolvedMethod,
		tokens: tokens as unknown as OAuth2Tokens,
		signedInAt: typeof obj['signedInAt'] === 'string' ? obj['signedInAt'] : '',
		accountName:
			typeof obj['accountName'] === 'string' ? obj['accountName'] : undefined,
	};
}

class AuthService {
	private credentials: AuthCredentials | null = null;
	private loading = false;

	constructor() {
		this.credentials = this.loadCredentials();
	}

	private loadCredentials(): AuthCredentials | null {
		try {
			if (!existsSync(CREDENTIALS_FILE)) {
				return null;
			}

			const data = readFileSync(CREDENTIALS_FILE, 'utf-8');
			const parsed = JSON.parse(data) as unknown;
			return parseCredentialsFileContent(parsed);
		} catch (error) {
			logger.warn('AuthService', 'Failed to load credentials', {
				error: formatError(error),
			});
			return null;
		}
	}

	saveCredentials(credentials: AuthCredentials): void {
		try {
			if (!existsSync(CONFIG_DIR)) {
				mkdirSync(CONFIG_DIR, {recursive: true, mode: 0o700});
			}

			const tempFile = `${CREDENTIALS_FILE}.tmp`;
			writeFileSync(tempFile, JSON.stringify(credentials, null, 2), {
				encoding: 'utf8',
				mode: 0o600,
			});

			let attempts = 0;
			const maxAttempts = 3;
			while (true) {
				try {
					renameSync(tempFile, CREDENTIALS_FILE);
					break;
				} catch (error: unknown) {
					const err = error as NodeJS.ErrnoException;
					attempts++;
					if (
						attempts >= maxAttempts ||
						(err.code !== 'EPERM' && err.code !== 'EBUSY')
					) {
						throw error;
					}
					try {
						if (existsSync(CREDENTIALS_FILE)) {
							unlinkSync(CREDENTIALS_FILE);
						}
					} catch {
						// Ignore
					}
				}
			}

			this.credentials = credentials;
			logger.info('AuthService', 'Credentials saved');
		} catch (error) {
			logger.error('AuthService', 'Failed to save credentials', {
				error: formatError(error),
			});
		}
	}

	getCachedCredentials(): OAuth2Tokens | null {
		if (!this.credentials || this.credentials.method !== 'oauth2') {
			return null;
		}
		return this.credentials.tokens ?? null;
	}

	getCookie(): string | null {
		if (!this.credentials || this.credentials.method !== 'cookie') {
			return null;
		}
		return this.credentials.cookie ?? null;
	}

	getAuthMethod(): AuthMethod | null {
		if (!this.credentials) {
			return null;
		}
		return this.credentials.method;
	}

	getStatus(): AuthStatus {
		if (!this.credentials) {
			return {loggedIn: false, tokenValid: false};
		}

		const method = this.credentials.method;

		if (method === 'cookie') {
			return {
				loggedIn: true,
				method: 'cookie',
				cookie: this.credentials.cookie,
				signedInAt: this.credentials.signedInAt,
				tokenValid: true,
				accountName: this.credentials.accountName,
			};
		}

		const tokens = this.credentials.tokens;

		if (!tokens) {
			return {loggedIn: false, tokenValid: false};
		}

		const hasTokens = tokens.access_token && tokens.refresh_token;

		if (!hasTokens) {
			return {loggedIn: false, tokenValid: false};
		}

		const expiryDate = tokens.expiry_date;
		const expiryMs = expiryDate ? new Date(expiryDate).getTime() : 0;
		const isExpired = !isNaN(expiryMs) && expiryMs > 0 && expiryMs < Date.now();

		return {
			loggedIn: true,
			method: 'oauth2',
			accountName: this.credentials.accountName,
			signedInAt: this.credentials.signedInAt,
			tokenValid: !isExpired,
		};
	}

	async signIn(options: SignInOptions = {}): Promise<{
		success: boolean;
		verificationUrl?: string;
		userCode?: string;
		error?: string;
	}> {
		if (this.loading) {
			return {success: false, error: 'Login already in progress'};
		}

		this.loading = true;

		try {
			options.onProgress?.('Starting YouTube client...');
			const innertube = await withTimeout(
				Innertube.create(),
				OAUTH_STEP_TIMEOUT_MS,
				'Timed out creating the YouTube client.',
			);

			const authPromise = new Promise<{
				success: boolean;
				error?: string;
			}>(resolve => {
				innertube.session.once('auth', ({credentials}) => {
					this.saveCredentials({
						schemaVersion: SCHEMA_VERSION,
						method: 'oauth2',
						tokens: credentials,
						signedInAt: new Date().toISOString(),
					});
					resolve({success: true});
				});

				innertube.session.once('auth-error', err => {
					resolve({
						success: false,
						error: err instanceof Error ? err.message : String(err),
					});
				});
			});

			options.onProgress?.(
				'Requesting a device code (YouTube TV OAuth, no Google Cloud app)...',
			);
			const deviceCode = await obtainDeviceAndUserCode(innertube.session.oauth);
			const info: DeviceCodeInfo = {
				verificationUrl: deviceCode.verification_url,
				userCode: deviceCode.user_code,
			};
			options.onDeviceCode?.(info);
			innertube.session.oauth.pollForAccessToken(deviceCode);

			const result = await authPromise;
			return {
				...result,
				verificationUrl: info.verificationUrl,
				userCode: info.userCode,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error('AuthService', 'Sign-in failed', {error: message});
			return {success: false, error: message};
		} finally {
			this.loading = false;
		}
	}

	async signOut(innertube?: Innertube): Promise<boolean> {
		try {
			if (this.credentials?.method === 'oauth2' && this.credentials.tokens) {
				if (innertube) {
					await innertube.session.signIn(this.credentials.tokens);
					await innertube.session.signOut();
				} else {
					const client = await Innertube.create();
					await client.session.signIn(this.credentials.tokens);
					await client.session.signOut();
				}
			}
		} catch (error) {
			logger.warn('AuthService', 'Token revocation failed (non-fatal)', {
				error: formatError(error),
			});
		}

		try {
			if (existsSync(CREDENTIALS_FILE)) {
				unlinkSync(CREDENTIALS_FILE);
			}
			this.credentials = null;
			logger.info('AuthService', 'Signed out, credentials removed');
			return true;
		} catch (error) {
			logger.error('AuthService', 'Failed to remove credentials', {
				error: formatError(error),
			});
			return false;
		}
	}

	async restoreSession(innertube: Innertube): Promise<boolean> {
		// Cookie auth doesn't need session restoration — cookie is passed
		// directly to Innertube.create() elsewhere
		if (this.credentials?.method === 'cookie') {
			logger.info('AuthService', 'Cookie auth — no session restoration needed');
			return true;
		}

		const tokens = this.getCachedCredentials();
		if (!tokens) {
			return false;
		}

		try {
			const expiryMs = tokens.expiry_date
				? new Date(tokens.expiry_date).getTime()
				: 0;
			const isExpiryValid = !isNaN(expiryMs) && expiryMs > 0;
			if (
				innertube.session.oauth.shouldRefreshToken() ||
				(isExpiryValid && expiryMs < Date.now())
			) {
				innertube.session.oauth.setTokens(tokens);
				await innertube.session.oauth.refreshAccessToken();
				const newTokens = innertube.session.oauth.oauth2_tokens;
				if (newTokens) {
					this.saveCredentials({
						schemaVersion: SCHEMA_VERSION,
						method: 'oauth2',
						tokens: newTokens,
						signedInAt: this.credentials?.signedInAt ?? '',
						accountName: this.credentials?.accountName,
					});
				}
			} else {
				await innertube.session.signIn(tokens);
			}

			logger.info('AuthService', 'Session restored successfully');
			return true;
		} catch (error) {
			logger.warn('AuthService', 'Session restore failed', {
				error: formatError(error),
			});
			try {
				await this.signOut(innertube);
			} catch (signOutError) {
				logger.warn('AuthService', 'Cleanup sign-out also failed', {
					error: formatError(signOutError),
				});
			}
			return false;
		}
	}

	async signInWithCookie(cookie: string): Promise<{
		success: boolean;
		accountName?: string;
		error?: string;
	}> {
		const trimmed = cookie.trim();
		if (!trimmed) {
			return {success: false, error: 'Cookie string is empty'};
		}

		try {
			this.saveCredentials({
				schemaVersion: SCHEMA_VERSION,
				method: 'cookie',
				cookie: trimmed,
				signedInAt: new Date().toISOString(),
			});

			logger.info('AuthService', 'Cookie-based sign-in successful');
			return {success: true};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error('AuthService', 'Cookie sign-in failed', {error: message});
			return {success: false, error: message};
		}
	}

	async signInFromCookieFile(filePath: string): Promise<{
		success: boolean;
		accountName?: string;
		error?: string;
	}> {
		const cookie = parseCookiesFile(filePath);
		if (!cookie) {
			return {
				success: false,
				error: `Failed to parse cookies from ${filePath}. File may not exist or may not contain YouTube cookies.`,
			};
		}

		return this.signInWithCookie(cookie);
	}

	async signInFromBrowser(browser: CookiesFromBrowser): Promise<{
		success: boolean;
		accountName?: string;
		error?: string;
	}> {
		const cookie = await parseBrowserCookies(browser);
		if (!cookie) {
			return {
				success: false,
				error: `Failed to extract YouTube cookies from ${browser}. Browser may not be installed or cookies are not accessible.`,
			};
		}

		return this.signInWithCookie(cookie);
	}
}

let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
	if (!authServiceInstance) {
		authServiceInstance = new AuthService();
	}

	return authServiceInstance;
}
