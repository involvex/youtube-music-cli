import {afterEach, expect, test} from 'bun:test';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const __fileTeardowns = [];
afterEach(() => {
	while (__fileTeardowns.length) {
		const fn = __fileTeardowns.pop();
		fn();
	}
});

const sampleTokens = {
	access_token: 'test-access-token',
	refresh_token: 'test-refresh-token',
	expiry_date: new Date(Date.now() + 3600_000).toISOString(),
	scope: 'https://www.googleapis.com/auth/youtube',
	token_type: 'Bearer',
	client: {
		client_id: 'test-client-id',
		client_secret: 'test-client-secret',
	},
};

test(
	'auth: parseCredentialsFileContent accepts valid payload',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 1,
			method: 'oauth2',
			tokens: sampleTokens,
			signedInAt: '2026-01-01T00:00:00.000Z',
		});

		expect(result).not.toBeNull();
		expect(result?.tokens?.access_token).toBe('test-access-token');
		expect(result?.method).toBe('oauth2');
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent accepts legacy payload without method',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 1,
			tokens: sampleTokens,
			signedInAt: '2026-01-01T00:00:00.000Z',
		});

		expect(result).not.toBeNull();
		expect(result?.method).toBe('oauth2');
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent accepts cookie-based credentials',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 1,
			method: 'cookie',
			cookie: 'SID=test-sid; HSID=test-hsid; SSID=test-ssid',
			signedInAt: '2026-01-01T00:00:00.000Z',
		});

		expect(result).not.toBeNull();
		expect(result?.method).toBe('cookie');
		expect(result?.cookie).toBe('SID=test-sid; HSID=test-hsid; SSID=test-ssid');
		expect(result?.tokens).toBeUndefined();
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent rejects cookie credentials without cookie',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 1,
			method: 'cookie',
			signedInAt: '2026-01-01T00:00:00.000Z',
		});

		expect(result).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent rejects invalid schema version',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 99,
			tokens: sampleTokens,
		});

		expect(result).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent rejects token credentials without access_token',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		const result = parseCredentialsFileContent({
			schemaVersion: 1,
			tokens: {access_token: ''},
		});

		expect(result).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: parseCredentialsFileContent returns null for garbage input',
	async () => {
		const {parseCredentialsFileContent} =
			await import('../source/services/auth/auth.service.ts');

		expect(parseCredentialsFileContent(null)).toBeNull();
		expect(parseCredentialsFileContent('string')).toBeNull();
		expect(parseCredentialsFileContent(42)).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: AuthService getStatus and credential saving with strict permissions',
	async () => {
		const {getAuthService} =
			await import('../source/services/auth/auth.service.ts');
		const authService = getAuthService();

		// Save test credentials
		authService.saveCredentials({
			schemaVersion: 1,
			method: 'oauth2',
			tokens: sampleTokens,
			signedInAt: new Date().toISOString(),
			accountName: 'Test Account',
		});

		const status = authService.getStatus();
		expect(status.loggedIn).toBe(true);
		expect(status.accountName).toBe('Test Account');
		expect(status.tokenValid).toBe(true);
		expect(status.method).toBe('oauth2');

		// Sign out should clear credentials
		await authService.signOut();
		const loggedOutStatus = authService.getStatus();
		expect(loggedOutStatus.loggedIn).toBe(false);
	},
	{timeout: 60_000},
);

