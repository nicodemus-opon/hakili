// Bulk batch 4: ip, privacy, procedure, general.
// Run: node scripts/corpus-batch-04.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'src', 'lib', 'data', 'corpus');
function load(t) {
	return JSON.parse(readFileSync(join(dir, `${t}.json`), 'utf8'));
}
function save(t, arr) {
	arr.sort((a, b) => a.id.localeCompare(b.id));
	writeFileSync(join(dir, `${t}.json`), JSON.stringify(arr, null, '\t') + '\n');
	console.log(`${t}: ${arr.length}`);
}
const K = 'https://new.kenyalaw.org';

const ip = [
	{
		id: 'ke-ip-copyright-term-2026',
		title: 'How long copyright lasts',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			"Copyright generally lasts for the author's life plus a statutory period, differing for sound recordings and broadcasts. Confirm the term for the work type. Keep creation and publication records.",
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '2001-01-01',
		sw_keywords: ['haki', 'wimbo', 'kitabu']
	},
	{
		id: 'ke-ip-registration-how-2026',
		title: 'Registering copyright step by step',
		citation: 'Copyright Act; KECOBO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Apply to KECOBO with the work copy, applicant IDs, and fees, then collect the certificate. Registration strengthens enforcement. Keep the application, receipt, and certificate.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['sajili', 'KECOBO', 'wimbo']
	},
	{
		id: 'ke-ip-beat-sale-2026',
		title: 'Selling beats exclusively vs non-exclusively',
		citation: 'Copyright Act; contract guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Exclusive sales transfer defined rights to one artist; leases allow reuse. Put scope, term, credit, and royalties in writing. Keep licences and payment proof.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['beat', 'kuuza', 'wimbo']
	},
	{
		id: 'ke-ip-split-sheet-2026b',
		title: 'Split sheets for collaborations',
		citation: 'Copyright Act; CMO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Every session ends with a split sheet naming beatmakers, writers, and percentage shares with signatures. Without it, disputes default to messages. Keep signed splits with project files.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['wimbo', 'gawio', 'mkataba']
	},
	{
		id: 'ke-ip-cover-song-2026',
		title: 'Cover songs and remixes',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Covers and remixes need permission from rights holders except as fair dealing allows. Get licences before release. Keep permission letters and licences.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['wimbo', 'ruhusa', 'remix']
	},
	{
		id: 'ke-ip-sample-2026',
		title: 'Sampling other recordings',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Samples need clearance from master and publishing owners with fees. Uncleared samples invite takedowns and suits. Keep clearance letters and payment records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['sampuli', 'wimbo', 'ruhusa']
	},
	{
		id: 'ke-ip-distribution-2026',
		title: 'Distributing music on streaming platforms',
		citation: 'Copyright and distribution practice',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Distributors need accurate splits, ISRC codes, and rights confirmation before release. Verify royalty statements quarterly. Keep distribution contracts and statements.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['wimbo', 'spotify', 'pesa']
	},
	{
		id: 'ke-ip-royalty-split-2026',
		title: 'Collecting streaming royalties',
		citation: 'Copyright Act; CMO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Register works with MCSK, KAMP, and PRISK as applicable and declare releases for collection. Track statements per work. Keep membership and declaration records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['mirabaha', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-mcsk-2026',
		title: 'MCSK membership for composers',
		citation: 'Copyright Act; KECOBO licensing',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Composers and authors join MCSK with IDs, works lists, and fees for royalty collection. Keep membership cards and work declarations.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['MCSK', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-kamp-2026',
		title: 'KAMP for producers of sound recordings',
		citation: 'Copyright Act; KECOBO licensing',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Producers register recordings with KAMP for neighbouring rights collection. Keep master files and registration records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['KAMP', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-prisk-2026',
		title: 'PRISK for performers',
		citation: 'Copyright Act; KECOBO licensing',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Performers register performances with PRISK for broadcast and public-performance royalties. Keep performance records and membership details.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['PRISK', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-takedown-2026b',
		title: 'Filing takedowns that succeed',
		citation: 'Copyright Act; platform policies',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Takedowns need identity, work proof, registration where available, and exact infringing links. File truthfully; false claims attract penalties. Keep case numbers and evidence.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['youtube', 'wimbo', 'ripoti']
	},
	{
		id: 'ke-ip-counter-notice-2026',
		title: 'Answering a counter-notice',
		citation: 'Platform copyright process',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Counter-notices assert licence or fair use with evidence and consent to process. Respond within deadlines with counsel. Keep licences and correspondence.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['youtube', 'wimbo', 'pingamizi']
	},
	{
		id: 'ke-ip-demand-letter-2026',
		title: 'Demand letters for infringement',
		citation: 'Copyright Act; enforcement guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Demands identify the work, the infringement, and the remedy with a deadline before suit. Send with evidence annexed. Keep delivery proof and responses.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['barua', 'wizi', 'wimbo']
	},
	{
		id: 'ke-ip-kecobo-complaint-2026',
		title: 'Complaining to KECOBO',
		citation: 'Copyright Act; KECOBO complaints',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Complaints attach registration, infringement captures with dates, and demand history. KECOBO may mediate or refer for prosecution. Keep the complaint reference.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['KECOBO', 'malalamiko', 'wimbo']
	},
	{
		id: 'ke-ip-photography-2026',
		title: 'Photography copyright and client use',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Photographers own images unless assigned in writing; clients get the licensed uses stated. Put deliverables, revisions, and usage in the contract. Keep RAW files and contracts.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['picha', 'haki', 'mkataba']
	},
	{
		id: 'ke-ip-videography-2026',
		title: 'Videography contracts and footage',
		citation: 'Copyright Act; contract guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Video contracts state raw footage ownership, edits, timelines, and payment milestones. Deliver watermarked previews until balance. Keep contracts and delivery logs.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['video', 'haki', 'mkataba']
	},
	{
		id: 'ke-ip-logo-design-2026',
		title: 'Logo design ownership',
		citation: 'Copyright Act; Trade Marks Act',
		url: `${K}/akn/ke/act/1955/51`,
		content:
			'Logos transfer only with written assignment; designers retain rights otherwise. Clients secure source files and assignment. Keep design contracts and assignments.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '1955-01-01',
		sw_keywords: ['logo', 'haki', 'mkataba']
	},
	{
		id: 'ke-ip-trademark-search-2026',
		title: 'Trademark search before branding',
		citation: 'Trade Marks Act, Cap. 506',
		url: `${K}/akn/ke/act/1955/51`,
		content:
			'Search KIPI registers for conflicting marks in the relevant classes before printing packaging. Keep search reports and application receipts.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '1955-01-01',
		sw_keywords: ['trademark', 'jina', 'KIPI']
	},
	{
		id: 'ke-ip-trademark-file-2026',
		title: 'Filing a trademark at KIPI',
		citation: 'Trade Marks Act; KIPI procedure',
		url: `${K}/akn/ke/act/1955/51`,
		content:
			'File with the mark, class, applicant details, and fees, then follow examination and publication. Oppositions have timelines. Keep filing and publication records.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '1955-01-01',
		sw_keywords: ['trademark', 'sajili', 'KIPI']
	},
	{
		id: 'ke-ip-brand-infringe-2026',
		title: 'Someone copying your brand',
		citation: 'Trade Marks Act; Anti-Counterfeit Act',
		url: `${K}/akn/ke/act/2008/13`,
		content:
			'Collect purchase evidence, report to ACA and KIPI, and send demands before suing. Keep samples, receipts, and registration certificates.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2008-01-01',
		sw_keywords: ['bandia', 'jina', 'biashara']
	},
	{
		id: 'ke-ip-patent-basics-2026',
		title: 'Patentability requirements',
		citation: 'Industrial Property Act, 2001',
		url: `${K}/akn/ke/act/2001/3`,
		content:
			'Patents need novelty, inventive step, and industrial application with full disclosure. Public disclosure before filing destroys novelty. Keep lab books confidential.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '2001-01-01',
		sw_keywords: ['patent', 'uvumbuzi', 'KIPI']
	},
	{
		id: 'ke-ip-utility-model-2026',
		title: 'Utility models for smaller inventions',
		citation: 'Industrial Property Act, 2001',
		url: `${K}/akn/ke/act/2001/3`,
		content:
			'Simpler technical improvements may qualify as utility models with shorter terms. File before disclosure. Keep drawings and filing receipts.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '2001-01-01',
		sw_keywords: ['uvumbuzi', 'KIPI', 'haki']
	},
	{
		id: 'ke-ip-design-2026',
		title: 'Industrial designs for product look',
		citation: 'Industrial Property Act, 2001',
		url: `${K}/akn/ke/act/2001/3`,
		content:
			'Product shapes and patterns register as industrial designs with novelty requirements. Keep dated drawings and application records.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '2001-01-01',
		sw_keywords: ['design', 'bidhaa', 'KIPI']
	},
	{
		id: 'ke-ip-trade-secret-2026b',
		title: 'Protecting recipes and formulas',
		citation: 'Contract and IP guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Guard recipes with NDAs, access controls, and marked confidential documents. Register nothing publicly. Keep signed NDAs and access logs.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['siri', 'mapishi', 'biashara']
	},
	{
		id: 'ke-ip-nda-2026',
		title: 'NDAs with staff and partners',
		citation: 'Law of Contract Act',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'NDAs define confidential information, duration, and remedies with signatures before disclosure. Keep signed copies and disclosure logs.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['siri', 'mkataba', 'biashara']
	},
	{
		id: 'ke-ip-domain-2026',
		title: 'Domain names and business names',
		citation: 'KICA; business registration guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Register matching domains early with verified registrars and renew before expiry. Disputes follow registrar policy. Keep registration and renewal records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['domain', 'jina', 'mtandaoni']
	},
	{
		id: 'ke-ip-social-handle-2026',
		title: 'Stolen social media handles and pages',
		citation: 'Platform policies; cybercrime guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Recover hacked pages through platform verification with IDs and prior admin proof, then report to DCI. Keep admin records and recovery references.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['facebook', 'instagram', 'wizi']
	},
	{
		id: 'ke-ip-plagiarism-book-2026',
		title: 'Book plagiarism and publishing contracts',
		citation: 'Copyright Act; publishing practice',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Publishing contracts state royalties, territories, and reversion with manuscript delivery. Register the work with KECOBO. Keep contracts and royalty statements.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['kitabu', 'wizi', 'haki']
	},
	{
		id: 'ke-ip-software-2026',
		title: 'Software ownership with developers',
		citation: 'Copyright Act; contract guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Code ownership, licences, and escrow belong in written developer contracts with milestones. Keep repositories, contracts, and payment records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['programu', 'kompyuta', 'mkataba']
	},
	{
		id: 'ke-ip-freelance-design-2026',
		title: 'Freelance creative contracts',
		citation: 'Copyright Act; contract guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Freelance briefs state scope, revisions, timelines, fees, and rights transfer with deposits. Keep briefs, drafts, and payment records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['design', 'kazi', 'mkataba']
	},
	{
		id: 'ke-ip-church-music-2026',
		title: 'Church use of copyrighted music',
		citation: 'Copyright Act; CMO licensing',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Churches playing or streaming copyrighted music need blanket licences from CMOs. Obtain licences before events. Keep licences and setlists.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['kanisa', 'wimbo', 'leseni']
	},
	{
		id: 'ke-ip-dj-mixtape-2026',
		title: 'DJ mixtapes and club sets',
		citation: 'Copyright Act; CMO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Mixtapes with others tracks need licences for commercial release; venues carry performance licences. Keep licences and tracklists.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['DJ', 'wimbo', 'leseni']
	},
	{
		id: 'ke-ip-radio-play-2026',
		title: 'Getting radio airplay and royalties',
		citation: 'Copyright Act; media guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Submit clean edits with metadata to stations and register works with CMOs for airplay royalties. Track airplay logs. Keep submission and royalty records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['redio', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-skiza-2026',
		title: 'Skiza tunes and caller tunes revenue',
		citation: 'Copyright and telecom VAS practice',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Skiza deals need written revenue shares, reporting, and audit rights with aggregators. Reconcile statements. Keep contracts and payout records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['skiza', 'wimbo', 'pesa']
	},
	{
		id: 'ke-ip-film-permit-2026',
		title: 'Filming permits and locations',
		citation: 'Films and Stage Plays Act; KFCB guidance',
		url: `${K}/akn/ke/act/1962/34`,
		content:
			'Commercial shoots need KFCB and county permits with location consent. Apply early with scripts and crew lists. Keep permits and consent letters.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '1962-01-01',
		sw_keywords: ['filamu', 'leseni', 'ruhusa']
	},
	{
		id: 'ke-ip-kfcb-rating-2026',
		title: 'KFCB classification of films',
		citation: 'Films and Stage Plays Act',
		url: `${K}/akn/ke/act/1962/34`,
		content:
			'Films for public exhibition need KFCB examination and rating with submission fees. Keep submission receipts and certificates.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '1962-01-01',
		sw_keywords: ['filamu', 'leseni', 'KFCB']
	},
	{
		id: 'ke-ip-actor-contracts-2026',
		title: 'Actor and crew contracts',
		citation: 'Copyright Act; contract guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Production contracts state roles, pay, hours, image rights, and credit. Pay per milestones. Keep signed contracts and call sheets.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['filamu', 'mkataba', 'pesa']
	},
	{
		id: 'ke-ip-poetry-2026',
		title: 'Poetry and spoken word rights',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Poems are protected on creation; performances need venue licences and recording consent. Register collections with KECOBO. Keep manuscripts and event records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['shairi', 'haki', 'wimbo']
	},
	{
		id: 'ke-ip-art-gallery-2026',
		title: 'Selling art through galleries',
		citation: 'Copyright Act; consignment practice',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Gallery consignments state commission, insurance, and return with inventory. Photograph works on handover. Keep agreements and inventory.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['sanaa', 'picha', 'kuuza']
	},
	{
		id: 'ke-ip-craft-export-2026',
		title: 'Exporting crafts and curios',
		citation: 'Export and customs guidance',
		url: `${K}/akn/aa-eac/act/2004/1`,
		content:
			'Craft exports need business records, authorised materials, and customs declarations. CITES permits apply to restricted materials. Keep permits and shipping records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2004-01-01',
		sw_keywords: ['sanaa', 'nje', 'biashara']
	},
	{
		id: 'ke-ip-fair-dealing-2026',
		title: 'Fair dealing exceptions',
		citation: 'Copyright Act, 2001',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Research, private study, criticism, and news reporting may use excerpts with attribution within fair limits. Commercial copying rarely qualifies. Get advice before relying on it.',
		topic: 'ip',
		source_type: 'legislation',
		effective_date: '2001-01-01',
		sw_keywords: ['haki', 'matumizi', 'sheria']
	},
	{
		id: 'ke-ip-orphan-works-2026',
		title: 'Using works of unknown owners',
		citation: 'Copyright Act; KECOBO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Document diligent searches for owners before using orphan works, and stop on objection. Keep search records and use logs.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['haki', 'ruhusa', 'kitabu']
	},
	{
		id: 'ke-ip-franchise-2026',
		title: 'Franchise agreements',
		citation: 'Contract and trademark guidance',
		url: `${K}/akn/ke/act/1955/51`,
		content:
			'Franchises license brands and systems with fees, territories, training, and audit rights. Verify the franchisor record. Keep the agreement and payment records.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['franchise', 'biashara', 'mkataba']
	},
	{
		id: 'ke-ip-legal-aid-ip-2026',
		title: 'Legal aid for creators',
		citation: 'Legal Aid Act, 2016',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Exploited creators can seek NLAS and KECOBO help with contracts, splits, and registrations. The toll-free line is 0800 720 640. Keep all creative records.',
		topic: 'ip',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'wimbo', 'wakili']
	},
	{
		id: 'ke-ip-beat-stolen-2026b',
		title: 'Beat stolen from YouTube: evidence pack',
		citation: 'Copyright Act; KECOBO guidance',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Assemble project files, dated exports, upload logs, messages, and splits before filing takedowns. Preserve message originals. Keep the evidence bundle with dates.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['beat', 'wizi', 'youtube']
	},
	{
		id: 'ke-ip-name-release-2026',
		title: 'Clearing artist and song names',
		citation: 'Trademark and copyright practice',
		url: `${K}/akn/ke/act/1955/51`,
		content:
			'Search KIPI, streaming, and socials for conflicting artist and title names before release. Adjust early. Keep search screenshots.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['jina', 'wimbo', 'KIPI']
	},
	{
		id: 'ke-ip-publisher-2026',
		title: 'Music publishing deals',
		citation: 'Copyright Act; publishing practice',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Publishing deals assign administration with advances, splits, and reversion. Compare with CMO collection. Keep deal memos and statements.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['wimbo', 'mkataba', 'pesa']
	},
	{
		id: 'ke-ip-sync-2026',
		title: 'Sync licences for adverts and films',
		citation: 'Copyright Act',
		url: `${K}/akn/ke/act/2001/12`,
		content:
			'Sync uses need master and publishing licences with media, term, and fee terms. Clear before broadcast. Keep licences and cue sheets.',
		topic: 'ip',
		source_type: 'guidance',
		effective_date: '2001-01-01',
		sw_keywords: ['wimbo', 'filamu', 'leseni']
	}
];

const privacy = [
	{
		id: 'ke-priv-dpa-rights-2026b',
		title: 'Your rights over personal data',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Data subjects can access, correct, delete, object, and withdraw consent with requests to the controller. Respond in writing with ID. Keep request and response copies.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['faragha', 'data', 'haki']
	},
	{
		id: 'ke-priv-consent-2026',
		title: 'Valid consent for data collection',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Consent must be freely given, specific, and informed with clear opt-in, not pre-ticked boxes. Withdraw anytime. Keep consent screens and withdrawal proof.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['faragha', 'ruhusa', 'data']
	},
	{
		id: 'ke-priv-access-request-2026',
		title: 'Requesting your data from a company',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Write to the data controller describing the data sought with ID; they must respond within statutory timelines. Escalate to ODPC where ignored. Keep delivery proof.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['data', 'faragha', 'maombi']
	},
	{
		id: 'ke-priv-delete-request-2026',
		title: 'Deleting your data (right to erasure)',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Request deletion where data is unnecessary or consent is withdrawn, subject to legal retention duties. Keep the request, response, and confirmation.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['data', 'kufuta', 'faragha']
	},
	{
		id: 'ke-priv-odpc-file-2026b',
		title: 'Filing a complaint with ODPC',
		citation: 'Data Protection Act; ODPC procedure',
		url: 'https://www.odpc.go.ke/file-a-complaint/',
		content:
			'Complain first to the organisation, then to ODPC with evidence, reference numbers, and timelines. File online with attachments. Keep the complaint reference.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['ODPC', 'malalamiko', 'faragha']
	},
	{
		id: 'ke-priv-breach-2026',
		title: 'What to do after a data breach notice',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Change passwords, enable 2FA, monitor accounts, and preserve breach notices for claims. Report misuse to ODPC and DCI. Keep notices and loss records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['data', 'wizi', 'faragha']
	},
	{
		id: 'ke-priv-2fa-2026',
		title: 'Securing M-Pesa and bank accounts',
		citation: 'Cybercrime and consumer safety guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Use PINs, biometrics, and SIM PINs with no sharing of OTPs, and lock SIM swaps with the provider. Keep provider security confirmations.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['mpesa', 'usalama', 'OTP']
	},
	{
		id: 'ke-priv-phishing-2026',
		title: 'Spotting phishing messages',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Fake KRA, bank, and delivery links harvest credentials; verify sender addresses and never enter PINs via links. Report to providers and DCI. Keep message screenshots.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['tapeli', 'ujumbe', 'linki']
	},
	{
		id: 'ke-priv-job-scams-2026',
		title: 'Fake jobs harvesting ID data',
		citation: 'Penal Code; data protection guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Scam recruiters collect IDs and fees for nonexistent jobs. Verify premises and registration before sharing documents. Report with adverts and messages.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['kazi', 'tapeli', 'kitambulisho']
	},
	{
		id: 'ke-priv-loan-apps-2026b',
		title: 'Loan apps accessing contacts',
		citation: 'Data Protection Act; CBK guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Loan apps must limit collection and get consent before contacting your list; report shaming to ODPC and CBK. Keep permission screenshots and abusive messages.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['mkopo', 'app', 'faragha']
	},
	{
		id: 'ke-priv-employer-spying-2026',
		title: 'Employer monitoring of staff',
		citation: 'Data Protection Act; Employment Act',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Workplace CCTV, email, and device monitoring need notice, policy, and proportionality. Challenge covert surveillance in writing. Keep policies and monitoring notices.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['mwajiri', 'faragha', 'kazi']
	},
	{
		id: 'ke-priv-cctv-home-2026',
		title: 'Home CCTV and neighbours privacy',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Angle cameras to your property, inform visitors, and secure footage with limited retention. Neighbour complaints go to ODPC. Keep signage photos and retention policy.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['CCTV', 'faragha', 'jirani']
	},
	{
		id: 'ke-priv-school-data-2026',
		title: 'School records and children data',
		citation: 'Data Protection Act; Basic Education Act',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Schools need parental consent for publishing pupil photos and limit access to records. Object in writing to misuse. Keep consent forms and publications.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['shule', 'mtoto', 'faragha']
	},
	{
		id: 'ke-priv-hospital-records-2026',
		title: 'Hospital records confidentiality',
		citation: 'Health Act; Data Protection Act',
		url: `${K}/akn/ke/act/2017/21`,
		content:
			'Health facilities must keep treatment records confidential with access on consent or court order. Request your records in writing. Keep request and disclosure logs.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2017-01-01',
		sw_keywords: ['hospitali', 'siri', 'rekodi']
	},
	{
		id: 'ke-priv-huduma-data-2026',
		title: 'eCitizen and Huduma data safety',
		citation: 'Data Protection Act; eCitizen guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Use official eCitizen channels with strong passwords and verified agents; never share OTPs. Report misuse with transaction references. Keep payment receipts.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['ecitizen', 'faragha', 'OTP']
	},
	{
		id: 'ke-priv-wifi-2026',
		title: 'Public Wi-Fi safety',
		citation: 'Cybercrime safety guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Avoid banking on open Wi-Fi, use VPNs, and verify hotspot names with staff. Log out of shared devices. Keep incident notes where losses follow.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['wifi', 'usalama', 'mtandaoni']
	},
	{
		id: 'ke-priv-passwords-2026',
		title: 'Password and account recovery hygiene',
		citation: 'Cybercrime safety guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Use unique passwords with authenticator backups and updated recovery contacts. Store sparingly offline. Keep recovery codes safely.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['password', 'akaunti', 'usalama']
	},
	{
		id: 'ke-priv-lost-phone-2026b',
		title: 'Lost phone with mobile money',
		citation: 'KICA; provider guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Block the SIM immediately, freeze mobile money, and report to police with IMEI. Remotely secure accounts where possible. Keep OB and provider references.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['simu', 'kupoteza', 'mpesa']
	},
	{
		id: 'ke-priv-imei-block-2026b',
		title: 'Blocking a stolen phone by IMEI',
		citation: 'KICA; CA device guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Request IMEI blocking through the provider and police with box and purchase proof. Keep the box IMEI, receipt, and OB copy.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['IMEI', 'simu', 'wizi']
	},
	{
		id: 'ke-priv-defamation-2026b',
		title: 'Defamation in WhatsApp groups',
		citation: 'Defamation Act; Cybercrimes Act',
		url: `${K}/akn/ke/act/1970/10`,
		content:
			'False group messages harming reputation attract civil and criminal complaints. Preserve full-chat exports with dates, seek retraction first. Keep harm evidence.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '1970-01-01',
		sw_keywords: ['whatsapp', 'kashfa', 'sheria']
	},
	{
		id: 'ke-priv-false-news-2026',
		title: 'False publications about you online',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'False online publications are reported to platforms and DCI with links, timestamps, and harm evidence. Keep preservation screenshots before deletion.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['habari', 'uongo', 'mtandaoni']
	},
	{
		id: 'ke-priv-revenge-porn-2026b',
		title: 'Intimate images shared without consent',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Report to platforms, police, and support services immediately with links and handles; do not engage the poster. Preserve evidence with timestamps. Keep report references.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['picha', 'aibu', 'polisi']
	},
	{
		id: 'ke-priv-stalking-2026',
		title: 'Stalking and persistent harassment',
		citation: 'Protection Against Domestic Violence Act; Penal Code',
		url: `${K}/akn/ke/act/2015/2`,
		content:
			'Log every contact attempt with dates, seek protection orders, and report to police. Keep messages, logs, and witness details.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['unyanyasaji', 'vitisho', 'polisi']
	},
	{
		id: 'ke-priv-doxxing-2026',
		title: 'Doxxing: personal details posted online',
		citation: 'Data Protection Act; Cybercrimes Act',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Request platform removal, tighten account privacy, and report to ODPC and DCI with links. Keep removal requests and references.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['faragha', 'mtandaoni', 'data']
	},
	{
		id: 'ke-priv-kids-online-2026',
		title: 'Children safety online',
		citation: 'Children Act; cybercrime guidance',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Use parental controls, approve apps, and teach reporting of strangers and explicit content. Report exploitation to DCI child units. Keep device and incident logs.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'mtandaoni', 'usalama']
	},
	{
		id: 'ke-priv-mpesa-statement-2026',
		title: 'Getting M-Pesa statements for cases',
		citation: 'Provider and court evidence guidance',
		url: 'https://www.safaricom.co.ke/',
		content:
			'Request certified statements through official channels with ID for the disputed period. Courts admit certified records. Keep request receipts and statements.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mpesa', 'taarifa', 'pesa']
	},
	{
		id: 'ke-priv-call-recording-2026',
		title: 'Recording calls as evidence',
		citation: 'Evidence and data protection guidance',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Recordings are weighed with consent, disclosure, and authenticity context. Get advice before secret recording. Keep originals with metadata.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['kurekodi', 'sauti', 'ushahidi']
	},
	{
		id: 'ke-priv-tenant-data-2026',
		title: 'Landlord handling of tenant IDs',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Landlords should copy only needed ID pages, store securely, and return on exit. Object to sharing with third parties. Keep handover records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['mpangaji', 'kitambulisho', 'faragha']
	},
	{
		id: 'ke-priv-job-applicant-2026',
		title: 'Job applicant data and background checks',
		citation: 'Data Protection Act; Employment Act',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Background checks need consent with relevant scope; demand to see adverse findings. Keep application copies and consent records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['kazi', 'ajira', 'faragha']
	},
	{
		id: 'ke-priv-sacco-data-2026',
		title: 'SACCO member data use',
		citation: 'Data Protection Act; SACCO Act',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Societies must limit statements sharing and get consent for marketing. Object to guarantor shaming. Keep objection letters.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['sacco', 'faragha', 'data']
	},
	{
		id: 'ke-priv-church-data-2026',
		title: 'Church and chama member lists',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Groups need consent before publishing member contacts or photos. Request removal in writing. Keep consent and removal records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['kanisa', 'chama', 'faragha']
	},
	{
		id: 'ke-priv-marketing-sms-2026',
		title: 'Stopping spam SMS and calls',
		citation: 'KICA; Data Protection Act',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Opt out with STOP codes, block senders, and report persistent spam to CA and ODPC. Keep spam samples and complaint numbers.',
		topic: 'privacy',
		source_type: 'legislation',
		effective_date: '1998-01-01',
		sw_keywords: ['spam', 'ujumbe', 'simu']
	},
	{
		id: 'ke-priv-cctv-work-2026b',
		title: 'Workplace CCTV notices',
		citation: 'Data Protection Act; OSHA guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Employers must post CCTV notices with purpose and retention, limiting coverage of private areas. Raise objections in writing. Keep notices and policies.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['CCTV', 'kazi', 'faragha']
	},
	{
		id: 'ke-priv-biometric-2026',
		title: 'Biometric data at work and gates',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Fingerprints and face data need explicit consent with secure storage and alternatives. Query necessity in writing. Keep consent and policy records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['alama', 'kidole', 'faragha']
	},
	{
		id: 'ke-priv-hotel-guest-2026',
		title: 'Hotel guest registers',
		citation: 'Tourism and data protection guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Hotels collect IDs per law but must secure registers and limit access. Query over-collection. Keep booking confirmations.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['hoteli', 'kitambulisho', 'faragha']
	},
	{
		id: 'ke-priv-bank-statement-2026',
		title: 'Protecting bank statements shared for jobs',
		citation: 'Banking confidentiality; data protection',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Share redacted statements where possible and mark the purpose in writing. Demand deletion after review. Keep transmission records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['benki', 'taarifa', 'faragha']
	},
	{
		id: 'ke-priv-id-copy-2026',
		title: 'Signing across ID copies',
		citation: 'Fraud prevention practice',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Write the purpose and date across ID copies shared with agents to deter reuse for loans. Keep a log of copies issued.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kitambulisho', 'wizi', 'tahadhari']
	},
	{
		id: 'ke-priv-sim-replacement-2026',
		title: 'SIM replacement fraud prevention',
		citation: 'KICA agent procedures',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Replace SIMs in person with original ID and secret questions; set a SIM PIN after. Report suspicious replacements immediately. Keep agent receipts.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['laini', 'simu', 'wizi']
	},
	{
		id: 'ke-priv-whatsapp-hack-2026',
		title: 'Hacked WhatsApp accounts',
		citation: 'Cybercrime response guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Alert contacts, re-verify with SMS codes, enable two-step verification, and report fraud to contacts and DCI. Keep recovery records.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['whatsapp', 'wizi', 'akaunti']
	},
	{
		id: 'ke-priv-email-hack-2026',
		title: 'Hacked email recovery',
		citation: 'Cybercrime response guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Recover via provider flows, revoke sessions, and check forwarding rules set by attackers. Warn banks linked to the email. Keep recovery logs.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['barua', 'pepe', 'wizi']
	},
	{
		id: 'ke-priv-kra-pin-misuse-2026',
		title: 'KRA PIN used by fraudsters',
		citation: 'Tax Procedures Act; fraud guidance',
		url: 'https://www.kra.go.ke/',
		content:
			'Check iTax for unknown obligations, change credentials, and report to KRA and DCI with affidavits. Keep dispute letters and references.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['KRA', 'wizi', 'PIN']
	},
	{
		id: 'ke-priv-shaming-debt-2026',
		title: 'Debt collectors contacting your family',
		citation: 'Data Protection Act; CBK guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Collectors must not disclose your debt to contacts; report shaming to ODPC and CBK. Keep abusive messages and call logs.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['deni', 'aibu', 'faragha']
	},
	{
		id: 'ke-priv-legal-aid-privacy-2026',
		title: 'Legal aid for privacy violations',
		citation: 'Legal Aid Act; Data Protection Act',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Victims of serious data misuse can seek NLAS help with evidence and references. The toll-free line is 0800 720 640. Keep the full evidence file.',
		topic: 'privacy',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'faragha', 'ODPC']
	},
	{
		id: 'ke-priv-witness-data-2026',
		title: 'Protecting witness contacts',
		citation: 'Witness Protection Act; data guidance',
		url: `${K}/akn/ke/act/2006/16`,
		content:
			'Share witness details only with investigators and counsel, redacting where possible. Keep disclosure logs and protection references.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2006-01-01',
		sw_keywords: ['shahidi', 'siri', 'polisi']
	},
	{
		id: 'ke-priv-school-cctv-2026',
		title: 'CCTV in schools',
		citation: 'Data Protection Act; education guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Schools need CCTV policies with notices, limited coverage, and secure footage. Raise concerns with the board in writing. Keep policies and incident notes.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['shule', 'CCTV', 'mtoto']
	},
	{
		id: 'ke-priv-talent-show-2026',
		title: 'Children images in shows and adverts',
		citation: 'Children Act; Data Protection Act',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Using children in adverts needs parental consent with contracts and limited hours. Keep consent forms and contracts.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'picha', 'ruhusa']
	},
	{
		id: 'ke-priv-gps-tracking-2026',
		title: 'GPS tracking by employers or spouses',
		citation: 'Data Protection Act; family guidance',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Covert vehicle or phone tracking needs lawful basis and notice; challenge misuse in writing. Keep tracking evidence and objections.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['GPS', 'faragha', 'kufuatilia']
	},
	{
		id: 'ke-priv-public-records-2026',
		title: 'Removing personal data from public posts',
		citation: 'Data Protection Act; platform policies',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Request search and platform delisting of exposed IDs, contacts, and addresses with evidence. Keep removal requests and outcomes.',
		topic: 'privacy',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['mtandaoni', 'faragha', 'kufuta']
	}
];

