// Bulk batch 1: constitutional, criminal, employment, family.
// Appends curated guidance passages to per-topic corpus files.
// Run: node scripts/corpus-batch-01.mjs
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

const constitutional = [
	{
		id: 'ke-const-art19-rights-2026',
		title: 'Rights and fundamental freedoms — scope',
		citation: 'Constitution of Kenya, 2010, Art. 19',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 19 explains that rights belong to individuals, preserve dignity, and bind the State and, where applicable, private persons. Limits must be justified under Article 24. When relying on a right, identify the specific article and how the facts fit it, then seek legal aid to test the claim.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['haki', 'katiba', 'haki zangu']
	},
	{
		id: 'ke-const-art20-application-2026',
		title: 'Application of the Bill of Rights',
		citation: 'Constitution of Kenya, 2010, Art. 20',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 20 requires courts to interpret rights to favour their enforcement and to consider values like human dignity and equality. A person alleging a violation can go straight to the High Court. Keep a dated account of events, witnesses, and any documents showing the violation.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['haki', 'mahakama', 'katiba']
	},
	{
		id: 'ke-const-art21-implementation-2026',
		title: 'Implementation of rights and State duties',
		citation: 'Constitution of Kenya, 2010, Art. 21',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 21 obliges the State to observe, respect, protect, promote and fulfil rights, with progressive realisation for socio-economic rights within available resources. When petitioning an office, cite the duty and attach evidence of requests already made. Keep stamped copies of every petition.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['serikali', 'haki', 'maombi']
	},
	{
		id: 'ke-const-art22-enforcement-2026',
		title: 'Enforcing the Bill of Rights in court',
		citation: 'Constitution of Kenya, 2010, Art. 22',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 22 lets any person alleging a rights violation apply to the High Court for redress, and associations may act in the public interest. Formalities should be kept to a minimum. File a petition with an affidavit, the facts, the rights infringed, and the orders sought.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['mahakama', 'haki', ' kesi']
	},
	{
		id: 'ke-const-art23-authority-2026',
		title: 'Relief the High Court may grant',
		citation: 'Constitution of Kenya, 2010, Art. 23',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Under Article 23 the High Court may declare rights violated, issue injunctions, order compensation, or grant conservatory orders to preserve the position pending hearing. Ask a lawyer which orders fit the urgency. Keep the petition, affidavits, and any interim orders together.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['mahakama', 'haki', 'amri']
	},
	{
		id: 'ke-const-art24-limitation-2026',
		title: 'When rights may be limited',
		citation: 'Constitution of Kenya, 2010, Art. 24',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 24 permits limits only by law that is reasonable and justifiable in an open and democratic society, considering the nature and purpose of the limit. Some rights, such as freedom from torture, cannot be limited. Challenge any limit by asking the authority to cite the exact law.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['haki', 'sheria', 'katiba']
	},
	{
		id: 'ke-const-art25-nonlimit-2026',
		title: 'Rights that cannot be limited',
		citation: 'Constitution of Kenya, 2010, Art. 25',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 25 protects freedom from torture and cruel treatment, slavery, and the right to a fair trial as non-limitable. Violations should be reported to police, IPOA where officers are involved, and a lawyer immediately. Preserve medical evidence and witness details.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['haki', 'mateso', 'polisi']
	},
	{
		id: 'ke-const-art27-equality-2026',
		title: 'Equality and freedom from discrimination',
		citation: 'Constitution of Kenya, 2010, Art. 27',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 27 guarantees equality before the law and bans discrimination on grounds including race, sex, pregnancy, disability, and religion. Affirmative action for marginalised groups is allowed. Record dates, comparators, and documents when lodging an equality complaint.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['usawa', 'ubaguzi', 'haki']
	},
	{
		id: 'ke-const-art28-dignity-2026',
		title: 'Human dignity protection',
		citation: 'Constitution of Kenya, 2010, Art. 28',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 28 declares every person has inherent dignity that must be respected and protected. Degrading treatment by officials or employers can ground complaints to oversight bodies and courts. Document what was said or done, where, and who witnessed it.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['heshima', 'haki', 'utumishi']
	},
	{
		id: 'ke-const-art29-security-2026',
		title: 'Freedom and security of the person',
		citation: 'Constitution of Kenya, 2010, Art. 29',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 29 protects against arbitrary detention, bodily harm, and psychological torture. Anyone detained must be told reasons and produced in court within 24 hours. Note the station, OB number, officers involved, and time of arrest for any follow-up.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['kukamatwa', 'polisi', 'haki']
	},
	{
		id: 'ke-const-art30-slavery-2026',
		title: 'Freedom from slavery and forced labour',
		citation: 'Constitution of Kenya, 2010, Art. 30',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 30 prohibits slavery, servitude, and forced labour. Workers held through threats, withheld documents, or debt bondage can report to police and the labour office and seek shelter support. Keep contracts, messages, and payment records as evidence.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['utumwa', 'kazi', 'haki']
	},
	{
		id: 'ke-const-art31-privacy-2026',
		title: 'Privacy as a constitutional right',
		citation: 'Constitution of Kenya, 2010, Art. 31',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 31 protects against search of person, home or property, seizure of possessions, and infringement of communications. Searches generally need lawful authority. Ask officers to identify the law and warrant, and note details without obstructing. Complain afterwards with a lawyer.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['faragha', 'polisi', 'haki']
	},
	{
		id: 'ke-const-art32-religion-2026',
		title: 'Freedom of conscience and religion',
		citation: 'Constitution of Kenya, 2010, Art. 32',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 32 protects freedom of conscience, religion, belief and opinion. No one may be compelled to act against belief except as law reasonably requires. Schools and employers should accommodate belief within reason. Put accommodation requests in writing.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['dini', 'imani', 'haki']
	},
	{
		id: 'ke-const-art33-expression-2026',
		title: 'Freedom of expression and its limits',
		citation: 'Constitution of Kenya, 2010, Art. 33',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 33 protects expression, media freedom, and academic freedom but excludes propaganda for war, incitement to violence, hate speech, and advocacy of hatred. Online posts can attract criminal complaints. Preserve links and timestamps and seek advice before responding publicly.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['maoni', 'haki', 'mtandaoni']
	},
	{
		id: 'ke-const-art34-media-2026',
		title: 'Freedom of the media',
		citation: 'Constitution of Kenya, 2010, Art. 34',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 34 guarantees media independence and bars State control over broadcasts or penalties for opinions. Complaints about media content go to the Media Complaints Commission. Keep broadcasts, articles, and dates when filing or answering a complaint.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['habari', 'vyombo', 'haki']
	},
	{
		id: 'ke-const-art35-information-2026',
		title: 'Right of access to information',
		citation: 'Constitution of Kenya, 2010, Art. 35; Access to Information Act, 2016',
		url: `${K}/akn/ke/act/2016/31`,
		content:
			'Article 35 and the Access to Information Act let citizens request information held by the State and relevant private bodies. Requests go in writing to the information officer with a clear description. Keep the request copy, delivery proof, and the response deadline.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2016-09-21',
		sw_keywords: ['habari', 'maombi', 'serikali']
	},
	{
		id: 'ke-const-art36-assembly-2026',
		title: 'Assembly, demonstration and picketing',
		citation: 'Constitution of Kenya, 2010, Art. 37',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 37 protects peaceful assembly, demonstration and picketing. Organisers should notify police as required by the Public Order Act and keep events peaceful and unarmed. Carry the notification copy and organisers contacts during the event.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: [' maandamano', 'mkutano', 'haki']
	},
	{
		id: 'ke-const-art38-political-2026',
		title: 'Political rights of citizens',
		citation: 'Constitution of Kenya, 2010, Art. 38',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			"Article 38 protects every citizen's right to form parties, contest elections, vote by secret ballot, and stand for office. Electoral disputes have strict timelines before the IEBC tribunal and election courts. Keep voter records, results forms, and objection receipts.",
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['kura', 'uchaguzi', 'haki']
	},
	{
		id: 'ke-const-art39-movement-2026',
		title: 'Freedom of movement and residence',
		citation: 'Constitution of Kenya, 2010, Art. 39',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 39 guarantees citizens freedom of movement, residence anywhere in Kenya, and the right to leave and return. Restrictions such as curfews must be lawful and published. Note the order relied upon and seek review if it seems unlawful.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['haki', 'safiri', 'katiba']
	},
	{
		id: 'ke-const-art40-property-2026',
		title: 'Protection of the right to property',
		citation: 'Constitution of Kenya, 2010, Art. 40',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 40 protects the right to acquire and own property, with compulsory acquisition allowed only for public purpose with prompt full compensation. Do not surrender land without a written acquisition notice. Keep title deeds, valuations, and all notices.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['ardhi', 'mali', 'haki']
	},
	{
		id: 'ke-const-art41-labour-2026',
		title: 'Labour relations as a constitutional right',
		citation: 'Constitution of Kenya, 2010, Art. 41',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 41 guarantees fair labour practices, reasonable working conditions, the right to join unions, and the right to strike subject to law. Dismissals and union disputes can go to the Employment and Labour Relations Court. Keep contracts, payslips, and dispute correspondence.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['kazi', 'mwajiri', 'haki']
	},
	{
		id: 'ke-const-art42-environment-2026',
		title: 'Right to a clean and healthy environment',
		citation: 'Constitution of Kenya, 2010, Art. 42',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 42 guarantees a clean and healthy environment. Pollution, illegal dumping, and noisy operations can be reported to NEMA and county environment officers. Keep dated photos, a diary of incidents, and report reference numbers.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['mazingira', 'uchafuzi', 'haki']
	},
	{
		id: 'ke-const-art43-second-2026',
		title: 'Economic and social rights claims',
		citation: 'Constitution of Kenya, 2010, Art. 43',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 43 covers health, housing, food, water, social security, and education. Claims proceed through petitions showing the State failure and the remedy sought. Attach prior complaints to the responsible office and their responses.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['afya', 'nyumba', 'maji']
	},
	{
		id: 'ke-const-art44-culture-2026',
		title: 'Language and cultural rights',
		citation: 'Constitution of Kenya, 2010, Art. 44',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			"Article 44 protects the right to use one's language and participate in cultural life. Cultural practices that violate rights, such as forced marriage, remain unlawful. Report harmful practices to chiefs, children officers, or police.",
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['utamaduni', 'lugha', 'haki']
	},
	{
		id: 'ke-const-art45-family-2026',
		title: 'Family as the natural unit of society',
		citation: 'Constitution of Kenya, 2010, Art. 45',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			"Article 45 recognises the family as the fundamental unit of society and gives every adult the right to marry a person of the opposite sex with free consent. Parties to a marriage enjoy equal rights during and after marriage. Register marriages to protect property and children's rights.",
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['familia', 'ndoa', 'haki']
	},
	{
		id: 'ke-const-art46-consumer-2026',
		title: 'Consumer rights in the Constitution',
		citation: 'Constitution of Kenya, 2010, Art. 46',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 46 gives consumers rights to goods of reasonable quality, information, health and safety, and compensation for loss from defective goods. This backs claims under the Consumer Protection Act. Keep receipts, warranties, and defect evidence.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['mnunuzi', 'bidhaa', 'haki']
	},
	{
		id: 'ke-const-art49-arrest-2026',
		title: 'Rights of arrested persons in detail',
		citation: 'Constitution of Kenya, 2010, Art. 49',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 49 requires an arrested person to be informed of reasons in an understandable language, allowed to contact counsel, and brought to court within 24 hours. Statements should not be forced. Memorise or note badge numbers, station, and OB entry.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['kukamatwa', 'polisi', 'mahakama']
	},
	{
		id: 'ke-const-art51-detained-2026',
		title: 'Rights of detained and imprisoned persons',
		citation: 'Constitution of Kenya, 2010, Art. 51',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Article 51 preserves the dignity of detained persons including access to family, counsel, and medical care. Complaints about treatment go to the prison authorities, IPOA where relevant, and KNCHR. Keep visit records and medical notes.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2010-08-27',
		sw_keywords: ['gereza', 'haki', 'polisi']
	},
	{
		id: 'ke-const-art59-knchr-2026',
		title: 'Kenya National Commission on Human Rights',
		citation: 'Constitution of Kenya, 2010, Art. 59; KNCHR Act',
		url: `${K}/akn/ke/act/2011/14`,
		content:
			'The KNCHR investigates human rights violations, visits detention places, and can recommend redress. Complaints are lodged in writing with facts, dates, and evidence. Keep the complaint reference and follow-up correspondence.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['haki', 'malalamiko', 'tume']
	},
	{
		id: 'ke-const-art59-caj-2026',
		title: 'Commission on Administrative Justice (Ombudsman)',
		citation: 'Constitution, Art. 59; Commission on Administrative Justice Act, 2011',
		url: `${K}/akn/ke/act/2011/23`,
		content:
			'The Ombudsman handles complaints about unfair, slow, or unresponsive public administration, such as delayed IDs, pensions, or land files. Complain first to the office, then to the Commission with reference numbers. Keep stamped copies and timelines.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['malalamiko', 'serikali', 'ofisi']
	},
	{
		id: 'ke-const-art59-gender-2026',
		title: 'National Gender and Equality Commission',
		citation: 'Constitution, Art. 59; NGEC Act, 2011',
		url: `${K}/akn/ke/act/2011/15`,
		content:
			'The NGEC addresses gender, disability, youth, and minority discrimination in public and private institutions. Complaints should state the discriminatory act, dates, and witnesses. Keep policies, letters, and meeting notes as evidence.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['jinsia', 'usawa', 'ubaguzi']
	},
	{
		id: 'ke-const-devolution-note-2026',
		title: 'Devolution and which government to approach',
		citation: 'Constitution of Kenya, 2010, Ch. 11; County Governments Act, 2012',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'National government handles matters like immigration, tax, and courts while counties handle markets, local roads, health facilities, and business permits. Directing a complaint to the wrong level causes delay. Check the function list before filing and keep the referral letter.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['kaunti', 'serikali', 'ugatuzi']
	},
	{
		id: 'ke-const-public-finance-note-2026',
		title: 'Public finance complaints and county budgets',
		citation: 'Constitution, Ch. 12; Public Finance Management Act, 2012',
		url: `${K}/akn/ke/act/2012/18`,
		content:
			'Counties must publish budgets and allow public participation before spending. Residents can request budget documents and submit memoranda during participation forums. Keep adverts, submissions, and attendance records for any challenge.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['bajeti', 'kaunti', 'pesa']
	},
	{
		id: 'ke-const-land-commission-2026',
		title: 'National Land Commission complaints',
		citation: 'Constitution, Art. 67; National Land Commission Act, 2012',
		url: `${K}/akn/ke/act/2012/5`,
		content:
			'The NLC investigates historical land injustices and monitors public land use. Complaints need the parcel details, history, and supporting documents. Keep title copies, maps, and correspondence with the lands office.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'tume', 'shamba']
	},
	{
		id: 'ke-const-iebc-complaint-2026',
		title: 'Electoral complaints to IEBC',
		citation: 'Constitution, Art. 88; Elections Act, 2011',
		url: `${K}/akn/ke/act/2011/24`,
		content:
			'Election offences and registration problems can be reported to IEBC officials and monitors with polling station details and evidence. Formal election petitions go to the designated courts within strict timelines. Keep voter slips, results photos, and report numbers.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['kura', 'uchaguzi', 'malalamiko']
	},
	{
		id: 'ke-const-src-salaries-2026',
		title: 'Salaries and Remuneration Commission queries',
		citation: 'Constitution, Art. 230; SRC Act, 2011',
		url: `${K}/akn/ke/act/2011/11`,
		content:
			'The SRC sets public officers pay and reviews allowances. Queries about public salary grading go through the employer and SRC advisories. Keep appointment letters, payslips, and grading correspondence.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['mshahara', 'serikali', 'kazi']
	},
	{
		id: 'ke-const-t SC-note-2026',
		title: 'Teachers Service Commission discipline',
		citation: 'Constitution, Art. 237; TSC Act, 2012',
		url: `${K}/akn/ke/act/2012/20`,
		content:
			'The TSC registers teachers and handles discipline and transfers. Teachers facing interdiction should respond in writing within the given time and attach evidence. Keep the show-cause letter, response, and hearing notices.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['mwalimu', 'tsc', 'kazi']
	},
	{
		id: 'ke-const-npsc-note-2026',
		title: 'Public Service Commission recruitment disputes',
		citation: 'Constitution, Art. 233; PSC Act',
		url: 'https://www.publicservice.go.ke/',
		content:
			'Public service appointments must follow fair competition and merit. Candidates alleging bias can seek internal review with the advertisement, shortlist, and scores. Keep application receipts and interview invitations.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['kazi', 'serikali', 'ajira']
	},
	{
		id: 'ke-const-jsc-note-2026',
		title: 'Judicial Service Commission complaints',
		citation: 'Constitution, Art. 171; Judicial Service Act, 2011',
		url: `${K}/akn/ke/act/2011/1`,
		content:
			'Complaints about judicial officers go to the JSC in writing with the case number, dates, and conduct complained of. Matters pending in court should still be pursued through appeal or review. Keep filings and hearing records.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['mahakama', 'jaji', 'malalamiko']
	},
	{
		id: 'ke-const-county-assembly-petition-2026',
		title: 'Petitioning a county assembly',
		citation: 'Constitution, Art. 119; County Governments Act, 2012',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Any person may petition a county assembly on matters within its authority, such as markets, health, or local roads. Petitions state facts, the relief sought, and attach evidence. Keep the filed copy with the clerk stamp.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['kaunti', 'maombi', 'serikali']
	},
	{
		id: 'ke-const ATI-request-2026',
		title: 'Filing an access-to-information request',
		citation: 'Access to Information Act, 2016',
		url: `${K}/akn/ke/act/2016/31`,
		content:
			'Write to the information access officer describing the records sought, pay any prescribed fee, and keep proof of delivery. The body must respond within the statutory period. If refused, seek review by the Commission on Administrative Justice.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2016-09-21',
		sw_keywords: ['habari', 'maombi', 'serikali']
	},
	{
		id: 'ke-const-public-order-notify-2026',
		title: 'Notifying police of a public meeting',
		citation: 'Public Order Act, Cap. 56',
		url: `${K}/akn/ke/act/1929/7`,
		content:
			'Organisers of public meetings or processions should notify the police in writing in advance with the venue, route, date, and contacts. Carry the acknowledgement on the day. If restricted, ask for written reasons and consult a lawyer.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '1929-01-01',
		sw_keywords: ['mkutano', 'maandamano', 'polisi']
	},
	{
		id: 'ke-const-fair-admin-request-2026',
		title: 'Demanding written reasons for admin action',
		citation: 'Constitution, Art. 47; Fair Administrative Action Act, 2015',
		url: `${K}/akn/ke/act/2015/4`,
		content:
			'A person affected by administrative action may demand written reasons. Make the demand in writing referencing the decision, date, and officer. The reasons reveal whether to appeal, seek review, or go to court.',
		topic: 'constitutional',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['maombi', 'serikali', 'uamuzi']
	},
	{
		id: 'ke-const-elections-registry-check-2026',
		title: 'Checking voter registration details',
		citation: 'Elections Act, 2011',
		url: `${K}/akn/ke/act/2011/24`,
		content:
			'Voters should verify registration status and polling station during the inspection period using IEBC channels. Report errors early with ID copies. Keep screenshots and correction receipts.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['kura', 'uchaguzi', 'IEBC']
	},
	{
		id: 'ke-const-double-registration-2026',
		title: 'Double allocation of market stalls',
		citation: 'County Governments Act, 2012',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Where two traders hold papers for one stall, the county allocation register and fee receipts decide priority. Report to the market office with all documents and avoid taking the space by force. Keep allocation letters and payment records.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['soko', 'kaunti', 'kibanda']
	},
	{
		id: 'ke-const-chief-complaint-2026',
		title: 'Complaining about a chief or assistant chief',
		citation: 'National Government Coordination Act, 2013',
		url: `${K}/akn/ke/act/2013/1`,
		content:
			'Misconduct by a chief, such as demanding bribes for letters, can be reported to the Deputy County Commissioner with specifics. Keep copies of the request, any payment evidence, and witness names.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['chifu', 'malalamiko', 'serikali']
	},
	{
		id: 'ke-const-huduma-complaint-2026',
		title: 'Service complaints at Huduma Centres',
		citation: 'Fair Administrative Action Act, 2015',
		url: `${K}/akn/ke/act/2015/4`,
		content:
			'Delays or demands for unofficial payment at service centres should be reported through the centre manager and the Huduma call line with the ticket number. Keep the service ticket, receipts, and names of officers seen.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['huduma', 'malalamiko', 'serikali']
	},
	{
		id: 'ke-const-birth-cert-delay-2026',
		title: 'Delayed birth certificates',
		citation: 'Births and Deaths Registration Act, Cap. 149',
		url: `${K}/akn/ke/act/1928/2`,
		content:
			'Applications for birth certificates go through civil registration with hospital notification and parent IDs. Follow up in writing with the application number where delayed. Keep notification slips and payment receipts.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '1928-01-01',
		sw_keywords: ['cheti', 'kuzaliwa', 'mtoto']
	},
	{
		id: 'ke-const-id-delay-2026',
		title: 'Delayed national ID processing',
		citation: 'Registration of Persons Act',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'First ID applications need a birth certificate, school documents, and chief introduction. Track the waiting slip and follow up at the registration office. Keep copies of all documents submitted.',
		topic: 'constitutional',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['kitambulisho', 'ID', 'serikali']
	}
];

