import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';

const HEALTH_FILE = path.join(CONFIG_DIR, 'invidious-health.json');
const DISCOVERY_URL = 'https://api.invidious.io/instances.json';
const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;

export const DEFAULT_INVIDIOUS_INSTANCES = [
	'https://inv.nadeko.net',
	'https://invidious.nerdvpn.de',
	'https://yewtu.be',
	'https://vid.puffyan.us',
] as const;

type InstanceHealth = {
	url: string;
	successCount: number;
	failureCount: number;
	lastSuccessAt?: number;
	lastFailureAt?: number;
	lastLatencyMs?: number;
};

type PersistedHealth = {
	schemaVersion: number;
	updatedAt: number;
	discoveredAt?: number;
	instances: InstanceHealth[];
};

function normalizeInstanceUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return null;
		}
		if (
			parsed.hostname.endsWith('.onion') ||
			parsed.hostname.endsWith('.i2p')
		) {
			return null;
		}
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return null;
	}
}

function scoreInstance(entry: InstanceHealth): number {
	const total = entry.successCount + entry.failureCount;
	if (total === 0) {
		return 0;
	}
	const successRate = entry.successCount / total;
	const recentBoost =
		entry.lastSuccessAt && Date.now() - entry.lastSuccessAt < 60 * 60 * 1000
			? 0.1
			: 0;
	return successRate + recentBoost;
}

export function parseInvidiousDiscoveryPayload(payload: unknown): string[] {
	if (!Array.isArray(payload)) {
		return [];
	}

	const urls: string[] = [];
	for (const entry of payload) {
		if (!Array.isArray(entry) || entry.length < 2) continue;
		const meta = entry[1];
		if (!meta || typeof meta !== 'object') continue;
		const record = meta as {
			type?: string;
			uri?: string;
		};
		if (record.type && record.type !== 'https') continue;
		const candidate = typeof record.uri === 'string' ? record.uri : null;
		const normalized = candidate ? normalizeInstanceUrl(candidate) : null;
		if (normalized) {
			urls.push(normalized);
		}
	}

	return urls;
}

class InvidiousHealthService {
	private state: PersistedHealth;
	private healthFilePath: string;
	private discoveryInFlight: Promise<void> | null = null;

	constructor(healthFilePath: string = HEALTH_FILE) {
		this.healthFilePath = healthFilePath;
		this.state = this.load() ?? this.createDefaultState();
	}

	getOrderedInstances(): string[] {
		const byUrl = new Map(
			this.state.instances.map(entry => [entry.url, entry] as const),
		);

		for (const url of DEFAULT_INVIDIOUS_INSTANCES) {
			if (!byUrl.has(url)) {
				byUrl.set(url, {
					url,
					successCount: 0,
					failureCount: 0,
				});
			}
		}

		return [...byUrl.values()]
			.sort((a, b) => scoreInstance(b) - scoreInstance(a))
			.map(entry => entry.url);
	}

	async ensureFreshInstances(): Promise<string[]> {
		const isStale =
			!this.state.discoveredAt ||
			Date.now() - this.state.discoveredAt > DISCOVERY_TTL_MS;

		if (isStale) {
			await this.refreshDiscovery();
		}

		return this.getOrderedInstances();
	}

	recordSuccess(instanceUrl: string, latencyMs?: number): void {
		const normalized = normalizeInstanceUrl(instanceUrl);
		if (!normalized) return;
		const entry = this.getOrCreate(normalized);
		entry.successCount += 1;
		entry.lastSuccessAt = Date.now();
		if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
			entry.lastLatencyMs = latencyMs;
		}
		this.persist();
	}

	recordFailure(instanceUrl: string): void {
		const normalized = normalizeInstanceUrl(instanceUrl);
		if (!normalized) return;
		const entry = this.getOrCreate(normalized);
		entry.failureCount += 1;
		entry.lastFailureAt = Date.now();
		this.persist();
	}

	async refreshDiscovery(): Promise<void> {
		if (this.discoveryInFlight) {
			await this.discoveryInFlight;
			return;
		}

		this.discoveryInFlight = this.runDiscovery();
		try {
			await this.discoveryInFlight;
		} finally {
			this.discoveryInFlight = null;
		}
	}

	private async runDiscovery(): Promise<void> {
		try {
			const response = await fetch(DISCOVERY_URL, {
				signal: AbortSignal.timeout(10_000),
			});
			if (!response.ok) {
				logger.warn('InvidiousHealth', 'Discovery request failed', {
					status: response.status,
				});
				return;
			}

			const payload = (await response.json()) as unknown;
			const discovered = parseInvidiousDiscoveryPayload(payload);
			if (discovered.length === 0) {
				logger.warn(
					'InvidiousHealth',
					'Discovery returned no usable instances',
				);
				return;
			}

			for (const url of discovered) {
				this.getOrCreate(url);
			}
			this.state.discoveredAt = Date.now();
			this.persist();
			logger.info('InvidiousHealth', 'Discovered Invidious instances', {
				count: discovered.length,
			});
		} catch (error) {
			logger.warn('InvidiousHealth', 'Discovery error', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private getOrCreate(url: string): InstanceHealth {
		const existing = this.state.instances.find(entry => entry.url === url);
		if (existing) {
			return existing;
		}
		const created: InstanceHealth = {
			url,
			successCount: 0,
			failureCount: 0,
		};
		this.state.instances.push(created);
		return created;
	}

	private createDefaultState(): PersistedHealth {
		return {
			schemaVersion: SCHEMA_VERSION,
			updatedAt: Date.now(),
			instances: DEFAULT_INVIDIOUS_INSTANCES.map(url => ({
				url,
				successCount: 0,
				failureCount: 0,
			})),
		};
	}

	private load(): PersistedHealth | null {
		try {
			if (!existsSync(this.healthFilePath)) {
				return null;
			}
			const parsed = JSON.parse(
				readFileSync(this.healthFilePath, 'utf8'),
			) as PersistedHealth;
			if (
				!parsed ||
				parsed.schemaVersion !== SCHEMA_VERSION ||
				!Array.isArray(parsed.instances)
			) {
				return null;
			}
			return parsed;
		} catch {
			return null;
		}
	}

	private persist(): void {
		try {
			const dir = path.dirname(this.healthFilePath);
			if (!existsSync(dir)) {
				mkdirSync(dir, {recursive: true});
			}
			this.state.updatedAt = Date.now();
			const tempFile = `${this.healthFilePath}.tmp`;
			writeFileSync(tempFile, JSON.stringify(this.state, null, 2), 'utf8');
			if (process.platform === 'win32' && existsSync(this.healthFilePath)) {
				unlinkSync(this.healthFilePath);
			}
			renameSync(tempFile, this.healthFilePath);
		} catch (error) {
			logger.warn('InvidiousHealth', 'Failed to persist health file', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

let instance: InvidiousHealthService | null = null;

export function getInvidiousHealthService(): InvidiousHealthService {
	if (!instance) {
		instance = new InvidiousHealthService();
	}
	return instance;
}

export function resetInvidiousHealthServiceForTests(
	healthFilePath?: string,
): InvidiousHealthService {
	instance = new InvidiousHealthService(healthFilePath);
	return instance;
}
