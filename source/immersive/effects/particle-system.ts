import type {RGB} from '../renderer/ansi-codes.ts';

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	color: RGB;
	decay: number;
	gravity: number;
	friction: number;
}

export interface ParticleConfig {
	maxParticles: number;
	gravity: number;
	friction: number;
	decay: number;
	spawnRate: number;
	initialVelocity: {min: number; max: number};
	size: {min: number; max: number};
	colors: RGB[];
}

function asFiniteNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class ParticleSystem {
	protected particles: Particle[] = [];
	protected config: ParticleConfig;
	private timeSinceLastSpawn = 0;

	constructor(config: Partial<ParticleConfig> = {}) {
		this.config = {
			maxParticles: config.maxParticles ?? 200,
			gravity: config.gravity ?? 0.1,
			friction: config.friction ?? 0.98,
			decay: config.decay ?? 0.95,
			spawnRate: config.spawnRate ?? 10,
			initialVelocity: config.initialVelocity ?? {min: 1, max: 5},
			size: config.size ?? {min: 1, max: 3},
			colors: config.colors ?? [
				[255, 100, 100],
				[100, 255, 100],
				[100, 100, 255],
				[255, 255, 100],
				[255, 100, 255],
			],
		};
	}

	update(deltaTime: number): void {
		const dtMs = asFiniteNumber(deltaTime, 0);
		const dt = dtMs / 16.67;

		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]!;

			p.vy += this.config.gravity * dt;
			p.vx *= this.config.friction;
			p.vy *= this.config.friction;

			p.x += p.vx * dt;
			p.y += p.vy * dt;

			p.life -= dtMs;
			p.size *= p.decay;

			if (p.life <= 0 || p.size < 0.1) {
				this.particles.splice(i, 1);
			}
		}

		this.timeSinceLastSpawn += dtMs;
		const spawnInterval = 1000 / this.config.spawnRate;

		if (
			this.timeSinceLastSpawn >= spawnInterval &&
			this.particles.length < this.config.maxParticles
		) {
			this.spawn();
			this.timeSinceLastSpawn = 0;
		}
	}

	spawn(x?: number, y?: number, count = 1): void {
		const spawnCount = Math.max(0, Math.floor(asFiniteNumber(count, 1)));
		const posFallbackX = typeof x === 'number' && Number.isFinite(x);
		const posFallbackY = typeof y === 'number' && Number.isFinite(y);

		for (let i = 0; i < spawnCount; i++) {
			if (this.particles.length >= this.config.maxParticles) break;

			const posX = posFallbackX ? x! : Math.random() * 100;
			const posY = posFallbackY ? y! : Math.random() * 100;
			const velMag =
				this.config.initialVelocity.min +
				Math.random() *
					(this.config.initialVelocity.max - this.config.initialVelocity.min);
			const angle = Math.random() * Math.PI * 2;

			this.particles.push({
				x: posX,
				y: posY,
				vx: Math.cos(angle) * velMag,
				vy: Math.sin(angle) * velMag,
				life: 1000 + Math.random() * 1000,
				maxLife: 1000 + Math.random() * 1000,
				size:
					this.config.size.min +
					Math.random() * (this.config.size.max - this.config.size.min),
				color:
					this.config.colors[
						Math.floor(Math.random() * this.config.colors.length)
					]!,
				decay: this.config.decay,
				gravity: this.config.gravity,
				friction: this.config.friction,
			});
		}
	}

	spawnBurst(x: number, y: number, count: number, color?: RGB): void {
		const originX = asFiniteNumber(x, 0);
		const originY = asFiniteNumber(y, 0);
		const burstCount = Math.max(0, Math.floor(asFiniteNumber(count, 0)));
		const burstColor =
			color ??
			this.config.colors[Math.floor(Math.random() * this.config.colors.length)];

		for (let i = 0; i < burstCount; i++) {
			if (this.particles.length >= this.config.maxParticles) break;

			const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.5;
			const velMag = 3 + Math.random() * 5;

			this.particles.push({
				x: originX,
				y: originY,
				vx: Math.cos(angle) * velMag,
				vy: Math.sin(angle) * velMag,
				life: 500 + Math.random() * 500,
				maxLife: 500 + Math.random() * 500,
				size: 2 + Math.random() * 3,
				color: burstColor ?? [255, 255, 255],
				decay: this.config.decay,
				gravity: this.config.gravity * 0.5,
				friction: this.config.friction,
			});
		}
	}

	getParticles(): Particle[] {
		return this.particles;
	}

	clear(): void {
		this.particles = [];
	}

	setConfig(config: Partial<ParticleConfig>): void {
		this.config = {...this.config, ...config};
	}

	getConfig(): ParticleConfig {
		return {...this.config};
	}
}

export class DiscoParticleSystem extends ParticleSystem {
	private hueOffset = 0;

	constructor(config: Partial<ParticleConfig> = {}) {
		super(config);
	}

	override update(deltaTime: number): void {
		const dtMs = asFiniteNumber(deltaTime, 0);
		this.hueOffset = (this.hueOffset + dtMs * 0.1) % 360;
		super.update(dtMs);
	}

	spawnWithDiscoColor(x: number, y: number, intensity: number): void {
		const originX = asFiniteNumber(x, 0);
		const originY = asFiniteNumber(y, 0);
		const level = Math.min(1, Math.max(0, asFiniteNumber(intensity, 0)));
		const hue = (this.hueOffset + Math.random() * 60) % 360;
		const color = this.hslToRgb(hue / 360, 0.8, 0.6);

		const count = Math.floor(1 + level * 5);
		const burstColor = color ?? [255, 255, 255];

		for (let i = 0; i < count; i++) {
			if (Math.random() > level) continue;

			const angle = Math.random() * Math.PI * 2;
			const velMag = 2 + Math.random() * 4 * level;

			if (this.particles.length >= this.config.maxParticles) break;

			this.particles.push({
				x: originX,
				y: originY,
				vx: Math.cos(angle) * velMag,
				vy: Math.sin(angle) * velMag - 2,
				life: 500 + Math.random() * 500,
				maxLife: 500 + Math.random() * 500,
				size: 2 + Math.random() * 2,
				color: burstColor,
				decay: this.config.decay,
				gravity: this.config.gravity * 0.5,
				friction: this.config.friction,
			});
		}
	}

	private hslToRgb(h: number, s: number, l: number): RGB {
		let r: number;
		let g: number;
		let b: number;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p: number, q: number, t: number): number => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
}