const procedure = [
	{
		id: 'ke-proc-where-to-file-2026',
		title: 'Choosing the right court or tribunal',
		citation: 'Judiciary organisation guidance',
		url: 'https://www.judiciary.go.ke/',
		content:
			'Match the dispute to magistrates, Small Claims, ELC, ELRC, or tribunals by subject and value. Wrong forums waste fees and time. Confirm jurisdiction before filing.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mahakama', 'kesi', 'kufungua']
	},
	{
		id: 'ke-proc-fees-waiver-2026',
		title: 'Fee waivers for those who cannot pay',
		citation: 'Judiciary fees guidance; Legal Aid Act',
		url: 'https://efiling.court.go.ke/',
		content:
			'Fee waivers or legal aid cover apply on means proof for qualifying persons. Apply early with income evidence. Keep waiver decisions and receipts.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['ada', 'msaada', 'mahakama']
	},
	{
		id: 'ke-proc-service-affidavit-2026',
		title: 'Affidavits of service done right',
		citation: 'Civil Procedure Rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Process servers record time, place, and recipient of service with annexed documents. Defective service stalls cases. Keep the affidavit and server contacts.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['kupeleka', 'mahakama', 'karatasi']
	},
	{
		id: 'ke-proc-substituted-2026',
		title: 'Substituted service where respondents hide',
		citation: 'Civil Procedure Rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Courts allow newspaper, notice board, or electronic service where personal service fails, on application with attempts evidence. Keep attempt logs and the court order.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['mahakama', 'kesi', 'kutumikia']
	},
	{
		id: 'ke-proc-mention-2026b',
		title: 'What happens at mentions',
		citation: 'Court procedure guidance',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Mentions confirm service, compliance, and hearing readiness with directions and dates. Attend every mention. Keep the directions order and diary.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mahakama', 'kesi', 'tarehe']
	},
	{
		id: 'ke-proc-pretrial-2026',
		title: 'Pre-trial conferences and settlement',
		citation: 'Civil Procedure Rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Courts narrow issues and explore settlement before trial with document bundles. Prepare chronologies and offers. Keep conference notes and orders.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['mahakama', 'patanisho', 'kesi']
	},
	{
		id: 'ke-proc-bundle-2026',
		title: 'Preparing a trial bundle',
		citation: 'Court practice guidance',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Arrange pleadings, statements, exhibits, and authorities paginated with an index. Bring originals and copies. Keep the indexed bundle.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mahakama', 'nyaraka', 'kesi']
	},
	{
		id: 'ke-proc-witness-2026b',
		title: 'Witness statements and summons',
		citation: 'Evidence Act; court procedure',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'File signed witness statements early and summon reluctant witnesses through court process. Prepare witnesses on procedure, not testimony. Keep statements and summons.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1963-01-01',
		sw_keywords: ['shahidi', 'mahakama', 'ushahidi']
	},
	{
		id: 'ke-proc-exhibit-2026',
		title: 'Marking and producing exhibits',
		citation: 'Evidence Act',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Originals are marked sequentially with copies for the court and opponents. Photos, messages, and receipts need authentication. Keep exhibit lists.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1963-01-01',
		sw_keywords: ['ushahidi', 'mahakama', 'nyaraka']
	},
	{
		id: 'ke-proc-adjourn-2026',
		title: 'Seeking adjournments properly',
		citation: 'Court procedure guidance',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Request adjournments early with reasons and evidence, serving opponents in advance. Costs may follow. Keep the application and order.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1922-01-01',
		sw_keywords: ['tarehe', 'mahakama', 'kuahirisha']
	},
	{
		id: 'ke-proc-default-2026',
		title: 'Setting aside default judgments',
		citation: 'Civil Procedure Rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Defaults from missed service or deadlines can be set aside with explanation and draft defence, promptly. Keep service records and the draft defence.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['hukumu', 'mahakama', 'rufaa']
	},
	{
		id: 'ke-proc-injunction-2026b',
		title: 'Temporary injunctions to stop harm',
		citation: 'Civil Procedure Act; injunction practice',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Injunctions need a prima facie case, irreparable harm, and balance of convenience with full disclosure. Breach is contempt. Keep the application and order.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['amri', 'mahakama', 'zuia']
	},
	{
		id: 'ke-proc-contempt-2026',
		title: 'Contempt of court consequences',
		citation: 'Contempt of Court Act, 2016',
		url: `${K}/akn/ke/act/2016/29`,
		content:
			'Disobeying orders or disrupting courts attracts fines and jail. Comply or appeal; never ignore. Keep orders and compliance proof.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['amri', 'mahakama', 'adhabu']
	},
	{
		id: 'ke-proc-decree-2026b',
		title: 'Extracting decrees and orders',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Extract the sealed decree after judgment for enforcement with approved costs. Check names, dates, and orders. Keep the sealed decree.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['hukumu', 'mahakama', 'amri']
	},
	{
		id: 'ke-proc-execution-2026b',
		title: 'Executing decrees: options',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Execution runs through attachment, garnishee, or sale with warrants and notices. Choose the viable asset. Keep warrants and sale records.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['hukumu', 'deni', 'mahakama']
	},
	{
		id: 'ke-proc-garnishee-2026',
		title: 'Garnishee orders on bank accounts',
		citation: 'Civil Procedure Rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Courts can order banks holding debtor funds to pay the decree holder. Attack or defend with account evidence. Keep the order and bank records.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['benki', 'deni', 'mahakama']
	},
	{
		id: 'ke-proc-stay-2026',
		title: 'Stay of execution pending appeal',
		citation: 'Civil Procedure Rules; appellate practice',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Stays need prompt applications showing arguable appeal and security. File before execution completes. Keep the stay application and order.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['rufaa', 'mahakama', 'zuia']
	},
	{
		id: 'ke-proc-appeal-time-2026b',
		title: 'Appeal timelines are strict',
		citation: 'Civil and criminal appellate rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Appeal windows run from judgment with short days for different courts. Instruct counsel immediately. Keep the judgment and filing receipts.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['rufaa', 'muda', 'mahakama']
	},
	{
		id: 'ke-proc-record-appeal-2026',
		title: 'Records of appeal compilation',
		citation: 'Appellate jurisdiction practice',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Appeals need pleadings, judgment, proceedings, and grounds bound as records. Order proceedings early. Keep the filed record.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['rufaa', 'mahakama', 'nyaraka']
	},
	{
		id: 'ke-proc-review-2026',
		title: 'Review of judgments for error',
		citation: 'Civil Procedure Act; tribunal rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Review lies for errors apparent or new evidence with timelines. Distinguish from appeal. Keep the judgment and review application.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1924-01-01',
		sw_keywords: ['rufaa', 'mahakama', 'mapitio']
	},
	{
		id: 'ke-proc-jr-leave-2026',
		title: 'Judicial review leave stage',
		citation: 'Fair Administrative Action Act; JR procedure',
		url: `${K}/akn/ke/act/2015/4`,
		content:
			'Judicial review starts with leave showing an arguable case against a public body, filed promptly. Keep the decision, demand history, and leave papers.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['mahakama', 'serikali', 'mapitio']
	},
	{
		id: 'ke-proc-jr-remedies-2026',
		title: 'Judicial review remedies',
		citation: 'FAAA; JR practice',
		url: `${K}/akn/ke/act/2015/4`,
		content:
			'Courts quash unlawful decisions, compel action, or prohibit excess with declarations. Seek interim stays where harm looms. Keep orders and compliance notes.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['mahakama', 'amri', 'serikali']
	},
	{
		id: 'ke-proc-suing-state-2026',
		title: 'Suing the government: notice',
		citation: 'Government Proceedings Act, Cap. 40',
		url: `${K}/akn/ke/act/1956/15`,
		content:
			'Claims against government need pre-action notice with particulars before filing. Observe the notice period. Keep the notice and delivery proof.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1956-01-01',
		sw_keywords: ['serikali', 'madai', 'mahakama']
	},
	{
		id: 'ke-proc-chief-evidence-2026',
		title: 'Using chief letters as evidence',
		citation: 'Evidence Act; succession and land practice',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Chief letters support heir and boundary facts but need corroboration in court. Verify contents before filing. Keep the stamped letter and verification notes.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['chifu', 'barua', 'ushahidi']
	},
	{
		id: 'ke-proc-affidavit-2026b',
		title: 'Commissioning affidavits correctly',
		citation: 'Oaths and Statutory Declarations Act',
		url: `${K}/akn/ke/act/1923/20`,
		content:
			'Deponents swear before commissioners with IDs, stating facts within knowledge. False statements are perjury. Keep commissioned originals.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1923-01-01',
		sw_keywords: ['kiapo', 'mahakama', 'nyaraka']
	},
	{
		id: 'ke-proc-demand-before-suit-2026',
		title: 'Demand letters before filing suit',
		citation: 'Civil practice guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Send a dated demand with amount, basis, and deadline by traceable means. Many disputes settle here. Keep the demand and delivery proof.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['barua', 'madai', 'mahakama']
	},
	{
		id: 'ke-proc-computing-time-2026',
		title: 'Computing court timelines',
		citation: 'Civil Procedure Act; interpretation rules',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Count clear days excluding filing day per rules, watching weekend and holiday shifts. Diarise every deadline from orders. Keep a limitation diary.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['muda', 'tarehe', 'mahakama']
	},
	{
		id: 'ke-proc-efiling-account-2026',
		title: 'Creating a judiciary e-filing account',
		citation: 'Judiciary e-filing guidance',
		url: 'https://efiling.court.go.ke/',
		content:
			'Register with ID, email, and phone, then verify before filing. Keep login details secure and receipts for payments.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtandaoni', 'mahakama', 'kesi']
	},
	{
		id: 'ke-proc-scanning-2026',
		title: 'Scanning documents for e-filing',
		citation: 'E-filing practice guidance',
		url: 'https://efiling.court.go.ke/',
		content:
			'Scan clearly in PDF under size limits with correct orientation and labels. Rejected uploads delay cases. Keep digital and printed copies.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtandaoni', 'nyaraka', 'mahakama']
	},
	{
		id: 'ke-proc-case-search-2026',
		title: 'Tracking cases online',
		citation: 'Judiciary case tracking guidance',
		url: 'https://www.judiciary.go.ke/',
		content:
			'Follow case numbers for mentions, directions, and judgments on judiciary channels. Attend despite online updates. Keep hearing notices.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kesi', 'mahakama', 'mtandaoni']
	},
	{
		id: 'ke-proc-witness-expenses-2026',
		title: 'Witness expenses and allowances',
		citation: 'Court practice guidance',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Budget transport and subsistence for witnesses with receipts for taxation. Keep expense records and summons.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['shahidi', 'pesa', 'mahakama']
	},
	{
		id: 'ke-proc-interpreter-2026',
		title: 'Interpreters in court',
		citation: 'Constitution, Art. 50; court guidance',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Request interpretation early where language barriers exist; proceedings must be understood. Keep request records and hearing notes.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2010-08-27',
		sw_keywords: ['mkalimani', 'mahakama', 'lugha']
	},
	{
		id: 'ke-proc-plea-taking-2026b',
		title: 'Plea taking in criminal cases',
		citation: 'Criminal Procedure Code',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Charges are read in an understood language with guilty, not-guilty, or mute pleas recorded. Understand consequences before pleading. Keep the charge sheet.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['mashtaka', 'mahakama', 'polisi']
	},
	{
		id: 'ke-proc-bail-application-2026b',
		title: 'Applying for bail or bond',
		citation: 'Constitution, Art. 49; CPC',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Apply with IDs, sureties, and address proof; courts weigh flight risk and gravity. Keep the bail order and receipts.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['dhamana', 'mahakama', 'polisi']
	},
	{
		id: 'ke-proc-surety-2026',
		title: 'Standing as a surety',
		citation: 'Criminal procedure guidance',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Sureties pledge assets or cash with ID and attendance duties. Understand forfeiture risks. Keep surety documents and hearing dates.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mdhamini', 'dhamana', 'mahakama']
	},
	{
		id: 'ke-proc-probation-report-2026',
		title: 'Probation reports before sentence',
		citation: 'Probation of Offenders Act',
		url: `${K}/akn/ke/act/1943/29`,
		content:
			'Courts call social inquiry reports on background and reform prospects. Cooperate with probation officers. Keep the report and sentence records.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1943-01-01',
		sw_keywords: ['hukumu', 'mahakama', 'msamaha']
	},
	{
		id: 'ke-proc-victim-protection-2026b',
		title: 'Protecting vulnerable witnesses',
		citation: 'Victim Protection Act, 2014',
		url: `${K}/akn/ke/act/2014/17`,
		content:
			'Courts allow screens, video links, and closed sessions for vulnerable witnesses on application. Apply early. Keep the application and order.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['shahidi', 'mahakama', 'ulinzi']
	},
	{
		id: 'ke-proc-assessors-2026',
		title: 'Assessors in serious trials',
		citation: 'Criminal procedure guidance',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Serious trials may use assessors advising on facts with the judge deciding. Follow directions on evidence. Keep trial notes.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mahakama', 'kesi', 'jaji']
	},
	{
		id: 'ke-proc-sentence-mitigation-2026',
		title: 'Mitigation before sentencing',
		citation: 'Sentencing policy guidelines',
		url: 'https://www.judiciary.go.ke/',
		content:
			'Mitigate with remorse, restitution, family, and reform evidence after conviction. Prepare records and sureties. Keep the mitigation bundle.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['hukumu', 'msamaha', 'mahakama']
	},
	{
		id: 'ke-proc-fine-instalments-2026',
		title: 'Paying court fines in instalments',
		citation: 'Court fines practice',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Request time to pay with income proof where lump fines are impossible. Default risks warrants. Keep the order and payment receipts.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['faini', 'malipo', 'mahakama']
	},
	{
		id: 'ke-proc-warrant-search-2026',
		title: 'Search warrants: what to check',
		citation: 'Criminal Procedure Code',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Check the warrant address, scope, date, and issuing court, then observe and record the search. Do not obstruct. Keep the warrant copy and inventory.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['polisi', 'msako', 'hati']
	},
	{
		id: 'ke-proc-statement-record-2026',
		title: 'Recording statements with police',
		citation: 'Criminal procedure guidance',
		url: `${K}/akn/ke/act/2011/11a`,
		content:
			'Give truthful statements, read before signing, and keep a copy of the OB entry. Correct errors promptly. Keep statement copies.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['polisi', 'taarifa', 'OB']
	},
	{
		id: 'ke-proc-identification-parade-2026',
		title: 'Identification parades',
		citation: 'Criminal procedure and evidence guidance',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Parades follow regulated line-ups with counsel present for suspects. Witnesses identify without coaching. Keep parade records.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['polisi', 'shahidi', 'utambulisho']
	},
	{
		id: 'ke-proc-exhibit-custody-2026',
		title: 'Chain of custody for exhibits',
		citation: 'Evidence Act; police procedure',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Exhibits need sealed handling with movement logs from scene to court. Breaks weaken cases. Keep exhibit receipts.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['ushahidi', 'polisi', 'mahakama']
	},
	{
		id: 'ke-proc-plea-bargain-court-2026',
		title: 'Plea agreements in court',
		citation: 'CPC plea-bargaining framework',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Negotiated pleas go through counsel, victim input, and court approval with voluntariness checks. Keep the agreement and court record.',
		topic: 'procedure',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mashtaka', 'patanisho', 'mahakama']
	},
	{
		id: 'ke-proc-children-court-2026b',
		title: "Filing in Children's Court",
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Custody, maintenance, and protection matters file with birth records and prior orders through children officers. Keep filings and officer reports.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'mahakama', 'malezi']
	},
	{
		id: 'ke-proc-kadhi-file-2026',
		title: 'Filing in Kadhi courts',
		citation: 'Kadhi Courts Act',
		url: `${K}/akn/ke/act/1967/14`,
		content:
			'Muslim personal matters file with marriage, birth, and succession documents where parties submit. Keep filings and orders.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1967-01-01',
		sw_keywords: ['kadhi', 'mahakama', 'muislamu']
	},
	{
		id: 'ke-proc-coop-tribunal-file-2026b',
		title: 'Filing at the Co-operative Tribunal',
		citation: 'Co-operative Societies Act',
		url: `${K}/akn/ke/act/1997/12`,
		content:
			'SACCO and society disputes file with by-laws, statements, and demand history. Keep pleadings and orders together.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1997-01-01',
		sw_keywords: ['sacco', 'mahakama', 'mgogoro']
	},
	{
		id: 'ke-proc-tax-tribunal-file-2026b',
		title: 'Appealing to the Tax Appeals Tribunal',
		citation: 'Tax Appeals Tribunal Act, 2013',
		url: `${K}/akn/ke/act/2013/40`,
		content:
			'Appeal objection decisions within timelines with assessments and objection history. Keep assessment, objection, and appeal records.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['ushuru', 'KRA', 'rufaa']
	},
	{
		id: 'ke-proc-bprt-file-2026b',
		title: 'Filing at the Business Premises Tribunal',
		citation: 'Landlord and Tenant (Shops) Act',
		url: `${K}/akn/ke/act/1965/13`,
		content:
			'Protected tenancy disputes file with leases, notices, and payment records following statutory notice. Keep tribunal orders.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1965-01-01',
		sw_keywords: ['duka', 'kodi', 'mahakama']
	},
	{
		id: 'ke-proc-rent-tribunal-file-2026b',
		title: 'Filing at the Rent Tribunal',
		citation: 'Rent Restriction Act',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Controlled tenancy matters file on prescribed forms with agreements and receipts. Keep filings and orders.',
		topic: 'procedure',
		source_type: 'legislation',
		effective_date: '1959-01-01',
		sw_keywords: ['kodi', 'nyumba', 'mahakama']
	}
];