test(
	'auth: AuthService getStatus with cookie-based auth',
	async () => {
		const {getAuthService} =
			await import('../source/services/auth/auth.service.ts');
		const authService = getAuthService();

		// Save cookie credentials
		authService.saveCredentials({
			schemaVersion: 1,
			method: 'cookie',
			cookie: 'SID=test-sid; HSID=test-hsid',
			signedInAt: new Date().toISOString(),
			accountName: 'Cookie User',
		});

		const status = authService.getStatus();
		expect(status.loggedIn).toBe(true);
		expect(status.method).toBe('cookie');
		expect(status.cookie).toBe('SID=test-sid; HSID=test-hsid');
		expect(status.tokenValid).toBe(true);

		// getCookie should return the cookie
		expect(authService.getCookie()).toBe('SID=test-sid; HSID=test-hsid');

		// getAuthMethod should return 'cookie'
		expect(authService.getAuthMethod()).toBe('cookie');

		// getCachedCredentials should return null for cookie auth
		expect(authService.getCachedCredentials()).toBeNull();

		// Sign out should clear credentials
		await authService.signOut();
		const loggedOutStatus = authService.getStatus();
		expect(loggedOutStatus.loggedIn).toBe(false);
		expect(authService.getCookie()).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: AuthService signInWithCookie stores and retrieves cookie',
	async () => {
		const {getAuthService} =
			await import('../source/services/auth/auth.service.ts');
		const authService = getAuthService();

		const cookie = 'SID=abc123; HSID=def456; SSID=ghi789';
		const result = await authService.signInWithCookie(cookie);

		expect(result.success).toBe(true);

		const status = authService.getStatus();
		expect(status.loggedIn).toBe(true);
		expect(status.method).toBe('cookie');
		expect(authService.getCookie()).toBe(cookie);

		// Cleanup
		await authService.signOut();
	},
	{timeout: 60_000},
);

test(
	'auth: AuthService signInWithCookie rejects empty cookie',
	async () => {
		const {getAuthService} =
			await import('../source/services/auth/auth.service.ts');
		const authService = getAuthService();

		const result = await authService.signInWithCookie('');

		expect(result.success).toBe(false);
		expect(result.error).toBe('Cookie string is empty');
	},
	{timeout: 60_000},
);

test(
	'auth: parseCookiesFile parses Netscape cookies.txt format',
	async () => {
		const {parseCookiesFile} =
			await import('../source/services/auth/cookie-utils.ts');

		// Create a temp Netscape cookies.txt file
		const tmpDir = mkdtempSync(join(tmpdir(), 'ymc-test-'));
		__fileTeardowns.push(() => rmSync(tmpDir, {recursive: true, force: true}));

		const cookiesPath = join(tmpDir, 'cookies.txt');
		const netscapeContent = [
			'# Netscape HTTP Cookie File',
			'.youtube.com\tTRUE\t/\tTRUE\t1735689600\tSID\tabc123',
			'.youtube.com\tTRUE\t/\tTRUE\t1735689600\tHSID\tdef456',
			'.youtube.com\tTRUE\t/\tTRUE\t1735689600\tSSID\tghi789',
		].join('\n');

		writeFileSync(cookiesPath, netscapeContent);

		const result = parseCookiesFile(cookiesPath);
		expect(result).not.toBeNull();
		expect(result).toContain('SID=abc123');
		expect(result).toContain('HSID=def456');
		expect(result).toContain('SSID=ghi789');
	},
	{timeout: 60_000},
);

test(
	'auth: parseCookiesFile returns null for non-existent file',
	async () => {
		const {parseCookiesFile} =
			await import('../source/services/auth/cookie-utils.ts');

		const result = parseCookiesFile('/nonexistent/path/cookies.txt');
		expect(result).toBeNull();
	},
	{timeout: 60_000},
);

test(
	'auth: withTimeout resolves before the deadline and rejects after it',
	async () => {
		const {withTimeout} =
			await import('../source/services/auth/auth.service.ts');

		await expect(withTimeout(Promise.resolve('ok'), 50, 'late')).resolves.toBe(
			'ok',
		);
		await expect(
			withTimeout(new Promise(() => {}), 20, 'too slow'),
		).rejects.toThrow('too slow');
	},
	{timeout: 60_000},
);

test(
	'auth: obtainDeviceAndUserCode reports the code before polling',
	async () => {
		const {obtainDeviceAndUserCode} =
			await import('../source/services/auth/auth.service.ts');

		const oauth = {
			client_id: undefined,
			getClientID: async () => ({client_id: 'id', client_secret: 'secret'}),
			getDeviceAndUserCode: async () => ({
				device_code: 'dev',
				expires_in: 1800,
				interval: 5,
				user_code: 'ABCD-EFGH',
				verification_url: 'https://www.google.com/device',
			}),
		};

		const deviceCode = await obtainDeviceAndUserCode(oauth);
		expect(deviceCode.user_code).toBe('ABCD-EFGH');
		expect(deviceCode.verification_url).toBe('https://www.google.com/device');
		expect(oauth.client_id).toEqual({
			client_id: 'id',
			client_secret: 'secret',
		});
	},
	{timeout: 60_000},
);

test(
	'auth: parseCookiesFile parses raw cookie header',
	async () => {
		const {parseCookiesFile} =
			await import('../source/services/auth/cookie-utils.ts');

		const tmpDir = mkdtempSync(join(tmpdir(), 'ymc-test-'));
		__fileTeardowns.push(() => rmSync(tmpDir, {recursive: true, force: true}));

		const cookiesPath = join(tmpDir, 'cookies.txt');
		writeFileSync(cookiesPath, 'SID=raw-cookie; HSID=another-cookie');

		const result = parseCookiesFile(cookiesPath);
		expect(result).toBe('SID=raw-cookie; HSID=another-cookie');
	},
	{timeout: 60_000},
);

test('auth: OAuth sessions are rejected for the account library with a cookie hint', async () => {
	const {getAuthService, OAUTH_UNSUPPORTED_MESSAGE} =
		await import('../source/services/auth/auth.service.ts');
	const {assertAccountLibraryAuth, AccountLibraryAuthError} =
		await import('../source/services/youtube-music/account-library.ts');
	const authService = getAuthService();

	authService.saveCredentials({
		schemaVersion: 1,
		method: 'oauth2',
		tokens: sampleTokens,
		signedInAt: new Date().toISOString(),
	});

	try {
		expect(() => assertAccountLibraryAuth()).toThrow(AccountLibraryAuthError);
		expect(() => assertAccountLibraryAuth()).toThrow(OAUTH_UNSUPPORTED_MESSAGE);
		expect(OAUTH_UNSUPPORTED_MESSAGE).toContain('--cookies-from-browser');

		// Cookie sessions are still accepted
		authService.saveCredentials({
			schemaVersion: 1,
			method: 'cookie',
			cookie: 'SID=test-sid',
			signedInAt: new Date().toISOString(),
		});
		expect(() => assertAccountLibraryAuth()).not.toThrow();
	} finally {
		// Cookie sign-out is local only (no network revoke)
		authService.saveCredentials({
			schemaVersion: 1,
			method: 'cookie',
			cookie: 'SID=test-sid',
			signedInAt: new Date().toISOString(),
		});
		await authService.signOut();
	}
});