const criminal = [
	{
		id: 'ke-crim-theft-2026',
		title: 'Theft: reporting and what police need',
		citation: 'Penal Code, Cap. 63, ss. 268-278',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Theft of phones, livestock, or household goods should be reported promptly with serial numbers, purchase receipts, and witness names. Obtain the OB number and follow up with the investigating officer. Keep the OB slip and any recovery documents.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['wizi', 'mwizi', 'nimeibiwa']
	},
	{
		id: 'ke-crim-robbery-2026',
		title: 'Robbery and violent theft',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Robbery involving force or threats is a grave offence with severe penalties. Victims should seek safety and medical care first, then report with descriptions, plate numbers, and recovered items. Do not confront armed suspects.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['wizi', ' uporaji', 'polisi']
	},
	{
		id: 'ke-crim-burglary-2026',
		title: 'Burglary and housebreaking',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Breaking into homes or shops to steal attracts burglary charges. Preserve the scene where possible, photograph forced entry, and list stolen items with values and receipts. Report the same day for OB entry.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['wizi', 'nyumba', 'polisi']
	},
	{
		id: 'ke-crim-assault-occasioning-2026',
		title: 'Assault occasioning actual bodily harm',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Fights causing injury should be reported with a P3 form for medical documentation. Get treatment first, then the police issue the P3 for the doctor to complete. Keep treatment notes, photos, and witness contacts.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['kupigwa', 'jeraha', 'polisi']
	},
	{
		id: 'ke-crim-grievous-harm-2026',
		title: 'Grievous harm and serious injury',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Serious injuries such as fractures or deep wounds are prosecuted as grievous harm with heavy penalties. Hospital records and the P3 form are central evidence. Keep admission records, X-rays, and expense receipts.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['jeraha', 'hospitali', 'polisi']
	},
	{
		id: 'ke-crim-murder-charge-2026',
		title: 'Murder and manslaughter procedure',
		citation: 'Penal Code, Cap. 63; Criminal Procedure Code',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Homicide cases begin with immediate police report, scene preservation, and post-mortem examination. Only the High Court tries murder. Families should get the OB number, post-mortem report access, and legal aid early.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['mauaji', 'polisi', 'mahakama']
	},
	{
		id: 'ke-crim-defilement-2026',
		title: 'Defilement of children: urgent steps',
		citation: 'Sexual Offences Act, 2006',
		url: `${K}/akn/ke/act/2006/3`,
		content:
			'Defilement cases need immediate medical care, preferably within 72 hours, and prompt police reporting. Do not wash away evidence before examination. The child needs counselling, a children officer referral, and legal aid. Keep medical and OB records.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2006-01-01',
		sw_keywords: ['mtoto', 'ubakaji', 'polisi']
	},
	{
		id: 'ke-crim-rape-report-2026',
		title: 'Reporting rape and adult sexual assault',
		citation: 'Sexual Offences Act, 2006',
		url: `${K}/akn/ke/act/2006/3`,
		content:
			'Survivors should reach safety, seek medical care, and report to police for P3 and statement recording. Counselling and PEP treatment have strict time windows. Keep clothes worn, messages, and witness details for investigators.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2006-01-01',
		sw_keywords: ['ubakaji', 'polisi', 'hospitali']
	},
	{
		id: 'ke-crim-gbv-orders-2026',
		title: 'Protection orders for GBV survivors',
		citation: 'Protection Against Domestic Violence Act, 2015',
		url: `${K}/akn/ke/act/2015/2`,
		content:
			'Survivors can seek court protection orders barring contact, occupation, or tenancy interference. Applications are supported by affidavit evidence and police reports. Breach of an order is itself an offence. Keep the order and breach evidence.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['unyanyasaji', 'mahakama', 'amri']
	},
	{
		id: 'ke-crim-child-neglect-2026',
		title: 'Child neglect and abandonment',
		citation: 'Children Act, 2022; Penal Code',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Failing to provide for a child or abandoning one can attract criminal and care proceedings. Report to children officers and police with birth records and evidence of neglect. Keep school, medical, and support-payment records.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'kutelekezwa', 'polisi']
	},
	{
		id: 'ke-crim-fgm-report-2026',
		title: 'FGM as a criminal offence',
		citation: 'Prohibition of Female Genital Mutilation Act, 2011',
		url: `${K}/akn/ke/act/2011/32`,
		content:
			'FGM, aiding it, or taking a girl across borders for it are offences. Suspected plans can be reported to police, chiefs, children officers, or helplines before the act. Keep any messages, plans, and witness details safely.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['mtoto', 'msichana', 'polisi']
	},
	{
		id: 'ke-crim-early-marriage-2026',
		title: 'Child marriage is prohibited',
		citation: 'Children Act, 2022; Marriage Act, 2014',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Marriage of a person under 18 is prohibited and voidable. Threatened marriages can be stopped through children officers, chiefs, and courts. Keep birth records, school records, and any ceremony plans as evidence.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'ndoa', 'polisi']
	},
	{
		id: 'ke-crim-human-trafficking-2026',
		title: 'Human trafficking indicators and reporting',
		citation: 'Counter-Trafficking in Persons Act, 2010',
		url: `${K}/akn/ke/act/2010/8`,
		content:
			'False job offers, confiscated passports, and locked accommodation signal trafficking. Victims and witnesses can report to police, the counter-trafficking secretariat, or helplines. Keep messages, contracts, travel documents, and payment records.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2010-01-01',
		sw_keywords: ['usafirishaji', 'kazi', 'polisi']
	},
	{
		id: 'ke-crim-kidnapping-2026',
		title: 'Kidnapping and abduction response',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Report missing or abducted persons immediately with photos, clothing details, last location, and phone data. Police can seek call data through proper channels. Keep the OB number and investigating officer contacts.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['kutekwa', 'mtoto', 'polisi']
	},
	{
		id: 'ke-crim-threats-2026',
		title: 'Threats to kill or harm',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Written or uttered threats of death or injury are offences. Preserve messages with timestamps, report to police, and request advice on protection. Keep screenshots, call logs, and witness names.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['tishio', 'vitisho', 'polisi']
	},
	{
		id: 'ke-crim-arson-2026',
		title: 'Arson and property destruction',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Deliberately setting fire to buildings, crops, or vehicles is arson with severe penalties. Report immediately, preserve the scene for investigators, and list destroyed property with values. Keep photos and ownership documents.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['moto', 'kuchoma', 'polisi']
	},
	{
		id: 'ke-crim-malicious-damage-2026',
		title: 'Malicious damage to property',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Damaging windows, fences, crops, or vehicles can be charged as malicious damage. Photograph the damage, get repair estimates, and report with ownership proof. Keep receipts for all repairs.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['uharibifu', 'mali', 'polisi']
	},
	{
		id: 'ke-crim-forgery-2026',
		title: 'Forgery of documents',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Making or using false title deeds, agreements, or certificates is forgery. Suspected forgeries should be reported with originals, the suspect documents, and transaction history. Keep registry search results and payment proof.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['kughushi', 'hati', 'polisi']
	},
	{
		id: 'ke-crim-false-pretences-2026',
		title: 'Obtaining by false pretences (wash-wash style fraud)',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Con tricks promising jobs, tenders, or forex in exchange for fees are obtaining by false pretences. Stop further payments, preserve chats and receipts, and report to police and DCI. Keep adverts and suspect contacts.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['tapeli', 'wash', 'polisi']
	},
	{
		id: 'ke-crim-mpesa-fraud-2026',
		title: 'M-Pesa reversal and fraud scams',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Fake reversal calls and wrong-number refunds are common fraud. Never share PINs, verify balances independently, and report with transaction codes to the provider and police. Keep SMS records and call reference numbers.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['mpesa', 'tapeli', 'nimetapeliwa']
	},
	{
		id: 'ke-crim-sim-swap-2026',
		title: 'SIM-swap fraud response',
		citation: 'Computer Misuse and Cybercrimes Act, 2018; KICA',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Sudden loss of network followed by strange withdrawals signals SIM swap. Contact the telco to freeze the line, notify banks, and report to DCI with IDs and transaction records. Keep reference numbers from every office.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['laini', 'simu', 'tapeli']
	},
	{
		id: 'ke-crim-online-fraud-2026',
		title: 'Online shopping and social media fraud',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Fake online sellers vanish after payment. Screenshot listings, seller profiles, till numbers, and chats before they disappear, then report to the platform, provider, and DCI. Keep payment confirmations.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['mtandaoni', 'tapeli', 'polisi']
	},
	{
		id: 'ke-crim-identity-theft-2026',
		title: 'Identity theft and fake IDs',
		citation: 'Computer Misuse and Cybercrimes Act, 2018; Penal Code',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			"Use of another person's ID for loans or SIM registration is identity theft. Victims should report to police and DCI, notify lenders and CRB, and dispute fraudulent accounts in writing. Keep affidavits and dispute letters.",
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['kitambulisho', 'wizi', 'polisi']
	},
	{
		id: 'ke-crim-cyber-harassment-2026',
		title: 'Cyber harassment and non-consensual images',
		citation: 'Computer Misuse and Cybercrimes Act, 2018',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Sharing intimate images without consent, cyberbullying, and threats online are offences. Preserve links with timestamps, report to the platform and police, and seek support services. Do not delete evidence.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2018-01-01',
		sw_keywords: ['mtandaoni', 'unyanyasaji', 'polisi']
	},
	{
		id: 'ke-crim-hate-speech-2026b',
		title: 'Hate speech and incitement reports',
		citation: 'National Cohesion and Integration Act, 2008',
		url: `${K}/akn/ke/act/2008/12`,
		content:
			'Ethnic contempt, incitement, and hate leaflets can be reported to police or the NCIC with recordings and witness details. Keep originals of posts, broadcasts, and rally details for investigators.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['chuki', 'matusi', 'polisi']
	},
	{
		id: 'ke-crim-drug-possession-2026',
		title: 'Drug possession and trafficking',
		citation: 'Narcotic Drugs and Psychotropic Substances Act, 1994',
		url: `${K}/akn/ke/act/1994/4`,
		content:
			'Possession and trafficking of narcotics attract severe penalties with limited bail options for trafficking. Anyone arrested should get counsel immediately and note the search and seizure details. Keep charge sheets and hearing dates.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1994-01-01',
		sw_keywords: ['madawa', 'bangi', 'polisi']
	},
	{
		id: 'ke-crim-illicit-brew-2026',
		title: 'Illicit brew and unlicensed alcohol',
		citation: 'Alcoholic Drinks Control Act, 2010',
		url: `${K}/akn/ke/act/2010/4`,
		content:
			"Manufacturing or selling chang'aa or unlicensed alcohol is an offence enforced with county officers and police. Report dens to chiefs and police rather than confronting sellers. Keep report references.",
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2010-01-01',
		sw_keywords: ['pombe', 'changaa', 'polisi']
	},
	{
		id: 'ke-crim-wildlife-2026b',
		title: 'Wildlife and charcoal offences',
		citation: 'Wildlife Conservation and Management Act, 2013; Forest Conservation Act',
		url: `${K}/akn/ke/act/2013/47`,
		content:
			'Poaching, bushmeat trade, and illegal logging or charcoal burning attract heavy fines and jail terms enforced with KWS and KFS. Report quietly with locations and vehicle details. Keep report numbers.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['wanyama', 'msitu', 'polisi']
	},
	{
		id: 'ke-crim-corruption-bribe-2026',
		title: 'Demands for bribes by officials',
		citation: 'Anti-Corruption and Economic Crimes Act, 2003; Bribery Act, 2016',
		url: `${K}/akn/ke/act/2003/3`,
		content:
			'Demands for bribes for services, licences, or release can be reported to EACC with dates, amounts, and recordings where lawfully obtained. Do not pay to speed up a right. Keep receipts and reference numbers.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2003-01-01',
		sw_keywords: ['hongo', 'rushwa', 'EACC']
	},
	{
		id: 'ke-crim-police-assault-2026',
		title: 'Assault by police: where to complain',
		citation: 'Independent Policing Oversight Authority Act, 2011',
		url: `${K}/akn/ke/act/2011/35`,
		content:
			'Excessive force, shootings, or deaths in custody can be reported to IPOA with station, date, OB details, and medical evidence. Parallel complaints may go to KNCHR. Keep medical reports, photos, and witness contacts.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['polisi', 'IPOA', 'kupigwa']
	},
	{
		id: 'ke-crim-wrongful-arrest-2026',
		title: 'Wrongful arrest and malicious prosecution',
		citation: 'Constitution, Art. 49; Penal Code',
		url: `${K}/akn/ke/act/2010/constitution`,
		content:
			'Arrests without cause or fabricated charges can ground compensation claims after acquittal. Note every detail of the arrest, bond, and trial outcome. A lawyer assesses prospects once proceedings conclude.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '2010-08-27',
		sw_keywords: ['kukamatwa', 'polisi', 'mahakama']
	},
	{
		id: 'ke-crim-bail-review-2026',
		title: 'Reviewing harsh bail or bond terms',
		citation: 'Criminal Procedure Code, Cap. 75',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Accused persons unable to meet bail can apply for review with reasons and surety details. Courts consider flight risk, offence gravity, and means. Keep the bail ruling, receipts, and review application copies.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['dhamana', 'mahakama', 'polisi']
	},
	{
		id: 'ke-crim-plea-bargain-2026',
		title: 'Plea bargaining in criminal cases',
		citation: 'Criminal Procedure Code; ODPP plea-bargain guidelines',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Accused persons may negotiate pleas with the prosecution through counsel, subject to court approval. Agreements must be voluntary and informed. Never plead without understanding the sentence. Keep the agreement and court record.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mahakama', 'kesi', 'ODPP']
	},
	{
		id: 'ke-crim-witness-protection-2026',
		title: 'Witness protection for serious crimes',
		citation: 'Witness Protection Act, 2006',
		url: `${K}/akn/ke/act/2006/16`,
		content:
			'Threatened witnesses in serious cases can seek protection through the Witness Protection Agency via police or ODPP. Report threats immediately with details. Keep threat evidence and agency references.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2006-01-01',
		sw_keywords: ['shahidi', 'polisi', 'vitisho']
	},
	{
		id: 'ke-crim-victim-impact-2026',
		title: 'Victim impact statements at sentencing',
		citation: 'Victim Protection Act, 2014',
		url: `${K}/akn/ke/act/2014/17`,
		content:
			'Victims may present impact statements on harm suffered before sentencing. Prepare the statement with medical, financial, and emotional effects. Keep expense receipts and reports to attach.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['mwathiriwa', 'mahakama', 'hukumu']
	},
	{
		id: 'ke-crim-appeal-conviction-2026',
		title: 'Appealing a criminal conviction or sentence',
		citation: 'Criminal Procedure Code, Cap. 75',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Convictions and sentences can be appealed within short statutory timelines. Get the judgment, proceedings, and charge sheet immediately and brief counsel. Keep filing receipts and bail-pending-appeal papers where applicable.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['rufaa', 'mahakama', 'hukumu']
	},
	{
		id: 'ke-crim-record-clearance-2026',
		title: 'Police clearance certificate (good conduct)',
		citation: 'National Police Service guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Good-conduct applications run through eCitizen with fingerprints at designated centres. Delays are followed up with the application reference. Keep the payment receipt and fingerprint acknowledgement.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['cheti', 'good conduct', 'polisi']
	},
	{
		id: 'ke-crim-lost-property-2026',
		title: 'Reporting lost documents and items',
		citation: 'National Police Service guidance',
		url: `${K}/akn/ke/act/2011/11a`,
		content:
			'Lost IDs, certificates, and number plates should be reported promptly for an OB entry and police abstract needed for replacement. Keep the abstract copy for the registrar or NTSA.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['kupoteza', 'cheti', 'polisi']
	},
	{
		id: 'ke-crim-stock-theft-2026',
		title: 'Stock theft and livestock movement',
		citation: 'Penal Code; livestock movement permit rules',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Stolen cattle, goats, and sheep cases need ownership marks, photos, and movement records. Report the same day and alert neighbouring markets and slaughter points. Keep branding certificates and sale records.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['ngombe', 'wizi', 'mifugo']
	},
	{
		id: 'ke-crim-phone-theft-track-2026',
		title: 'Stolen phones: IMEI and tracking',
		citation: 'Kenya Information and Communications Act, 1998',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Report phone theft with the IMEI, block the SIM with the provider, and give police the box and purchase receipt. Court orders may be needed for tracking data. Keep the OB number and provider references.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1998-01-01',
		sw_keywords: ['simu', 'wizi', 'IMEI']
	},
	{
		id: 'ke-crim-mob-justice-2026',
		title: 'Mob justice is a crime: what to do',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Beating or killing suspects is murder or assault regardless of the accusation. Witnesses should report to police and preserve photos safely. Communities should hand suspects to lawful custody.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['polisi', 'kupigwa', 'umati']
	},
	{
		id: 'ke-crim-suicide-attempt-2026',
		title: 'Attempted suicide: help not punishment',
		citation: 'Counselling and mental-health referral guidance',
		url: 'https://mental.health.go.ke/',
		content:
			'Persons in crisis need urgent care, counselling, and helpline support rather than stigma. Contact emergency services, counsellors, or helplines such as 1199 or 0800 720 640 referrals. Keep referral records for follow-up care.',
		topic: 'criminal',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['msaada', 'mauti', 'polisi']
	},
	{
		id: 'ke-crim-counterfeit-money-2026',
		title: 'Fake currency encounters',
		citation: 'Penal Code; Central Bank of Kenya Act',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Notes suspected to be counterfeit should not be re-spent. Report to police and the bank with details of who gave them. Keep the transaction records and suspect description.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['pesa', 'bandia', 'polisi']
	},
	{
		id: 'ke-crim-trespass-night-2026',
		title: 'Night trespass and prowling',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Lurking around homes at night with intent can be charged as night trespass. Report with times, descriptions, and CCTV where available. Improve lighting and locks while police investigate.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['usiku', 'nyumba', 'polisi']
	},
	{
		id: 'ke-crim-ela-2026',
		title: 'Unlicensed guns and imitation firearms',
		citation: 'Firearms Act, Cap. 114',
		url: `${K}/akn/ke/act/1954/2`,
		content:
			'Possession of firearms without a certificate, including imitation guns used in robberies, is a serious offence. Report armed sightings with descriptions and direction of movement without confronting. Keep report references.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1954-01-01',
		sw_keywords: ['bunduki', 'silaha', 'polisi']
	},
	{
		id: 'ke-crim-bodaboda-theft-2026',
		title: 'Boda boda and motorbike theft',
		citation: 'Penal Code; Traffic Act',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Report stolen motorbikes with registration, engine and chassis numbers, and tracker data where fitted. Alert stages and mechanics with photos. Keep logbook copies, sale agreements, and OB records.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['pikipiki', 'wizi', 'boda']
	},
	{
		id: 'ke-crim-shoplifting-2026',
		title: 'Shoplifting and supermarket theft',
		citation: 'Penal Code, Cap. 63',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Shop theft is prosecuted with CCTV, recovered goods, and staff testimony. Suspects should cooperate with police and seek counsel early. Keep the OB entry and charge sheet copies.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '1930-01-01',
		sw_keywords: ['duka', 'wizi', 'polisi']
	},
	{
		id: 'ke-crim-cattle-rustling-2026',
		title: 'Cattle rustling and banditry',
		citation: 'Penal Code; National Police Service operations guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Rustling and bandit attacks should be reported immediately with locations, numbers, and movement direction for security response. Communities should use peace committees and early warning. Keep OB numbers and loss lists.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['ngombe', 'wizi', 'polisi']
	},
	{
		id: 'ke-crim-child-porn-2026',
		title: 'Child sexual exploitation material',
		citation: 'Sexual Offences Act; Computer Misuse and Cybercrimes Act',
		url: `${K}/akn/ke/act/2006/3`,
		content:
			'Creating or sharing sexual images of children is a grave offence. Do not forward such material; report to police and the DCI child-protection units with links and handles. Keep report references safely.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2006-01-01',
		sw_keywords: ['mtoto', 'mtandaoni', 'polisi']
	},
	{
		id: 'ke-crim-elder-abuse-2026',
		title: 'Abuse and exploitation of older persons',
		citation: 'Social Assistance Act, 2013; Penal Code',
		url: `${K}/akn/ke/act/2013/24`,
		content:
			'Beating, neglecting, or grabbing property of older persons can be reported to chiefs, police, and social development officers. Arrange medical care and safe custody of documents. Keep medical and property records.',
		topic: 'criminal',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['wazee', 'unyanyasaji', 'polisi']
	},
	{
		id: 'ke-crim-domestic-assault-2026',
		title: 'Assault within the home: immediate steps',
		citation: 'Protection Against Domestic Violence Act, 2015; Penal Code',
		url: `${K}/akn/ke/act/2015/2`,
		content:
			'Seek safety and medical care first, then report to police for OB and P3 documentation. Protection orders can bar the abuser from the home. Keep medical records, photos, and witness details.',
		topic: 'criminal',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kupigwa', 'nyumbani', 'polisi']
	}
];

