import { existsSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const nm = join(root, 'node_modules');
const target = join(nm, 'bare-runtime-darwin-arm64');
if (existsSync(target)) process.exit(0);

const pnpmDir = join(nm, '.pnpm');
if (!existsSync(pnpmDir)) process.exit(0);

const entry = readdirSync(pnpmDir).find((d) => d.startsWith('bare-runtime-darwin-arm64@'));
if (!entry) process.exit(0);

const resolved = join(pnpmDir, entry, 'node_modules', 'bare-runtime-darwin-arm64');
if (existsSync(resolved)) {
	try {
		symlinkSync(resolved, target);
		console.log('Linked bare-runtime-darwin-arm64');
	} catch (e) {
		console.warn('Could not link bare-runtime-darwin-arm64:', e);
	}
}
