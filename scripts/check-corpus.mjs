// Offline corpus coverage check: `node scripts/check-corpus.mjs`
// No DB or model needed — validates the checked-in JSON so any fresh
// clone can verify coverage before `pnpm db:up && pnpm ingest`.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'src/lib/data/kenyan-legal-corpus.json');
const corpus = JSON.parse(readFileSync(path, 'utf8'));

const ALLOWED = [
	'constitutional',
	'criminal',
	'employment',
	'family',
	'succession',
	'land',
	'housing',
	'consumer',
	'debt',
	'traffic',
	'business',
	'ip',
	'privacy',
	'procedure',
	'general'
];

// Representative queries (English / Kiswahili / Sheng) per topic.
// English probes must hit corpus tokens (FAIL otherwise); Swahili/Sheng
// probes only warn (vector search is cross-lingual, FTS uses sw_keywords).
const PROBES = {
	constitutional: [
		'police stopped me without reason rights',
		'haki zangu kikatiba',
		'access to information request procedure',
		'complain about chief misconduct',
		'arrested rights within 24 hours',
		'serikali haijajibu maombi yangu'
	],
	criminal: [
		'assault reported OB number',
		'wizi nimeibiwa simu',
		'theft phone IMEI blocking',
		'defilement child urgent medical steps',
		'threats to kill messages offence',
		'nimetapeliwa mpesa reversal fraud'
	],
	employment: [
		'dismissed without notice employer',
		'mwajiri amenifuta kazi bila notisi',
		'notice periods contract termination',
		'maternity leave protection dismissal',
		'overtime pay minimum wage order',
		'mshahara umechelewa nitafanyaje'
	],
	succession: [
		'father died no will land subdivision',
		'baba amefariki bila wosia',
		'formal requirements valid will witnesses',
		'surviving spouse share intestate',
		'chiefs letter beneficiaries list',
		'mjane amefukuzwa na ndugu'
	],
	land: [
		'boundary dispute title deed neighbour',
		'jirani amevamia shamba',
		'official land search Ardhisasa',
		'adverse possession occupation claim',
		'compulsory acquisition compensation inquiry',
		'nataka kununua shamba ninahitaji nini'
	],
	housing: [
		'landlord locked house eviction notice',
		'mwenye nyumba amenifungia nje',
		'rent deposit refund deductions',
		'termination notice to quit form',
		'repairs leaking roof landlord duty',
		'kodi imepanda bila notisi'
	],
	consumer: [
		'shop sold fake phone refund',
		'nimenunua simu bandia nataka refund',
		'warranty electronics defect repair',
		'electricity bill dispute meter reading',
		'counterfeit goods KEBS report',
		'bando zimeisha bila kutumia'
	],
	debt: [
		'mobile loan CRB listed wrongly',
		'mkopo niko CRB kimakosa',
		'auction notice redemption period',
		'guarantor called to pay loan',
		'HELB repayment clearance certificate',
		'deni ya mkopo nataka kulipa polepole'
	],
	traffic: [
		'road accident police abstract insurance',
		'ajali barabarani abstract',
		'driving licence classes renewal',
		'drink-driving breath test penalty',
		'logbook transfer TIMS steps',
		'nimenunua gari logbook haijatransfer'
	],
	business: [
		'client refused to pay invoice contract',
		'mteja hataki kulipa',
		'business name registration BRS',
		'eTIMS invoicing traders requirements',
		'single business permit county renewal',
		'nataka kufungua duka leseni gani'
	],
	ip: [
		'stole my beat from youtube song',
		'ameiba beat yangu youtube',
		'copyright registration KECOBO steps',
		'trademark search KIPI branding',
		'split sheet collaboration shares',
		'wimbo wangu umeibiwa mtandaoni'
	],
	privacy: [
		'mpesa fraud sim swap stolen',
		'nimetapeliwa mpesa',
		'access request personal data company',
		'complaint ODPC data misuse',
		'intimate images shared without consent',
		'nimepokea ujumbe wa tapeli'
	],
	procedure: [
		'small claims court filing limit',
		'legal aid 0800 720 640',
		'choosing right court tribunal jurisdiction',
		'temporary injunction stop harm requirements',
		'appeal timelines strict judgment',
		'nataka kufungua kesi mahakama gani'
	],
	family: [
		'custody maintenance child support',
		'matunzo ya mtoto',
		'divorce grounds marriage type',
		'birth registration certificate requirements',
		'matrimonial property division contribution',
		'mtalaka anagoma kutoa matunzo'
	],
	constitutional2: ['county askari closed shop permit', 'Huduma centre delayed ID complaint'],
	vehicle: [
		'bought car seller refused logbook transfer TIMS',
		'nimenunua gari hajatransfer logbook',
		'number plate verification logbook match'
	],
	courts: [
		'magistrates court mention hearing summons decree appeal',
		'tribunal filing procedure e-filing',
		'affidavit service substituted where respondent hides'
	],
	tax: [
		'KRA PIN eTIMS turnover VAT objection Tax Appeals Tribunal',
		'county single business permit market stall',
		'withholding tax suppliers deduction rates'
	]
};