const employment = [
	{
		id: 'ke-emp-summary-dismissal-2026',
		title: 'Summary dismissal for gross misconduct',
		citation: 'Employment Act, 2007, s. 44',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Summary dismissal without notice is allowed only for gross misconduct such as theft, violence, or wilful neglect, and the employer must still hear the employee. Demand written reasons and keep the dismissal letter for challenge.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['kufutwa', 'mwajiri', 'kazi']
	},
	{
		id: 'ke-emp-notice-periods-2026',
		title: 'Notice periods under the Employment Act',
		citation: 'Employment Act, 2007, s. 35',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Notice length follows the contract or the statutory scale based on pay intervals where the contract is silent. Payment in lieu is allowed. Keep the contract, payslips, and termination notice to compute dues.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['notisi', 'mwajiri', 'kazi']
	},
	{
		id: 'ke-emp-hearing-rule-2026',
		title: 'Right to be heard before dismissal',
		citation: 'Employment Act, 2007, s. 41',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Before termination for misconduct or poor performance, the employer must explain the reasons and hear the employee with a companion present. Minutes should be recorded. Keep the invitation, minutes, and outcome letter.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['kesi', 'mwajiri', 'kufutwa']
	},
	{
		id: 'ke-emp-unfair-termination-2026',
		title: 'Challenging unfair termination',
		citation: 'Employment Act, 2007; ELRC guidance',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Dismissals without valid reason or fair procedure can be challenged at the labour office and the ELRC for reinstatement or compensation. Act within limitation periods. Keep the dismissal letter, contract, and payslips.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['kufutwa', 'mahakama', 'mwajiri']
	},
	{
		id: 'ke-emp-fixed-term-2026',
		title: 'Fixed-term contracts and renewal expectations',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Fixed-term contracts end on expiry, but repeated renewals can create expectations courts examine. Non-renewal notices should be in writing. Keep all successive contracts and renewal messages.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mkataba', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-probation-2026',
		title: 'Probation periods and confirmation',
		citation: 'Employment Act, 2007, s. 42',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Probation must be agreed in writing with a limited duration and possible extension. Unsatisfactory probation still requires notice and a hearing. Keep the probation clause, appraisals, and confirmation letter.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['majaribio', 'kazi', 'mkataba']
	},
	{
		id: 'ke-emp-casual-conversion-2026',
		title: 'Casual to term conversion rights',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Casuals working continuously may qualify for conversion to term contracts with written particulars. Track days worked, pay, and supervisors. Raise conversion in writing before disputes arise.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kibarua', 'kazi', 'mkataba']
	},
	{
		id: 'ke-emp-overtime-2026',
		title: 'Overtime pay and working hours',
		citation: 'Employment Act, 2007; Regulation of Wages Orders',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Normal hours and overtime rates follow the Act and wage orders for the sector. Keep rosters, clock records, and payslips showing hours. Claim arrears first in writing to the employer.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['mshahara', 'saa', 'kazi']
	},
	{
		id: 'ke-emp-minimum-wage-2026',
		title: 'Minimum wage orders by area and sector',
		citation: 'Labour Institutions Act, 2007; wage orders',
		url: `${K}/akn/ke/act/2007/14`,
		content:
			'Minimum wages vary by urban area and occupation under gazetted orders reviewed periodically. Confirm the current order for the county and job group. Keep payslips and the applicable order printout.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['mshahara', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-annual-leave-2026',
		title: 'Annual leave accrual and forfeiture',
		citation: 'Employment Act, 2007, s. 28',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employees accrue annual leave with pay and unused days have carry-over rules. Refused leave should be documented in writing. Keep leave applications, approvals, and balances on payslips.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['likizo', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-sick-leave-2026',
		title: 'Sick leave procedure and certificates',
		citation: 'Employment Act, 2007, s. 30',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Sick leave follows notification and medical certificates for longer absence, with full and half-pay phases. Submit certificates promptly. Keep medical notes and delivery proof.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['likizo', 'ugonjwa', 'kazi']
	},
	{
		id: 'ke-emp-maternity-2026',
		title: 'Maternity leave and protection',
		citation: 'Employment Act, 2007, s. 29',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Female employees qualify for maternity leave with pay subject to service conditions, and dismissal on pregnancy grounds is prohibited. Notify in writing with expected dates. Keep antenatal records and the leave approval.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['uzazi', 'likizo', 'mama']
	},
	{
		id: 'ke-emp-paternity-2026',
		title: 'Paternity leave for fathers',
		citation: 'Employment Act, 2007, s. 29',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Male employees are entitled to paternity leave with pay on the birth of a child. Apply in writing with the expected date and birth notification. Keep the approval and birth records.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['baba', 'likizo', 'mtoto']
	},
	{
		id: 'ke-emp-redundancy-pay-2026',
		title: 'Redundancy notice and severance',
		citation: 'Employment Act, 2007, s. 40',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Redundancies require advance notice to the employee, union, and labour office plus severance computation. Selection criteria must be fair. Keep the redundancy notice, selection records, and payment schedule.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['kazi', 'mwajiri', 'kufutwa']
	},
	{
		id: 'ke-emp-service-pay-2026',
		title: 'Service pay on termination',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employees without pension or gratuity coverage may qualify for service pay for completed years. Compute from the contract and payslips. Keep NSSF statements and gratuity records to prove eligibility.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['malipo', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-cert-service-2026',
		title: 'Certificate of service on exit',
		citation: 'Employment Act, 2007, s. 51',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Every employee is entitled to a certificate of service stating the role and duration on termination. Request it in writing if withheld. Keep the certificate for future job applications.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['cheti', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-final-dues-2026',
		title: 'Computing terminal dues',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Final dues combine notice pay, accrued leave, prorated salary, and contractual benefits less lawful deductions. Ask for an itemised statement. Keep payslips and the clearance form.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['malipo', 'kazi', 'mshahara']
	},
	{
		id: 'ke-emp-paye-certs-2026',
		title: 'P9 forms and tax on exit',
		citation: 'Income Tax Act, Cap. 470',
		url: `${K}/akn/ke/act/1973/16`,
		content:
			'Employers issue P9 forms summarising annual pay and tax for returns and new-employer onboarding. Request the P9 and final payslip on exit. Keep KRA returns and iTax records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '1973-01-01',
		sw_keywords: ['ushuru', 'KRA', 'mshahara']
	},
	{
		id: 'ke-emp-nssf-remit-2026',
		title: 'Checking NSSF remittance as an employee',
		citation: 'NSSF Act, 2013',
		url: `${K}/akn/ke/act/2013/45`,
		content:
			'Employees can verify NSSF contributions through statements and the fund channels. Report missing remittances first to the employer, then the fund. Keep payslips and fund statements.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['NSSF', 'mshahara', 'kazi']
	},
	{
		id: 'ke-emp-shif-remit-2026',
		title: 'Checking SHIF remittance as an employee',
		citation: 'Social Health Insurance Act, 2023',
		url: `${K}/akn/ke/act/2023/16`,
		content:
			'Employees should confirm SHIF registration and monthly remittance to keep cover active for dependants. Raise gaps with HR, then the fund. Keep registration details and remittance confirmations.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2023-01-01',
		sw_keywords: ['SHIF', 'bima', 'afya']
	},
	{
		id: 'ke-emp-harass-report-2026',
		title: 'Reporting sexual harassment at work',
		citation: 'Employment Act, 2007, s. 6',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employers must have harassment policies and act on complaints. Report in writing to HR or management with dates, messages, and witnesses. Escalate to the labour office or ELRC if ignored.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['unyanyasaji', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-discrimination-2026b',
		title: 'Challenging hiring or promotion bias',
		citation: 'Employment Act, 2007; Constitution, Art. 27',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Bias in hiring, pay, or promotion on protected grounds is prohibited. Keep adverts, shortlists, appraisals, and decision letters. Seek internal review, then labour office advice.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['ubaguzi', 'kazi', 'ajira']
	},
	{
		id: 'ke-emp-injury-report-2026',
		title: 'Reporting workplace injury the same day',
		citation: 'Work Injury Benefits Act, 2007',
		url: `${K}/akn/ke/act/2007/13`,
		content:
			'Report injuries to the supervisor immediately, seek treatment, and ensure the employer files with DOSH. Keep treatment notes, incident reports, and witness names for compensation.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['jeraha', 'kazi', 'hospitali']
	},
	{
		id: 'ke-emp-wiba-claim-2026',
		title: 'Work injury compensation claims',
		citation: 'Work Injury Benefits Act, 2007',
		url: `${K}/akn/ke/act/2007/13`,
		content:
			'Compensation covers medical costs and assessed disability following reported workplace injuries. File with medical reports and employer records. Keep DOSH reports and payment decisions.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['fidia', 'jeraha', 'kazi']
	},
	{
		id: 'ke-emp-safety-committee-2026',
		title: 'Workplace safety committees',
		citation: 'Occupational Safety and Health Act, 2007',
		url: `${K}/akn/ke/act/2007/15`,
		content:
			'Larger workplaces must have safety committees and risk assessments. Workers can raise hazards in writing to the committee and DOSH. Keep complaint copies and inspection notes.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['usalama', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-domestic-workers-2026',
		title: 'Rights of domestic workers',
		citation: 'Employment Act, 2007; wage orders',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Domestic workers are employees entitled to contracts, minimum pay, rest, leave, and NSSF/SHIF remittance. Put terms in writing with off days and duties. Keep payment records and communications.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mfanyakazi', 'nyumbani', 'mshahara']
	},
	{
		id: 'ke-emp-security-guards-2026',
		title: 'Private security guards: hours and pay',
		citation: 'Employment Act; Private Security Regulation Act, 2016',
		url: `${K}/akn/ke/act/2016/13`,
		content:
			'Guards face long shifts that must still respect hours, overtime, and rest rules, with licensed employers. Keep duty rosters, payslips, and licence details when raising underpayment.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['askari', 'ulinzi', 'mshahara']
	},
	{
		id: 'ke-emp-construction-2026',
		title: 'Construction site workers: safety and pay',
		citation: 'Employment Act; OSHA 2007',
		url: `${K}/akn/ke/act/2007/15`,
		content:
			'Site workers need protective gear, site induction, and documented pay for days worked. Report unsafe sites to DOSH with photos. Keep day-work records and payment messages.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2007-01-01',
		sw_keywords: ['ujenzi', 'kazi', 'mshahara']
	},
	{
		id: 'ke-emp-teachers-bom-2026',
		title: 'Board of management teachers contracts',
		citation: 'Employment Act, 2007; TSC guidance',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'BOM teachers should hold written contracts stating pay, subjects, and term. Unpaid arrears are claimed first in writing to the board. Keep contracts, timetables, and payment records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mwalimu', 'shule', 'mshahara']
	},
	{
		id: 'ke-emp-interns-2026',
		title: 'Interns and attachés: stipends and terms',
		citation: 'Employment Act, 2007; PSC internship guidance',
		url: 'https://www.publicservice.go.ke/',
		content:
			'Internships should have written terms on duration, stipend, supervision, and certificates. Unclear terms are clarified before reporting. Keep the offer letter, reports, and stipend records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['interni', 'kazi', 'mafunzo']
	},
	{
		id: 'ke-emp-secondment-2026',
		title: 'Secondment and transfer of employees',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Secondments should be documented with the host, duration, reporting, and who pays. Refusals of transfer depend on contract mobility clauses. Keep the secondment letter and pay records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kazi', 'mwajiri', 'uhamisho']
	},
	{
		id: 'ke-emp-noncompete-2026',
		title: 'Non-compete and confidentiality clauses',
		citation: 'Law of Contract Act; Employment Act',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Restraint clauses must be reasonable in scope and duration to be enforceable. Get advice before signing or breaching. Keep the signed contract and any breach allegations.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['mkataba', 'kazi', 'siri']
	},
	{
		id: 'ke-emp-abscond-2026',
		title: 'Absconding and desertion allegations',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employers alleging desertion must still follow notice and hearing steps and compute dues. Employees delayed by emergency should communicate in writing. Keep messages and medical or incident proof.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kazi', 'mwajiri', 'kutoroka']
	},
	{
		id: 'ke-emp-resignation-2026',
		title: 'Resigning properly and notice',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Resign in writing with the contractual notice and handover. The employer must settle dues and issue a certificate of service. Keep the resignation acceptance and clearance records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kazi', 'kujiuzulu', 'mwajiri']
	},
	{
		id: 'ke-emp-retirement-2026',
		title: 'Retirement age and pension processing',
		citation: 'Employment Act; Retirement Benefits Act, 1997',
		url: `${K}/akn/ke/act/1997/3`,
		content:
			'Retirement follows the contract or scheme rules with notice and benefits processing. Start pension paperwork early with IDs and service records. Keep benefit statements and correspondence.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '1997-01-01',
		sw_keywords: ['kustaafu', 'pensheni', 'kazi']
	},
	{
		id: 'ke-emp-union-join-2026',
		title: 'Joining a trade union',
		citation: 'Labour Relations Act, 2007',
		url: `${K}/akn/ke/act/2007/14`,
		content:
			'Employees may join registered unions of their choice with check-off deductions on written authority. Victimisation for union activity is prohibited. Keep membership cards and deduction records.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['chama', ' wafanyakazi', 'haki']
	},
	{
		id: 'ke-emp-cba-2026',
		title: 'Collective bargaining agreements',
		citation: 'Labour Relations Act, 2007',
		url: `${K}/akn/ke/act/2007/14`,
		content:
			'Registered CBAs set binding terms on pay and conditions for covered employees. Request a copy from the union or HR when disputing dues. Keep the CBA extract and payslips.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['mkataba', ' wafanyakazi', 'mshahara']
	},
	{
		id: 'ke-emp-strike-rule-2026',
		title: 'Protected strikes and lock-outs',
		citation: 'Labour Relations Act, 2007',
		url: `${K}/akn/ke/act/2007/14`,
		content:
			'Strikes in essential services and without statutory notice lose protection. Unions must follow dispute and ballot steps. Keep strike notices and conciliator correspondence.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['mgomo', 'kazi', 'chama']
	},
	{
		id: 'ke-emp-labour-office-2026b',
		title: 'Filing at the county labour office',
		citation: 'Labour Relations Act; ELRC guidance',
		url: `${K}/akn/ke/act/2007/14`,
		content:
			'Complaints are lodged with contracts, payslips, and a dated statement. Officers attempt conciliation before referral. Keep the complaint number and conciliation notes.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2007-01-01',
		sw_keywords: ['ofisi', 'kazi', 'malalamiko']
	},
	{
		id: 'ke-emp-elrc-memo-2026',
		title: 'Filing a memorandum of claim at ELRC',
		citation: 'ELRC Procedure Rules',
		url: `${K}/akn/ke/act/2011/20`,
		content:
			'ELRC claims attach the contract, termination letter, demand history, and computation of dues. File within limitation periods. Keep filed pleadings and service proof.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['mahakama', 'kazi', 'kesi']
	},
	{
		id: 'ke-emp-foreign-worker-2026',
		title: 'Work permits for foreign employees',
		citation: 'Kenya Citizenship and Immigration Act, 2011',
		url: `${K}/akn/ke/act/2011/12`,
		content:
			'Foreign workers need the correct permit class applied before reporting, with employer sponsorship. Verify validity rather than holding originals. Keep permit copies and receipts.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['kibali', 'kazi', 'mgeni']
	},
	{
		id: 'ke-emp-volunteers-2026',
		title: 'Volunteers and stipend disputes',
		citation: 'Employment Act guidance',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Volunteer terms should be written with hours, stipend, and duration to avoid later employment claims. Disputes turn on control and pay evidence. Keep the volunteer agreement and records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kujitolea', 'kazi', 'malipo']
	},
	{
		id: 'ke-emp-jua-kali-2026',
		title: 'Jua kali artisan engagements',
		citation: 'MSE Act, 2012; Employment Act',
		url: `${K}/akn/ke/act/2012/55`,
		content:
			'Fundis and workshop hands should agree scope, price, timelines, and materials in writing. Payment disputes rely on messages and delivery proof. Keep quotations and M-Pesa records.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['fundi', 'kazi', 'malipo']
	},
	{
		id: 'ke-emp-rider-contracts-2026',
		title: 'Delivery rider and driver engagements',
		citation: 'Employment Act; Traffic Act',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Rider terms should state pay model, fuel, maintenance, and accident cover. Classify correctly as employee or contractor from the facts. Keep trip records and payment statements.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['dereva', 'boda', 'kazi']
	},
	{
		id: 'ke-emp-househelp-nhif-2026',
		title: 'Househelp SHIF and NSSF registration',
		citation: 'Social Health Insurance Act, 2023; NSSF Act, 2013',
		url: `${K}/akn/ke/act/2023/16`,
		content:
			'Employers of domestic workers should register and remit SHIF and NSSF with monthly records. Confirm active cover for hospital visits. Keep registration and remittance receipts.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2023-01-01',
		sw_keywords: ['mfanyakazi', 'bima', 'afya']
	},
	{
		id: 'ke-emp-warning-letters-2026',
		title: 'Answering show-cause and warning letters',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Respond to show-cause letters factually within the deadline, attaching supporting evidence and witnesses. Keep copies of the letter, response, and delivery proof for the hearing.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['barua', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-pip-2026',
		title: 'Performance improvement plans',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'PIPs should set measurable targets, support, and review dates. Challenge vague or shifting goals in writing. Keep appraisals, targets, and review minutes.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kazi', 'utendaji', 'mwajiri']
	},
	{
		id: 'ke-emp-transfer-2026b',
		title: 'Transfer to another branch or town',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Transfers depend on mobility clauses and must be communicated with timelines and allowances. Object in writing where hardship or contract breach arises. Keep the transfer letter and contract.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['uhamisho', 'kazi', 'mwajiri']
	},
	{
		id: 'ke-emp-salary-delay-2026',
		title: 'Delayed salaries: steps to take',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Demand arrears in writing with months owed and amounts, then escalate to the labour office with payslips and bank statements. Keep the demand letter and delivery proof.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mshahara', 'kuchelewa', 'mwajiri']
	},
	{
		id: 'ke-emp-payslip-right-2026b',
		title: 'Itemised payslips every pay day',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employees are entitled to written pay statements showing gross, deductions, and net. Missing payslips weaken loan and dispute claims. Request them monthly and archive copies.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['mshahara', 'slipu', 'kazi']
	},
	{
		id: 'ke-emp-ahl-rate-2026',
		title: 'Affordable Housing Levy on payslips',
		citation: 'Affordable Housing Act, 2024',
		url: `${K}/akn/ke/act/2024/2`,
		content:
			'Check that the housing levy on the payslip matches official KRA computation and appears in remittance records. Raise mismatches with payroll in writing. Keep payslips and KRA statements.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2024-01-01',
		sw_keywords: ['nyumba', 'ushuru', 'mshahara']
	},
	{
		id: 'ke-emp-maternity-dismiss-2026',
		title: 'Dismissal during pregnancy or leave',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Termination connected to pregnancy or maternity leave is prohibited and actionable. Keep antenatal records, leave approvals, and the dismissal letter for the labour office or ELRC.',
		topic: 'employment',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['mimba', 'mama', 'kufutwa']
	},
	{
		id: 'ke-emp-breastfeeding-2026',
		title: 'Nursing breaks after maternity',
		citation: 'Health Act guidance; Employment Act',
		url: `${K}/akn/ke/act/2017/21`,
		content:
			'Nursing mothers are entitled to reasonable breaks for breastfeeding on return to work. Agree scheduling in writing with the supervisor. Keep the agreement and any refusal notes.',
		topic: 'employment',
		source_type: 'guidance',
		effective_date: '2017-01-01',
		sw_keywords: ['mama', 'mtoto', 'kazi']
	}
];

const family = [
	{
		id: 'ke-fam-marriage-types-2026',
		title: 'The five systems of marriage',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Kenya recognises civil, customary, Christian, Hindu, and Islamic marriages, each with its own celebration and registration rules. Unregistered unions are hard to prove in succession and property disputes. Keep the certificate and ceremony records.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'harusi', 'familia']
	},
	{
		id: 'ke-fam-civil-marriage-2026',
		title: 'Civil marriage before the Registrar',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Civil marriages require notice to the Registrar, witnesses, and issuance of a certificate. Book early and carry IDs and passport photos. Keep the notice receipt and certificate.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'harusi', 'cheti']
	},
	{
		id: 'ke-fam-customary-2026b',
		title: 'Proving a customary marriage',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Customary unions need evidence of rites under the community customs plus registration. Elders testimony, dowry records, and ceremony photos help. Register promptly to protect spouses and children.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'mila', 'mahari']
	},
	{
		id: 'ke-fam-christian-marriage-2026',
		title: 'Christian marriage registration',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Church weddings must be conducted by licensed ministers with a marriage book return to the Registrar. Confirm the church licence and return before celebrating. Keep the church certificate and civil certificate.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'kanisa', 'harusi']
	},
	{
		id: 'ke-fam-hindu-marriage-2026',
		title: 'Hindu marriage requirements',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Hindu marriages follow Hindu rites with registration under the Act. Keep ceremony evidence and registration for property and travel purposes.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'harusi', 'dini']
	},
	{
		id: 'ke-fam-islamic-2026b',
		title: 'Islamic marriage and Kadhi registration',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Islamic marriages are celebrated under Islamic rites and registered with a Kadhi or licensed Imam. The mahr terms should be recorded. Keep the Kadhi certificate and IDs.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'muislamu', 'kadhi']
	},
	{
		id: 'ke-fam-polygamy-2026',
		title: 'Polygamous and potentially polygamous marriages',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Customary and Islamic marriages may be polygamous while civil, Christian, and Hindu marriages are monogamous. Converting between systems has consent rules. Keep certificates for each union.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['ndoa', 'wake', 'familia']
	},
	{
		id: 'ke-fam-dowry-2026',
		title: 'Dowry and bride price records',
		citation: 'Marriage Act, 2014; customary law guidance',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Dowry payments evidence customary marriage negotiations and family consent. Record amounts, dates, witnesses, and outstanding balances. Keep payment notes and elder confirmations.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['mahari', 'ndoa', 'mila']
	},
	{
		id: 'ke-fam-cohabitation-2026',
		title: 'Cohabitation without marriage (come-we-stay)',
		citation: 'Marriage Act, 2014; case-law guidance',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Long cohabitation alone does not automatically equal marriage; presumption depends on conduct such as reputation and children. Protect property with written agreements and joint records. Keep shared bills and contribution proof.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['kuishi', 'ndoa', 'familia']
	},
	{
		id: 'ke-fam-separation-2026b',
		title: 'Separation agreements before divorce',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Couples may separate by written agreement covering residence, children, maintenance, and property while deciding next steps. Have it witnessed and keep copies. Unsafe situations should prioritise protection orders.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['talaka', 'kutengana', 'ndoa']
	},
	{
		id: 'ke-fam-divorce-grounds-2026',
		title: 'Grounds for divorce by marriage type',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Divorce grounds differ: adultery, cruelty, desertion, and irretrievable breakdown apply depending on the marriage system. Petitions need the certificate and evidence. A lawyer confirms the applicable ground.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['talaka', 'ndoa', 'mahakama']
	},
	{
		id: 'ke-fam-divorce-file-2026',
		title: 'Filing a divorce petition',
		citation: 'Marriage Act, 2014; court procedure',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Divorce petitions attach the marriage certificate, birth certificates of children, property lists, and the reasons with evidence. Service on the spouse follows court rules. Keep filed copies and service affidavits.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['talaka', 'mahakama', 'ndoa']
	},
	{
		id: 'ke-fam-custody-best-2026',
		title: 'Best interests of the child in custody',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			"Courts decide custody on safety, care, schooling, health, and the child's views according to age. Interim orders protect schooling during disputes. Keep school, medical, and prior order records.",
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'malezi', 'mahakama']
	},
	{
		id: 'ke-fam-access-2026',
		title: 'Parental access and visitation schedules',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Access orders set pickup times, holidays, communication, and handover points. Breaches are enforced back in court. Keep a dated diary of compliance and messages.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'kutembelewa', 'malezi']
	},
	{
		id: 'ke-fam-maintenance-calc-2026',
		title: 'How child maintenance is assessed',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			"Courts weigh each parent's means against school fees, rent share, food, medical, and transport. Prepare budgets with receipts. Keep fee structures, receipts, and income evidence.",
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['matunzo', 'mtoto', 'pesa']
	},
	{
		id: 'ke-fam-maintenance-vary-2026',
		title: 'Varying maintenance when income changes',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Job loss or new needs justify variation applications with fresh income and expense proof. Do not stop paying unilaterally. Keep the original order and new evidence.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['matunzo', 'mtoto', 'mahakama']
	},
	{
		id: 'ke-fam-paternity-2026b',
		title: 'Disputed paternity and DNA tests',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Courts can order DNA testing where paternity is disputed for maintenance or custody. Testing follows chain-of-custody at accredited labs. Keep court orders and lab receipts.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['baba', 'mtoto', 'damu']
	},
	{
		id: 'ke-fam-birth-reg-2026',
		title: 'Birth registration and certificates',
		citation: 'Births and Deaths Registration Act, Cap. 149',
		url: `${K}/akn/ke/act/1928/2`,
		content:
			'Register births early with hospital notification and parent IDs for school, travel, and inheritance. Late registration needs additional affidavits. Keep notification slips and receipts.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '1928-01-01',
		sw_keywords: ['cheti', 'mtoto', 'kuzaliwa']
	},
	{
		id: 'ke-fam-name-change-2026',
		title: "Changing a child's name",
		citation: 'Registration of Documents; civil registration guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Name changes run through deed poll and gazette processes with parental consent and birth record updates. Both parents should consent in writing. Keep the deed, gazette notice, and new records.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['jina', 'mtoto', 'cheti']
	},
	{
		id: 'ke-fam-guardianship-2026b',
		title: 'Appointing a guardian for minors',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Parents travelling or unwell can formalise guardianship through written consent and court orders for school and medical decisions. Informal handover confers no legal authority. Keep consent letters and court orders.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'mlezi', 'mahakama']
	},
	{
		id: 'ke-fam-foster-2026',
		title: 'Foster care placement',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Foster placement runs through children officers and approved families with assessments and supervision. Foster parents receive support and monitoring visits. Keep placement records and officer contacts.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'malezi', 'mlezi']
	},
	{
		id: 'ke-fam-adoption-agency-2026',
		title: 'Adoption through accredited agencies',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Adoption requires agency assessment, home study, consents, and a court order with amended birth records. Private payment for children is prohibited. Keep agency records and the adoption order.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'kuasili', 'mahakama']
	},
	{
		id: 'ke-fam-charitable-home-2026',
		title: 'Placing a child in a charitable home',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Placements go through children officers to registered institutions with case reviews. Families should stay in contact and attend reviews. Keep placement letters and review notes.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'nyumbani', 'malezi']
	},
	{
		id: 'ke-fam-school-exclusion-2026',
		title: 'Challenging school exclusion or expulsion',
		citation: 'Basic Education Act, 2013',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Exclusions must follow disciplinary procedure with parental hearing. Appeal to the board and county education office with records. Keep suspension letters, hearing minutes, and fee receipts.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'mtoto', 'kufukuzwa']
	},
	{
		id: 'ke-fam-fees-dispute-2026',
		title: 'Disputing unlawful school levies',
		citation: 'Basic Education Act, 2013',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Public schools may not impose levies outside approved charges. Raise the fee structure with the head teacher and board, then county education officers. Keep fee structures and payment receipts.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'ada', 'mtoto']
	},
	{
		id: 'ke-fam-caning-2026',
		title: 'Corporal punishment complaints',
		citation: 'Basic Education Act, 2013; Children Act, 2022',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Caning and degrading punishment in schools are prohibited. Report with medical evidence to the head, TSC, and children officers. Keep treatment notes and witness names.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'mtoto', 'kupigwa']
	},
	{
		id: 'ke-fam-bullying-2026',
		title: 'School bullying reports',
		citation: 'Basic Education Act, 2013; school safety guidance',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Report bullying in writing to class teacher and head with dates, messages, and injuries. Escalate to the board and TSC where ignored. Keep medical notes and correspondence.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'mtoto', 'uonevu']
	},
	{
		id: 'ke-fam-child-labour-2026',
		title: 'Child labour prohibitions',
		citation: 'Employment Act, 2007; Children Act, 2022',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employment of children below the legal minimum age and hazardous work for minors are prohibited. Report to labour officers and children officers with details. Keep birth records and work evidence.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['mtoto', 'kazi', 'ajira']
	},
	{
		id: 'ke-fam-teen-pregnancy-2026',
		title: 'Teen pregnancy: school re-entry',
		citation: 'Basic Education Act; school re-entry guidelines',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Pregnant learners and young mothers have the right to continue schooling with re-entry support. Engage the head teacher and guidance office early. Keep antenatal and re-admission records.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['msichana', 'mimba', 'shule']
	},
	{
		id: 'ke-fam-matrimonial-home-2026',
		title: 'Protecting the matrimonial home',
		citation: 'Matrimonial Property Act, 2013',
		url: `${K}/akn/ke/act/2013/49`,
		content:
			"Neither spouse should sell or charge the matrimonial home without the other's consent during marriage. Caveats and court orders can block disposal. Keep title copies and consent records.",
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['nyumba', 'ndoa', 'mali']
	},
	{
		id: 'ke-fam-property-division-2026',
		title: 'Dividing matrimonial property',
		citation: 'Matrimonial Property Act, 2013',
		url: `${K}/akn/ke/act/2013/49`,
		content:
			'Division follows proven monetary and non-monetary contribution, not automatic halves. Gather title deeds, loan statements, and domestic-contribution evidence. Keep receipts for improvements.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['mali', 'talaka', 'ndoa']
	},
	{
		id: 'ke-fam-spousal-maintenance-2026',
		title: 'Spousal maintenance after separation',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Courts may order interim support considering needs and means during divorce. Prepare budgets and income proof. Keep the application, order, and payment records.',
		topic: 'family',
		source_type: 'legislation',
		effective_date: '2014-01-01',
		sw_keywords: ['matunzo', 'ndoa', 'talaka']
	},
	{
		id: 'ke-fam-widow-rights-2026',
		title: 'Rights of widows and widowers',
		citation: 'Law of Succession Act; Marriage Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Surviving spouses have inheritance and matrimonial property rights that relatives must respect. Eviction from the matrimonial home is unlawful without court process. Keep marriage and death certificates.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mjane', 'urithi', 'ndoa']
	},
	{
		id: 'ke-fam-kadhi-maintenance-2026',
		title: 'Maintenance in Kadhi courts',
		citation: 'Kadhi Courts Act; Marriage Act',
		url: `${K}/akn/ke/act/1967/14`,
		content:
			'Muslim spouses may seek maintenance and custody orders in Kadhi courts applying Islamic law within constitutional limits. Keep marriage records, birth certificates, and expense proof.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1967-01-01',
		sw_keywords: ['kadhi', 'matunzo', 'ndoa']
	},
	{
		id: 'ke-fam-gbv-safety-plan-2026',
		title: 'Safety planning for domestic abuse',
		citation: 'Protection Against Domestic Violence Act, 2015',
		url: `${K}/akn/ke/act/2015/2`,
		content:
			'Plan exit routes, emergency contacts, packed documents, and safe shelter options before leaving. Helplines and rescue centres assist with relocation. Keep copies of IDs and orders with a trusted person.',
		topic: 'family',
		source_type: 'ngo',
		effective_date: '2015-01-01',
		sw_keywords: ['usalama', 'unyanyasaji', 'msaada']
	},
	{
		id: 'ke-fam-helplines-2026',
		title: 'GBV helplines and rescue contacts',
		citation: 'State Department for Gender; legal aid guidance',
		url: `${K}/akn/ke/act/2006/3`,
		content:
			'National helplines, police gender desks, hospitals, and legal aid clinics form the referral chain for survivors. Call first where in danger, then document. Keep helpline reference numbers and referral slips.',
		topic: 'family',
		source_type: 'ngo',
		effective_date: '2022-01-01',
		sw_keywords: ['msaada', 'simu', 'unyanyasaji']
	},
	{
		id: 'ke-fam-chief-custody-2026',
		title: 'Resolving custody through elders first',
		citation: 'Traditional dispute resolution; Children Act',
		url: `${K}/akn/ke/act/2013/1`,
		content:
			'Minor custody disagreements can start with chiefs or elders for faster agreement, recorded in writing with witnesses. Serious or violent cases go straight to children officers and courts.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['chifu', 'wazee', 'mtoto']
	},
	{
		id: 'ke-fam-travel-consent-2026',
		title: 'Travel consent for minors',
		citation: 'Children Act, 2022; immigration guidance',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			"Travel with minors, especially abroad, needs birth certificates and the other parent's written consent or court order. Airlines and immigration check these. Keep consent letters and court orders.",
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'safiri', 'ruhusa']
	},
	{
		id: 'ke-fam-passport-minor-2026',
		title: 'Passport for a minor',
		citation: 'Kenya Citizenship and Immigration Act, 2011',
		url: `${K}/akn/ke/act/2011/12`,
		content:
			'Minor passports need birth certificates, parental IDs, and consent of both parents or court order. Apply through eCitizen with an appointment. Keep application references and receipts.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['pasipoti', 'mtoto', 'safiri']
	},
	{
		id: 'ke-fam-school-transfer-2026',
		title: 'Transferring schools mid-year',
		citation: 'Basic Education Act, 2013',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Mid-year transfers need clearance, assessment records, and NEMIS updates between schools. Request transfer letters early. Keep report forms and clearance slips.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'mtoto', 'uhamisho']
	},
	{
		id: 'ke-fam-disability-child-2026',
		title: 'Support for children with disabilities',
		citation: 'Persons with Disabilities Act, 2003; Children Act',
		url: `${K}/akn/ke/act/2003/14`,
		content:
			'Children with disabilities are entitled to assessment, reasonable accommodation in school, and registration with the National Council. Keep assessment reports and registration cards for programme access.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2003-01-01',
		sw_keywords: ['mtoto', 'ulemavu', 'shule']
	},
	{
		id: 'ke-fam-inheritance-minor-2026',
		title: "Protecting a minor's inheritance",
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Shares for minors are held in trust with court supervision and cannot be sold casually by guardians. Insist on court approval for any dealings. Keep succession orders and trust records.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mtoto', 'urithi', 'mahakama']
	},
	{
		id: 'ke-fam-neglect-report-2026',
		title: 'Reporting child neglect by a parent',
		citation: 'Children Act, 2022',
		url: `${K}/akn/ke/act/2022/29`,
		content:
			'Report sustained neglect to children officers and chiefs with feeding, school, and medical evidence. Officers assess and may place the child safely. Keep dated notes and witness details.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mtoto', 'kutelekezwa', 'ripoti']
	},
	{
		id: 'ke-fam-angle-divorce-costs-2026',
		title: 'Costs of divorce proceedings',
		citation: 'Marriage Act; court fees guidance',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Divorce involves filing fees, service costs, and possible advocate fees with fee waivers for qualifying persons. Budget for each stage and ask about legal aid. Keep all payment receipts.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['talaka', 'gharama', 'mahakama']
	},
	{
		id: 'ke-fam-mediation-divorce-2026',
		title: 'Mediation before contested divorce',
		citation: 'Constitution, Art. 159; court-annexed mediation',
		url: `${K}/akn/ke/act/1995/4`,
		content:
			'Courts encourage mediation on custody, maintenance, and property to save time and cost. Settlements are recorded as consent orders. Keep mediation referrals and agreements.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1995-01-01',
		sw_keywords: ['patanisho', 'talaka', 'mahakama']
	},
	{
		id: 'ke-fam-will-couples-2026',
		title: 'Wills for married couples with children',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Spouses with children should each make wills naming guardians and trustees for minors. Store originals safely and tell executors. Keep copies with the marriage certificate.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'ndoa', 'mtoto']
	},
	{
		id: 'ke-fam-surname-marriage-2026',
		title: 'Surname change after marriage',
		citation: 'Civil registration guidance',
		url: 'https://www.ecitizen.go.ke/',
		content:
			'Name use after marriage follows ID updates with the marriage certificate through civil registration. Update KRA, bank, and employer records consistently. Keep the certificate and update receipts.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['jina', 'ndoa', 'kitambulisho']
	},
	{
		id: 'ke-fam-customary-divorce-2026',
		title: 'Ending a customary marriage',
		citation: 'Marriage Act, 2014',
		url: `${K}/akn/ke/act/2014/4`,
		content:
			'Customary divorce follows the community customs plus formal registration of the dissolution. Return of dowry follows custom and agreement. Record the elders decision in writing.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '2014-01-01',
		sw_keywords: ['talaka', 'mila', 'ndoa']
	},
	{
		id: 'ke-fam-death-cert-spouse-2026',
		title: 'Death certificate for a spouse',
		citation: 'Births and Deaths Registration Act, Cap. 149',
		url: `${K}/akn/ke/act/1928/2`,
		content:
			'Surviving spouses obtain death certificates with burial permits, IDs, and chief letters for succession and benefits. Apply promptly to unlock claims. Keep multiple certified copies.',
		topic: 'family',
		source_type: 'guidance',
		effective_date: '1928-01-01',
		sw_keywords: ['cheti', 'kifo', 'ndoa']
	}
];

for (const [t, items] of [
	['constitutional', constitutional],
	['criminal', criminal],
	['employment', employment],
	['family', family]
]) {
	const cur = load(t);
	const ids = new Set(cur.map((x) => x.id));
	const fresh = items.filter((x) => !ids.has(x.id));
	save(t, [...cur, ...fresh]);
	console.log(`added ${fresh.length} to ${t}`);
}