const general = [
	{
		id: 'ke-gen-doc-file-2026',
		title: 'Building a case file that wins',
		citation: 'Legal aid practice guidance',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'Keep IDs, contracts, receipts, messages, photos, and reference numbers in one dated file with originals separate. Organised files get faster help at every office. Update the timeline after each event.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['nyaraka', 'faili', 'msaada']
	},
	{
		id: 'ke-gen-timeline-2026',
		title: 'Writing a clear incident timeline',
		citation: 'Legal aid practice guidance',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'List dates, places, people, and what happened in order with supporting documents per entry. Timelines expose gaps and deadlines. Keep the timeline updated.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['tarehe', 'tukio', 'ripoti']
	},
	{
		id: 'ke-gen-photos-2026',
		title: 'Photos that count as evidence',
		citation: 'Evidence Act; practice guidance',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Take wide, medium, and close shots with dates, locations, and intact metadata. Back up originals. Keep printed and digital sets.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['picha', 'ushahidi', 'simu']
	},
	{
		id: 'ke-gen-messages-2026',
		title: 'Preserving chats and messages',
		citation: 'Evidence and cybercrime guidance',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Export full chats with dates, back up media, and avoid edits. Screenshots supplement but exports prove context. Keep originals and exports.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['ujumbe', 'whatsapp', 'ushahidi']
	},
	{
		id: 'ke-gen-witness-list-2026',
		title: 'Recording witness details early',
		citation: 'Evidence practice guidance',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Note names, contacts, and what each witness saw with dates. Memories fade fast. Keep the list with the timeline.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['shahidi', 'majina', 'ripoti']
	},
	{
		id: 'ke-gen-originals-2026',
		title: 'Originals vs copies',
		citation: 'Evidence Act (best evidence)',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Courts prefer originals; keep them safe and file certified copies where required. Never alter originals. Keep a copy log.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['nyaraka', 'asili', 'mahakama']
	},
	{
		id: 'ke-gen-certify-2026',
		title: 'Certifying documents',
		citation: 'Oaths and statutory declarations guidance',
		url: `${K}/akn/ke/act/1923/20`,
		content:
			'Certify copies with commissioners or issuing offices for filings. Keep certification receipts with the bundle.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1923-01-01',
		sw_keywords: ['nyaraka', 'muhuri', 'uthibitisho']
	},
	{
		id: 'ke-gen-nlas-2026b',
		title: 'Getting help from NLAS',
		citation: 'Legal Aid Act, 2016',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'Apply at NLAS centres with IDs, case documents, and income proof; the toll-free line is 0800 720 640. Follow up with the file reference. Keep the reference and appointment slips.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'wakili', 'bure']
	},
	{
		id: 'ke-gen-pro-bono-2026',
		title: 'Pro bono and university law clinics',
		citation: 'Legal aid and clinical education guidance',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'Law school clinics and LSK pro bono schemes assist qualifying matters with documents and merit screening. Apply with the full file. Keep referral letters.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['msaada', 'wakili', 'chuo']
	},
	{
		id: 'ke-gen-fida-2026',
		title: 'FIDA-Kenya for women and children',
		citation: 'FIDA-Kenya legal aid guidance',
		url: 'https://www.fidakenya.org/',
		content:
			'FIDA supports women and children on family, GBV, and succession matters through clinics and representation. Carry IDs and case documents. Keep intake references.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['mwanamke', 'msaada', 'mtoto']
	},
	{
		id: 'ke-gen-kituo-2026',
		title: 'Kituo cha Sheria legal aid',
		citation: 'Kituo cha Sheria guidance',
		url: 'https://www.kituosheria.or.ke/',
		content:
			'Kituo offers legal aid on evictions, employment, and criminal matters through offices and clinics. Book with documents ready. Keep appointment records.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['msaada', 'wakili', 'maskini']
	},
	{
		id: 'ke-gen-chief-letter-2026c',
		title: 'When offices ask for chief letters',
		citation: 'Administrative practice guidance',
		url: `${K}/akn/ke/act/2013/1`,
		content:
			'Chiefs confirm residence, family, and events with IDs and witnesses. Attend with documents and neighbours where needed. Keep stamped copies.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['chifu', 'barua', 'uthibitisho']
	},
	{
		id: 'ke-gen-affidavit-loss-2026',
		title: 'Affidavits for lost documents',
		citation: 'Oaths and Statutory Declarations Act',
		url: `${K}/akn/ke/act/1923/20`,
		content:
			'Swear loss affidavits with document details, OB numbers where applicable, and commissioner stamps for replacements. Keep commissioned copies.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '1923-01-01',
		sw_keywords: ['kiapo', 'kupoteza', 'cheti']
	},
	{
		id: 'ke-gen-police-abstract-2026b',
		title: 'Getting a police abstract',
		citation: 'NPS guidance',
		url: `${K}/akn/ke/act/2011/11a`,
		content:
			'Apply at the reporting station with the OB number and IDs, pay the fee, and collect the signed abstract. Keep the abstract for insurers and registries.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['OB', 'polisi', 'ripoti']
	},
	{
		id: 'ke-gen-ecitizen-account-2026',
		title: 'Setting up eCitizen correctly',
		citation: 'eCitizen guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Register with your ID, verified phone, and email with strong passwords. Link KRA, NTSA, and BRS services. Keep login recovery details safe.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['ecitizen', 'akaunti', 'mtandaoni']
	},
	{
		id: 'ke-gen-kra-pin-2026b',
		title: 'Getting a KRA PIN',
		citation: 'Tax Procedures Act; KRA guidance',
		url: 'https://www.kra.go.ke/',
		content:
			'Apply on iTax with ID and details, then collect the PIN certificate. Update details on changes. Keep the certificate secure.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['KRA', 'PIN', 'ushuru']
	},
	{
		id: 'ke-gen-filing-returns-2026',
		title: 'Filing nil and normal returns',
		citation: 'Tax Procedures Act; KRA guidance',
		url: 'https://www.kra.go.ke/',
		content:
			'File income returns yearly even where income is nil to avoid penalties, with P9 and business records. Keep filing receipts.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['KRA', 'ushuru', 'kuripoti']
	},
	{
		id: 'ke-gen-tcc-2026',
		title: 'Tax compliance certificates',
		citation: 'Tax Procedures Act; KRA guidance',
		url: 'https://www.kra.go.ke/',
		content:
			'Clear returns and debts before applying for TCC needed for tenders and jobs. Keep the certificate and renewal dates.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['KRA', 'cheti', 'tenda']
	},
	{
		id: 'ke-gen-sha-register-2026',
		title: 'Registering for SHIF (SHA)',
		citation: 'Social Health Insurance Act, 2023',
		url: `${K}/akn/ke/act/2023/16`,
		content:
			'Register households with IDs and dependants through SHA channels and confirm facility empanelment. Keep registration and contribution records.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2023-01-01',
		sw_keywords: ['SHA', 'bima', 'afya']
	},
	{
		id: 'ke-gen-nssf-register-2026',
		title: 'NSSF self-registration',
		citation: 'NSSF Act, 2013',
		url: `${K}/akn/ke/act/2013/45`,
		content:
			'Self-employed persons register with ID and contribute monthly for benefits. Keep the member number and payment records.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['NSSF', 'pensheni', 'malipo']
	},
	{
		id: 'ke-gen-birth-late-2026',
		title: 'Late birth registration',
		citation: 'Births and Deaths Registration Act',
		url: `${K}/akn/ke/act/1928/2`,
		content:
			'Late registration needs clinic cards, affidavits, and chief letters with fees. Start early for school and IDs. Keep notification slips.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '1928-01-01',
		sw_keywords: ['cheti', 'mtoto', 'kuchelewa']
	},
	{
		id: 'ke-gen-passport-apply-2026b',
		title: 'Applying for a passport',
		citation: 'Kenya Citizenship and Immigration Act',
		url: `${K}/akn/ke/act/2011/12`,
		content:
			'Apply on eCitizen with birth certificate, IDs, photos, and recommender details. Book biometrics. Keep application references.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['pasipoti', 'safiri', 'maombi']
	},
	{
		id: 'ke-gen-good-conduct-2026b',
		title: 'Police clearance for jobs',
		citation: 'NPS clearance guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Apply on eCitizen with fingerprints at gazetted centres for job and travel clearance. Keep the payment receipt and certificate.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['cheti', 'kazi', 'polisi']
	},
	{
		id: 'ke-gen-helb-higher-2026',
		title: 'University funding model appeals',
		citation: 'Universities Fund guidance',
		url: `${K}/akn/ke/act/1995/3`,
		content:
			'Appeal banding with household and admission evidence within timelines. Meet documentation checklists. Keep award and appeal records.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2023-01-01',
		sw_keywords: ['HELB', 'chuo', 'pesa']
	},
	{
		id: 'ke-gen-school-bursary-2026',
		title: 'Bursaries and CDF applications',
		citation: 'NG-CDF Act, 2015; county bursary guidance',
		url: `${K}/akn/ke/act/2015/9`,
		content:
			'Apply with fee structures, results, and chief letters before deadlines at ward offices. Keep application receipts and award letters.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['bursary', 'shule', 'pesa']
	},
	{
		id: 'ke-gen-disability-card-2026',
		title: 'Disability registration and card',
		citation: 'Persons with Disabilities Act, 2003',
		url: `${K}/akn/ke/act/2003/14`,
		content:
			'Assess at county hospitals, then register with the National Council for services and tax considerations. Keep assessment reports and the card.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2003-01-01',
		sw_keywords: ['ulemavu', 'kadi', 'msaada']
	},
	{
		id: 'ke-gen-older-cash-2026',
		title: 'Cash transfers for older persons',
		citation: 'Social Assistance Act, 2013',
		url: `${K}/akn/ke/act/2013/24`,
		content:
			'Enroll through social development officers with IDs for Inua Jamii consideration. Report payment failures with records. Keep enrollment slips.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['wazee', 'pesa', 'msaada']
	},
	{
		id: 'ke-gen-orphans-cash-2026',
		title: 'Support for orphans and vulnerable children',
		citation: 'Children Act; social protection guidance',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Report to children officers for placement, schooling, and cash-transfer consideration with birth and death records. Keep officer contacts and records.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['yatima', 'mtoto', 'msaada']
	},
	{
		id: 'ke-gen-flood-help-2026',
		title: 'Help after floods and disasters',
		citation: 'Disaster management guidance',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Report to chiefs and Red Cross with damage photos for relief and assessment. Keep loss lists and assistance records.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['mafuriko', 'msaada', 'janga']
	},
	{
		id: 'ke-gen-fire-help-2026',
		title: 'Help after fires',
		citation: 'County fire and disaster guidance',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Report to fire services, police, and chiefs with loss lists for relief and investigations. Keep OB, photos, and assistance records.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['moto', 'msaada', 'janga']
	},
	{
		id: 'ke-gen-noise-report-2026b',
		title: 'Reporting noise pollution',
		citation: 'EMCA noise regulations',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Log dates and times with recordings, then report to NEMA, county, or police. Night violations attract enforcement. Keep the diary and references.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '1999-01-01',
		sw_keywords: ['kelele', 'mazingira', 'ripoti']
	},
	{
		id: 'ke-gen-garbage-report-2026',
		title: 'Reporting illegal dumping',
		citation: 'EMCA; county by-laws',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Report dumping with photos and locations to county environment and NEMA. Use licensed collectors. Keep receipts and references.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1999-01-01',
		sw_keywords: ['taka', 'mazingira', 'ripoti']
	},
	{
		id: 'ke-gen-tree-plant-2026',
		title: 'Tree planting and chief permits',
		citation: 'Forest Conservation guidance',
		url: `${K}/akn/ke/act/2016/8`,
		content:
			'Source seedlings from licensed nurseries and confirm planting sites with chiefs where public land is used. Keep seedling receipts.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['miti', 'mazingira', 'kupanda']
	},
	{
		id: 'ke-gen-water-connect-2026',
		title: 'New water connections',
		citation: 'Water Act, 2016',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Apply to the county provider with IDs and plot details, pay connection fees officially. Keep application and payment records.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'kuunganisha', 'bili']
	},
	{
		id: 'ke-gen-prepaid-water-2026',
		title: 'Prepaid water meters',
		citation: 'Water services guidance',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Top up through official channels with meter numbers and keep tokens. Dispute faulty deductions with readings. Keep token records.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'token', 'malipo']
	},
	{
		id: 'ke-gen-kplc-connect-2026',
		title: 'New electricity connections',
		citation: 'Energy Act; KPLC guidance',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Apply with IDs, plot, and wiring certificates, paying official fees. Avoid middlemen. Keep application and payment records.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'kuunganisha', 'KPLC']
	},
	{
		id: 'ke-gen-meter-separate-2026',
		title: 'Separate meters in rentals',
		citation: 'Energy and water practice',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Agree meter separation costs and billing in writing with the landlord before splitting. Keep agreements and installer receipts.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'mita', 'nyumba']
	},
	{
		id: 'ke-gen-dead-animal-2026',
		title: 'Reporting dead livestock or disease',
		citation: 'Animal Diseases Act; veterinary guidance',
		url: `${K}/akn/ke/act/1965/7`,
		content:
			'Report sudden deaths to veterinary officers without moving carcasses. Keep treatment and vaccination records.',
		topic: 'general',
		source_type: 'legislation',
		effective_date: '1965-01-01',
		sw_keywords: ['ngombe', 'ugonjwa', 'mifugo']
	},
	{
		id: 'ke-gen-land-rates-pay-2026',
		title: 'Paying land rates and rent',
		citation: 'Rating Act; Land Act',
		url: `${K}/akn/ke/act/2024/15`,
		content:
			'Pay county rates and national ground rent before penalties block transfers. Keep demand notes and clearance receipts.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2024-01-01',
		sw_keywords: ['kodi', 'ardhi', 'malipo']
	},
	{
		id: 'ke-gen-petrol-safety-2026',
		title: 'Storing fuel at home safely',
		citation: 'Energy and fire safety guidance',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Avoid storing petrol indoors; use approved containers away from flames. Report illegal dens. Keep purchase receipts from licensed stations.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['petroli', 'moto', 'usalama']
	},
	{
		id: 'ke-gen-first-aid-2026',
		title: 'First aid after injuries',
		citation: 'Health and emergency guidance',
		url: `${K}/akn/ke/act/2017/21`,
		content:
			'Stop bleeding, call emergency services, and preserve the scene for investigators. Keep treatment records for claims.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '2017-01-01',
		sw_keywords: ['jeraha', 'msaada', 'hospitali']
	},
	{
		id: 'ke-gen-mental-help-2026',
		title: 'Getting counselling help',
		citation: 'Mental Health Act; helpline guidance',
		url: 'https://mental.health.go.ke/',
		content:
			'Reach counsellors, helplines, and clinics early; emergencies go to hospitals. Helplines include 1199 and 0800 720 640 referrals. Keep referral records.',
		topic: 'general',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['msaada', 'mawazo', 'afya']
	},
	{
		id: 'ke-gen-translate-docs-2026',
		title: 'Translating documents for filings',
		citation: 'Court and registry practice',
		url: `${K}/akn/ke/act/1963/46`,
		content:
			'Translate foreign-language documents with certified translators for court and registry use. Keep translator certificates.',
		topic: 'general',
		source_type: 'guidance',
		effective_date: '1963-01-01',
		sw_keywords: ['tafsiri', 'nyaraka', 'mahakama']
	}
];

for (const [t, items] of [
	['ip', ip],
	['privacy', privacy],
	['procedure', procedure],
	['general', general]
]) {
	const cur = load(t);
	const ids = new Set(cur.map((x) => x.id));
	const fresh = items.filter((x) => !ids.has(x.id));
	save(t, [...cur, ...fresh]);
	console.log(`added ${fresh.length} to ${t}`);
}