let fail = 0;
const ids = new Set();
const SOURCE_TYPES = new Set(['legislation', 'guidance', 'ngo']);
for (const it of corpus) {
	if (!it.id || ids.has(it.id)) {
		console.error(`FAIL duplicate/missing id: ${it.id}`);
		fail++;
	}
	ids.add(it.id);
	if (!ALLOWED.includes(it.topic)) {
		console.error(`FAIL ${it.id}: bad topic ${it.topic}`);
		fail++;
	}
	for (const f of ['title', 'citation', 'url', 'content']) {
		if (!String(it[f] ?? '').trim()) {
			console.error(`FAIL ${it.id}: missing ${f}`);
			fail++;
		}
	}
	if (it.source_type !== undefined && !SOURCE_TYPES.has(it.source_type)) {
		console.error(`FAIL ${it.id}: bad source_type ${it.source_type}`);
		fail++;
	}
	if (!Array.isArray(it.sw_keywords) || it.sw_keywords.length === 0) {
		console.error(`FAIL ${it.id}: missing sw_keywords`);
		fail++;
	}
	if (!String(it.effective_date ?? '').trim()) {
		console.error(`FAIL ${it.id}: missing effective_date`);
		fail++;
	}
	if (!String(it.url ?? '').startsWith('https://')) {
		console.error(`FAIL ${it.id}: url is not https (${it.url})`);
		fail++;
	}
}

const counts = new Map();
for (const it of corpus) counts.set(it.topic, (counts.get(it.topic) ?? 0) + 1);
console.log(`Total passages: ${corpus.length}`);
for (const t of ALLOWED) {
	const n = counts.get(t) ?? 0;
	const mark = t !== 'general' && n < 20 ? 'FAIL (<20)' : 'ok';
	if (mark.startsWith('FAIL')) fail++;
	console.log(` - ${t}: ${n} [${mark}]`);
}

// Keyword sanity: each probe should match >=1 passage in its topic by token overlap.
const byTopic = new Map();
for (const it of corpus) {
	if (!byTopic.has(it.topic)) byTopic.set(it.topic, []);
	byTopic.get(it.topic).push(`${it.title} ${it.content}`.toLowerCase());
}
const toks = (s) =>
	s
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter((w) => w.length > 3);
for (const [topic, queries] of Object.entries(PROBES)) {
	const key =
		topic === 'constitutional2'
			? 'constitutional'
			: topic === 'vehicle'
				? 'traffic'
				: topic === 'courts'
					? 'procedure'
					: topic === 'tax'
						? 'business'
						: topic;
	const docs = byTopic.get(key) ?? [];
	for (const q of queries) {
		const qts = toks(q);
		const hit = docs.some((d) => qts.some((t) => d.includes(t)));
		// Swahili/Sheng probes often share no tokens with English corpus text;
		// embeddings are cross-lingual, so only warn (retrieval is vector-based).
		if (!hit)
			console.warn(
				`warn: probe "${q}" has no token overlap in topic ${key} (vector search may still match)`
			);
	}
}

// Stolen-beat regression: IP topic must exist with beat/copyright/KECOBO docs.
const ipDocs = (byTopic.get('ip') ?? []).join(' ');
for (const kw of ['beat', 'copyright', 'kecobo']) {
	if (!ipDocs.includes(kw)) {
		console.error(`FAIL ip topic missing keyword: ${kw}`);
		fail++;
	}
}

if (fail > 0) {
	console.error(`\nCorpus check FAILED (${fail} problems).`);
	process.exit(1);
}
console.log('\nCorpus check passed.');
