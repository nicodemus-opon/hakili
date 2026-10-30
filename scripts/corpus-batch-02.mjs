// Bulk batch 2: succession, land, housing, consumer.
// Run: node scripts/corpus-batch-02.mjs
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

const succession = [
	{
		id: 'ke-suc-will-formal-2026',
		title: 'Formal requirements of a valid will',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'A will must be in writing, signed by the testator, and attested by two competent witnesses present together. Oral and unregistered informal wishes are hard to enforce. Store the original safely and tell executors where it is.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'urithi', 'kifo']
	},
	{
		id: 'ke-suc-will-witness-2026',
		title: 'Who can witness a will',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Witnesses should be adults of sound mind who are not beneficiaries, since gifts to attesting witnesses can fail. Each should sign in the presence of the testator. Keep witness IDs and contacts with the will.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'shahidi', 'urithi']
	},
	{
		id: 'ke-suc-will-revoke-2026',
		title: 'Revoking or changing a will',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Revoke by a new will stating revocation, by codicil, or by deliberate destruction. Marriage can affect earlier wills, so review after life events. Keep every version dated with the latest clearly marked.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'kubadilisha', 'urithi']
	},
	{
		id: 'ke-suc-codicil-2026',
		title: 'Codicils: small changes to a will',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Minor changes use a codicil executed with the same formalities as a will and read together with it. Store codicils with the original will. Keep a consolidated list of bequests for executors.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'urithi', 'marekebisho']
	},
	{
		id: 'ke-suc-executor-2026',
		title: 'Choosing executors and trustees',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Name trustworthy executors and alternates who can obtain probate, pay debts, and distribute. Brief them on asset locations and debts. Keep executor contacts with the will.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'mtekelezaji', 'urithi']
	},
	{
		id: 'ke-suc-guardian-will-2026',
		title: 'Naming guardians for minors in a will',
		citation: 'Law of Succession Act; Children Act, 2022',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			"Wills should name guardians and trustees for minor children with maintenance directions. Courts prioritise the child's welfare in confirming arrangements. Keep guardian contacts updated.",
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['wosia', 'mtoto', 'mlezi']
	},
	{
		id: 'ke-suc-trust-minors-2026',
		title: 'Trusts for minor beneficiaries',
		citation: 'Law of Succession Act; Trustee Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Shares for minors are administered in trust for school fees and upkeep until majority, with accounts to the court. Specify trustee powers and reporting. Keep trust accounts and receipts.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'mtoto', 'amana']
	},
	{
		id: 'ke-suc-joint-property-2026',
		title: 'Jointly owned property and survivorship',
		citation: 'Land Registration Act; Law of Succession Act',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Joint tenancy may pass outside the will by survivorship while tenancy in common shares fall into the estate. Confirm the title type before drafting. Keep the title deed and search.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['mali', 'urithi', 'wosia']
	},
	{
		id: 'ke-suc-bank-accounts-2026',
		title: 'Bank accounts of the deceased',
		citation: 'Law of Succession Act; banking practice guidance',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Banks freeze accounts on notification of death and release funds to administrators with the grant. Small balances may have simplified procedures. Keep statements, IDs, and the death certificate.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['benki', 'pesa', 'kifo']
	},
	{
		id: 'ke-suc-mpesa-deceased-2026',
		title: 'Mobile money of a deceased person',
		citation: 'Succession practice; provider guidance',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'Mobile money balances form part of the estate claimed with death certificate, administrator grant, and IDs. Report the death to the provider early. Keep transaction statements and claim references.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mpesa', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-pension-death-2026',
		title: 'Pension and gratuity on death',
		citation: 'Retirement Benefits Act, 1997',
		url: `${K}/akn/ke/act/1997/3`,
		content:
			'Death benefits follow scheme nomination forms and trust law, sometimes outside probate. Confirm nominees with the scheme. Keep nomination forms, IDs, and death certificates.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1997-01-01',
		sw_keywords: ['pensheni', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-nssf-death-2026',
		title: 'NSSF survivor benefits',
		citation: 'NSSF Act, 2013',
		url: `${K}/akn/ke/act/2013/45`,
		content:
			'Survivors claim NSSF benefits with death certificate, claimant IDs, and relationship proof. File at the nearest branch with the member number. Keep claim receipts and correspondence.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '2013-01-01',
		sw_keywords: ['NSSF', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-shif-death-2026',
		title: 'SHIF dependant updates after death',
		citation: 'Social Health Insurance Act, 2023',
		url: `${K}/akn/ke/act/2023/16`,
		content:
			'Update SHIF records after a contributor dies so dependants retain correct cover. Carry the death certificate and household details. Keep updated registration slips.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2023-01-01',
		sw_keywords: ['bima', 'kifo', 'afya']
	},
	{
		id: 'ke-suc-intestate-spouse-2026',
		title: 'Spouse share where there is no will',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			"Surviving spouses take priority shares of intestate estates with children sharing the remainder per statutory tables. No distribution should occur before the grant. Keep the chief's letter and heir list.",
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['mjane', 'urithi', 'wosia']
	},
	{
		id: 'ke-suc-intestate-children-2026',
		title: 'Children shares in intestacy',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			"Children share the intestate estate equally after the spouse's priority, including children born outside marriage who prove dependency. List every child to avoid later objections. Keep birth records.",
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['watoto', 'urithi', 'mali']
	},
	{
		id: 'ke-suc-parents-siblings-2026',
		title: 'Parents and siblings where no spouse or child',
		citation: 'Law of Succession Act, Cap. 160',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Where the deceased left no spouse or child, parents and siblings take per statutory order. Distant relatives inherit only after closer classes. Keep family tree evidence and IDs.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'familia', 'mali']
	},
	{
		id: 'ke-suc-dependant-widow-2026',
		title: 'Widow eviction by in-laws: urgent action',
		citation: 'Law of Succession Act; Protection Against Domestic Violence Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Evicting or dispossessing a widow without succession process is unlawful. Seek chief intervention, cautions at the lands registry, and urgent court orders. Keep marriage, death, and property documents.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mjane', 'nyumba', 'urithi']
	},
	{
		id: 'ke-suc-daughters-share-2026',
		title: 'Daughters equal inheritance rights',
		citation: 'Law of Succession Act; Constitution, Art. 27',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Daughters inherit equally with sons; customary exclusion of daughters is unconstitutional. Challenge discriminatory distributions through objections and court. Keep heir lists and distribution proposals.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2010-08-27',
		sw_keywords: ['binti', 'urithi', 'haki']
	},
	{
		id: 'ke-suc-outside-marriage-2026',
		title: 'Children born outside marriage in succession',
		citation: 'Law of Succession Act; Children Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Children born outside marriage who were maintained or acknowledged rank as dependants with provision rights. Paternity evidence and maintenance proof matter. Keep support records and acknowledgements.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mtoto', 'urithi', 'baba']
	},
	{
		id: 'ke-suc-second-wife-2026',
		title: 'Second wives and co-wives in succession',
		citation: 'Law of Succession Act; Marriage Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Wives under valid customary or Islamic unions are spouses for succession alongside house-specific sharing. List each house with its children. Keep marriage evidence for every union.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['ndoa', 'wake', 'urithi']
	},
	{
		id: 'ke-suc-adopted-children-2026',
		title: 'Adopted children inheritance rights',
		citation: 'Law of Succession Act; Children Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Legally adopted children inherit as children of the adopter with court orders as proof. Informal stays do not confer succession rights. Keep the adoption order and birth records.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['mtoto', 'kuasili', 'urithi']
	},
	{
		id: 'ke-suc-stepchildren-2026',
		title: 'Stepchildren and maintained dependants',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Stepchildren maintained by the deceased may claim as dependants even without adoption. Maintenance evidence and household proof decide. Keep school fee and upkeep records.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mtoto', 'urithi', 'malezi']
	},
	{
		id: 'ke-suc-polygamous-estate-2026',
		title: 'Distributing polygamous estates by house',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Polygamous intestate estates are shared per house with the surviving spouses and children tables. Administrators map each house separately. Keep house lists and asset schedules.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['ndoa', 'nyumba', 'urithi']
	},
	{
		id: 'ke-suc-muslim-widow-2026',
		title: 'Muslim widow shares and iddah maintenance',
		citation: 'Islamic law of succession; Kadhi Courts Act',
		url: `${K}/akn/ke/act/1967/14`,
		content:
			'Muslim widows take fixed Quranic shares with iddah maintenance considerations through Kadhi courts. File with heir lists and property schedules. Keep marriage and death records.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1967-01-01',
		sw_keywords: ['mjane', 'muislamu', 'urithi']
	},
	{
		id: 'ke-suc-debts-first-2026b',
		title: 'Settling estate debts before sharing',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Loans, taxes, and funeral costs rank before beneficiaries. Administrators advertise for creditors and verify claims. Keep loan statements, demand letters, and payment records.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['deni', 'urithi', 'mkopo']
	},
	{
		id: 'ke-suc-funeral-costs-2026',
		title: 'Funeral expenses from the estate',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Reasonable funeral and burial costs are paid from the estate with receipts. Disputes over extravagance are resolved by administrators and the court. Keep all expense receipts.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mazishi', 'kifo', 'gharama']
	},
	{
		id: 'ke-suc-intermeddling-2026',
		title: 'Intermeddling with estate property is an offence',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Selling, renting, or wasting estate property before a grant is intermeddling punishable by courts. Report to the chief, police, and succession court. Keep sale evidence and witness details.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'mali', 'wizi']
	},
	{
		id: 'ke-suc-caution-land-2026',
		title: 'Registering a caution on estate land',
		citation: 'Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Beneficiaries fearing disposal can lodge cautions or restrictions at the registry pending succession. The caution warns buyers and requires court removal. Keep the caution receipt and succession filings.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'urithi', 'tahadhari']
	},
	{
		id: 'ke-suc-sell-before-grant-2026',
		title: 'Agreements to sell before grant are void',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Purported sales of estate land before confirmation of grant pass no valid title. Buyers pay at their own risk. Verify the confirmed grant before paying for estate property.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['ardhi', 'kuuza', 'urithi']
	},
	{
		id: 'ke-suc-rent-estate-2026',
		title: 'Collecting rent from estate property',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Rent from estate houses or land is estate income accounted by administrators, not personal income. Tenants should pay against receipts to the administrator. Keep tenancy and payment records.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['kodi', 'nyumba', 'urithi']
	},
	{
		id: 'ke-suc-accounts-duty-2026',
		title: 'Administrator accounts and distribution',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Administrators must collect assets, pay debts, and file accounts before distribution per the confirmed grant. Beneficiaries can demand accounts. Keep inventory, bank records, and the confirmation order.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'hesabu', 'mali']
	},
	{
		id: 'ke-suc-object-grant-2026',
		title: 'Objecting to a succession grant',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Interested persons may object within the gazette period or seek revocation for concealment. File affidavits with heir and asset evidence. Keep gazette copies and filing receipts.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['pingamizi', 'urithi', 'mahakama']
	},
	{
		id: 'ke-suc-revoke-grant-2026',
		title: 'Revoking a grant obtained by fraud',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Grants obtained by hiding heirs or assets can be revoked with the distribution unwound. Apply with concealed-heir evidence. Keep the original filings and new proof.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'udanganyifu', 'mahakama']
	},
	{
		id: 'ke-suc-small-estates-2026',
		title: 'Small estates and simplified process',
		citation: 'Law of Succession Act; magistrates jurisdiction',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Lower-value estates may proceed in magistrates courts with simplified forms. Confirm the current jurisdictional threshold before filing. Keep valuations and asset lists.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'mahakama', 'mali']
	},
	{
		id: 'ke-suc-chiefs-letter-2026b',
		title: "Getting the chief's introduction letter",
		citation: 'Legal aid succession practice',
		url: 'https://portal.nlas.go.ke/login',
		content:
			'The chief lists the deceased, spouses, children, parents, and assets after verifying IDs and consulting family. Attend with IDs, death certificate, and asset documents. Keep the stamped letter and attendance notes.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['chifu', 'barua', 'urithi']
	},
	{
		id: 'ke-suc-death-cert-2026b',
		title: 'Death certificate for succession',
		citation: 'Births and Deaths Registration Act, Cap. 149',
		url: `${K}/akn/ke/act/1928/2`,
		content:
			'Succession cannot start without the death certificate from civil registration. Apply with burial permit and IDs. Keep several certified copies for banks, lands, and courts.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1928-01-01',
		sw_keywords: ['cheti', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-efiling-succession-2026',
		title: 'E-filing succession causes',
		citation: 'Judiciary e-filing guidance',
		url: 'https://efiling.court.go.ke/',
		content:
			'Succession causes are filed on the judiciary portal with petitions, chief letters, IDs, and asset lists. Pay assessed fees and track the case number. Keep digital receipts and stamped pleadings.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mahakama', 'urithi', 'kesi']
	},
	{
		id: 'ke-suc-legal-aid-succession-2026',
		title: 'Legal aid for succession disputes',
		citation: 'Legal Aid Act, 2016',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Indigent heirs facing dispossession can seek NLAS help with IDs, death certificate, and property documents. The toll-free line is 0800 720 640. Keep means and case documents ready.',
		topic: 'succession',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'urithi', 'wakili']
	},
	{
		id: 'ke-suc-life-interest-2026',
		title: 'Life interest for surviving spouses',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Surviving spouses may hold life interests in the matrimonial home with remainder to children. The interest ends on remarriage in some cases. Keep the grant wording and property records.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['mjane', 'nyumba', 'urithi']
	},
	{
		id: 'ke-suc-customary-land-heirs-2026',
		title: 'Customary land and succession consent',
		citation: 'Community Land Act, 2016; Law of Succession Act',
		url: `${K}/akn/ke/act/2016/27`,
		content:
			'Community and ancestral land succession needs community assembly consent in addition to court grants. Verify registration status with the community register. Keep consent minutes and grant copies.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['ardhi', 'mila', 'urithi']
	},
	{
		id: 'ke-suc-missing-person-2026',
		title: 'Succession where a person is missing',
		citation: 'Law of Succession Act; presumption of death guidance',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Estates of long-missing persons need presumption-of-death orders after police and gazette processes. Report the disappearance with OB records first. Keep search evidence and court orders.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['kupotea', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-foreign-assets-2026',
		title: 'Assets abroad in Kenyan succession',
		citation: 'Law of Succession Act; private international law',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Foreign property may need resealing or parallel proceedings where situated. Disclose all cross-border assets to the advocate. Keep foreign titles and grant copies.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['nje', 'mali', 'urithi']
	},
	{
		id: 'ke-suc-tax-estate-2026',
		title: 'Tax clearance for estates',
		citation: 'Tax Procedures Act; KRA guidance',
		url: 'https://www.kra.go.ke/',
		content:
			"Settle the deceased's tax arrears and obtain clearance before distributing business or rental estates. KRA may raise assessments on unreported income. Keep returns, assessments, and clearance letters.",
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['ushuru', 'KRA', 'urithi']
	},
	{
		id: 'ke-suc-sacco-death-2026',
		title: 'SACCO shares on death of a member',
		citation: 'SACCO Societies Act, 2008',
		url: `${K}/akn/ke/act/2008/14`,
		content:
			'SACCO deposits and shares pass to nominees or administrators with death certificate and grant. Guarantor liabilities attach first. Keep statements, nomination forms, and loan records.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['sacco', 'kifo', 'urithi']
	},
	{
		id: 'ke-suc-insurance-death-2026',
		title: 'Life insurance claims after death',
		citation: 'Insurance Act, Cap. 487',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Beneficiaries claim life cover with death certificate, policy, IDs, and claimant proof. Notify the insurer promptly. Keep policy documents and claim references.',
		topic: 'succession',
		source_type: 'legislation',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'kifo', 'malipo']
	},
	{
		id: 'ke-suc-employer-death-2026',
		title: 'Terminal dues where an employee dies',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Families claim unpaid salary, leave, and gratuity from the employer with death certificate and administrator letters. Demand an itemised statement. Keep payslips and payment records.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['kifo', 'mshahara', 'urithi']
	},
	{
		id: 'ke-suc-will-storage-2026',
		title: 'Storing wills and telling family',
		citation: 'Succession practice guidance',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Keep the original will with an advocate or safe place and tell executors how to find it. Give copies to spouses without marking originals. Keep a one-page asset map with the will.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['wosia', 'hifadhi', 'familia']
	},
	{
		id: 'ke-suc-diy-will-risks-2026',
		title: 'Risks of handwritten DIY wills',
		citation: 'Law of Succession Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Handwritten wills often fail on attestation, vague gifts, or missing residuary clauses. Have a lawyer review before signing. Keep drafts and the review notes.',
		topic: 'succession',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['wosia', 'hatari', 'wakili']
	}
];

const land = [
	{
		id: 'ke-land-freehold-2026',
		title: 'Freehold tenure in Kenya',
		citation: 'Land Act, 2012; Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Freehold gives absolute ownership subject to lawful planning and rates. Verify the title type on the deed and registry before buying. Keep the title and search certificate.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'hati', 'shamba']
	},
	{
		id: 'ke-land-leasehold-2026b',
		title: 'Leasehold tenure and renewals',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Leaseholds run for fixed terms, commonly 33, 50, or 99 years, with renewal applications before expiry. Check the unexpired term and ground rent. Keep the lease title and renewal records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'kodi', 'hati']
	},
	{
		id: 'ke-land-customary-2026',
		title: 'Customary tenure and adjudication',
		citation: 'Land Adjudication Act; Community Land Act, 2016',
		url: `${K}/akn/ke/act/2016/27`,
		content:
			'Unregistered customary holdings are adjudicated and registered progressively. Follow the local adjudication notices and objections. Keep hearing notices and determination records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['ardhi', 'mila', 'shamba']
	},
	{
		id: 'ke-land-public-2026',
		title: 'Public land allocations',
		citation: 'Land Act, 2012; NLC guidance',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Public land is allocated through the NLC with part-development and use conditions. Unauthorised occupation risks recovery. Keep allotment letters and compliance records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'serikali', 'shamba']
	},
	{
		id: 'ke-land-search-2026b',
		title: 'How to do an official land search',
		citation: 'Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Apply with the title number and owner ID through the registry or Ardhisasa, pay the fee, and collect the search showing owner, size, and encumbrances. Keep the search printout with the agreement.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'utafiti', 'hati']
	},
	{
		id: 'ke-land-ardhisasa-2026',
		title: 'Using Ardhisasa for land services',
		citation: 'Land Registration Act; Ardhisasa guidance',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Ardhisasa handles searches, transfers, charges, and cadastral maps with eCitizen login and digital payments. Verify parcel numbers before transacting. Keep payment receipts and application references.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2021-01-01',
		sw_keywords: ['ardhi', 'mtandaoni', 'hati']
	},
	{
		id: 'ke-land-green-card-2026',
		title: 'The green card (parcel file)',
		citation: 'Land registry practice guidance',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'The green card at the registry records every transaction on a parcel. Inspect it during disputes to trace ownership history. Keep copies of entries relied upon.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'hati', 'rekodi']
	},
	{
		id: 'ke-land-beacon-2026',
		title: 'Beacons and survey disputes',
		citation: 'Survey Act, Cap. 299',
		url: `${K}/akn/ke/act/1961/4`,
		content:
			'Only licensed surveyors should fix or confirm beacons with mutation forms. Moving beacons is an offence. Keep survey reports and mutation records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '1961-01-01',
		sw_keywords: ['ardhi', 'mpaka', 'shamba']
	},
	{
		id: 'ke-land-mutation-2026',
		title: 'Subdivision and mutation forms',
		citation: 'Land Act; Survey Act',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Subdivisions need survey, mutation approval, and registration of new titles with consent fees. Agree in writing who pays costs. Keep approved mutations and new titles.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'kugawa', 'shamba']
	},
	{
		id: 'ke-land-consent-transfer-2026',
		title: 'Consent to transfer charges',
		citation: 'Land Act, 2012; county practice',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Some leases and scheme lands need landlord or board consent before transfer. Apply early with the sale agreement. Keep the consent letter with completion documents.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'ruhusa', 'kuuza']
	},
	{
		id: 'ke-land-stamp-duty-2026b',
		title: 'Valuation for stamp duty',
		citation: 'Stamp Duty Act, Cap. 480',
		url: `${K}/akn/ke/act/1958/31`,
		content:
			'Government valuers assess duty on transfers; under-declared prices are adjusted upwards. Budget for duty, registration, and advocate fees. Keep valuation reports and duty receipts.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '1958-01-01',
		sw_keywords: ['ardhi', 'ushuru', 'kuuza']
	},
	{
		id: 'ke-land-completion-2026',
		title: 'Completion statement on land purchase',
		citation: 'Conveyancing practice guidance',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Completion balances price against deposit, duty, fees, and apportionments with a signed statement. Pay through traceable channels. Keep bank slips and the completion statement.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'malipo', 'kuuza']
	},
	{
		id: 'ke-land-agent-verify-2026',
		title: 'Verifying agents and sellers of land',
		citation: 'Estate Agents Act, Cap. 533',
		url: `${K}/akn/ke/act/1984/6`,
		content:
			'Confirm agency registration, written authority from the owner, and registry records before paying deposits. View the land with documents in hand. Keep authority letters and messages.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '1984-01-01',
		sw_keywords: ['ardhi', 'dalali', 'kuuza']
	},
	{
		id: 'ke-land-deposit-2026b',
		title: 'Deposits on land deals',
		citation: 'Law of Contract; Land Act',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Deposits should be recorded with refund terms, timelines, and default consequences, ideally held by advocates. Avoid cash to strangers. Keep deposit agreements and receipts.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['ardhi', 'amana', 'pesa']
	},
	{
		id: 'ke-land-offplan-2026',
		title: 'Off-plan plots and projects',
		citation: 'Land Act; consumer protection guidance',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Off-plan buyers should verify approvals, survey plans, and developer track record with phased payments tied to milestones. Visit the site. Keep approvals, plans, and payment schedules.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'ploti', 'kununua']
	},
	{
		id: 'ke-land-riparian-2026',
		title: 'Riparian reserves and road reserves',
		citation: 'Land Act; Water Act, 2016; survey guidance',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Building on riparian or road reserves risks demolition without compensation. Verify reserves on survey plans before buying or building. Keep survey reports and approvals.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['ardhi', 'mto', 'barabara']
	},
	{
		id: 'ke-land-forest-2026',
		title: 'Forest and public utility land warnings',
		citation: 'Forest Conservation and Management Act, 2016',
		url: `${K}/akn/ke/act/2016/8`,
		content:
			'Excisions of forest or utility corridors sold cheaply are usually fraud. Verify gazette status and registry records. Keep search results and survey confirmation.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['msitu', 'ardhi', 'wizi']
	},
	{
		id: 'ke-land-succession-transfer-2026',
		title: 'Transfer by transmission after death',
		citation: 'Law of Succession Act; Land Registration Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Heirs transfer land by transmission with the confirmed grant, IDs, and registry forms rather than sale forms. Pay rates clearance first. Keep the new title and grant.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'ardhi', 'hati']
	},
	{
		id: 'ke-land-gift-2026',
		title: 'Gifts of land between family',
		citation: 'Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Family gifts need transfer forms, consent where applicable, and registration like sales. Oral gifts are unenforceable. Keep the transfer, consent, and new title.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['zawadi', 'ardhi', 'familia']
	},
	{
		id: 'ke-land-lease-register-2026b',
		title: 'Registering long leases',
		citation: 'Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Long leases should be registered to bind buyers and lenders with rent, term, and repair terms clear. Keep the registered lease and rent receipts.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['kodi', 'ardhi', 'mkataba']
	},
	{
		id: 'ke-land-charge-2026b',
		title: 'Using title as loan security',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Charges over land need spousal consent where applicable, valuation, and registration with statutory sale procedures on default. Read the charge before signing. Keep the charge and loan records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['mkopo', 'ardhi', 'hati']
	},
	{
		id: 'ke-land-discharge-2026',
		title: 'Discharging a charge after repaying',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'After full repayment, obtain a discharge signed by the lender and register it to clear the title. Confirm the registry record is clean. Keep the discharge and new search.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['mkopo', 'ardhi', 'malipo']
	},
	{
		id: 'ke-land-caution-2026b',
		title: 'Lodging cautions and restrictions',
		citation: 'Land Registration Act, 2012',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Claimants can lodge cautions warning against dealings pending disputes, with restrictions for stronger protection. Wrongful cautions attract costs. Keep the caution receipt and case filings.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'tahadhari', 'mgogoro']
	},
	{
		id: 'ke-land-adverse-2026',
		title: 'Adverse possession claims',
		citation: 'Limitation of Actions Act, Cap. 22',
		url: `${K}/akn/ke/act/1968/21`,
		content:
			'Long, open, exclusive occupation may ground adverse possession claims with strict proof over many years. Get advice before asserting or conceding. Keep occupation evidence and payment records.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '1968-01-01',
		sw_keywords: ['ardhi', 'kukalia', 'shamba']
	},
	{
		id: 'ke-land-boundary-court-2026',
		title: 'Boundary suits in the ELC',
		citation: 'Environment and Land Court Act, 2011',
		url: `${K}/akn/ke/act/2011/19`,
		content:
			'Boundary cases file with titles, searches, survey reports, and demand history in the ELC. Courts may order site visits. Keep pleadings and survey maps together.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2011-01-01',
		sw_keywords: ['mpaka', 'ardhi', 'mahakama']
	},
	{
		id: 'ke-land-rent-tribunal-2026b',
		title: 'Ground rent disputes',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Unpaid ground rent blocks transfers and attracts penalties. Confirm statements at the lands office and clear arrears before completion. Keep rent receipts and clearance.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['kodi', 'ardhi', 'malipo']
	},
	{
		id: 'ke-land-rates-2026b',
		title: 'County rates clearance before transfer',
		citation: 'Rating Act; county finance acts',
		url: `${K}/akn/ke/act/2024/15`,
		content:
			'Transfers need county rates clearance certificates showing arrears paid. Sellers usually clear before completion. Keep clearance certificates and receipts.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2024-01-01',
		sw_keywords: ['kodi', 'kaunti', 'ardhi']
	},
	{
		id: 'ke-land-compulsory-2026b',
		title: 'Compensation for compulsory acquisition',
		citation: 'Land Act, 2012; Constitution, Art. 40',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Affected owners claim land value, developments, disturbance, and relocation costs through inquiry with valuations. Object to low awards promptly. Keep titles, valuations, and acquisition notices.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'fidia', 'serikali']
	},
	{
		id: 'ke-land-squatter-2026',
		title: 'Long occupation and settlement schemes',
		citation: 'Land Act; settlement scheme guidance',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Long occupiers should engage settlement and adjudication programmes rather than force. Keep occupation history, chief letters, and programme records.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'squatter', 'shamba']
	},
	{
		id: 'ke-land-eviction-order-2026',
		title: 'Eviction from land needs a court order',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Occupants can only be removed through lawful notice and court process, never by demolitions or force. Seek urgent orders where threatened. Keep title proof and demand letters.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'kufukuzwa', 'mahakama']
	},
	{
		id: 'ke-land-inheritance-subdiv-2026',
		title: 'Subdividing inherited land among heirs',
		citation: 'Law of Succession Act; Land Control Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Heirs subdivide only after confirmation of grant with survey, board consent for agricultural land, and new titles per share. Agree boundaries in writing. Keep the confirmed grant and mutation records.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'ardhi', 'kugawa']
	},
	{
		id: 'ke-land-spouse-consent-2026',
		title: 'Spousal consent on land dealings',
		citation: 'Land Act, 2012; Matrimonial Property Act',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Dispositions of matrimonial land need written spousal consent. Transactions without it are voidable. Keep consent forms with completion documents.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ndoa', 'ardhi', 'ruhusa']
	},
	{
		id: 'ke-land-minor-2026',
		title: 'Land held for minors',
		citation: 'Law of Succession Act; Land Registration Act',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Minors hold land through trustees with court supervision; guardians cannot sell casually. Insist on court approval for dealings. Keep trust and court records.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['mtoto', 'ardhi', 'mali']
	},
	{
		id: 'ke-land-company-2026b',
		title: 'Land owned by companies',
		citation: 'Companies Act, 2015; Land Registration Act',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'Company land dealings need board authority and signatory proof with active company status. Check for charges at the registry and BRS. Keep resolutions and search results.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['kampuni', 'ardhi', 'hati']
	},
	{
		id: 'ke-land-group-ranch-2026',
		title: 'Group ranches and subdivision',
		citation: 'Land (Group Representatives) Act; Community Land Act',
		url: `${K}/akn/ke/act/2016/27`,
		content:
			'Group ranch subdivisions follow member registers and consent procedures with titles issued per share. Verify membership and minutes. Keep register extracts and titles.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['ardhi', 'jamii', 'shamba']
	},
	{
		id: 'ke-land-apartment-2026b',
		title: 'Buying apartments on sectional titles',
		citation: 'Sectional Properties Act, 2020',
		url: `${K}/akn/ke/act/2020/21`,
		content:
			'Flats carry sectional unit titles plus shared common property managed by owners corporations. Review service charge and management records. Keep the sectional title and management accounts.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2020-01-01',
		sw_keywords: ['nyumba', 'ghorofa', 'ardhi']
	},
	{
		id: 'ke-land-service-charge-2026b',
		title: 'Service charge disputes in estates',
		citation: 'Sectional Properties Act, 2020',
		url: `${K}/akn/ke/act/2020/21`,
		content:
			'Demand budgets and audited accounts where service charges seem excessive, then raise disputes through management and the ELC where needed. Keep demand notes and receipts.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2020-01-01',
		sw_keywords: ['gharama', 'nyumba', 'huduma']
	},
	{
		id: 'ke-land-fencing-2026',
		title: 'Fencing and access road disputes',
		citation: 'Land Act; physical planning guidance',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Fences should follow confirmed boundaries and approved access; blocking shared roads invites court orders. Resolve with survey and chief or ELC process. Keep survey reports and demand letters.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['mpaka', 'ardhi', 'jirani']
	},
	{
		id: 'ke-land-neighbour-trees-2026',
		title: 'Neighbour trees and developments',
		citation: 'NEMA and nuisance guidance',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Overhanging trees, borehole drilling, and storey developments affecting neighbours need approvals and notice. Complain to NEMA and county planning with photos. Keep approvals and reports.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1999-01-01',
		sw_keywords: ['jirani', 'ardhi', 'mazingira']
	},
	{
		id: 'ke-land-quarry-2026',
		title: 'Quarries and soil extraction near homes',
		citation: 'Mining Act, 2016; EMCA',
		url: `${K}/akn/ke/act/2016/12`,
		content:
			'Quarrying needs mineral and NEMA approvals with blasting safeguards. Affected residents report cracks and dust with dated photos. Keep structural reports and complaint references.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['kokoto', 'ardhi', 'jirani']
	},
	{
		id: 'ke-land-wayleave-2026',
		title: 'Wayleaves for power and water lines',
		citation: 'Land Act; Energy Act, 2019',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Utilities may seek registered wayleaves with compensation for lines crossing land. Negotiate terms before construction. Keep wayleave agreements and payment records.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'maji', 'ardhi']
	},
	{
		id: 'ke-land-river-2026',
		title: 'Water frontage and borehole permits',
		citation: 'Water Act, 2016',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Abstraction from rivers or boreholes needs Water Resources Authority permits alongside county connections. Illegal connections attract penalties. Keep permits and bills.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'kisima', 'ardhi']
	},
	{
		id: 'ke-land-change-user-2026',
		title: 'Change of user and development permission',
		citation: 'Physical and Land Use Planning Act, 2019',
		url: `${K}/akn/ke/act/2019/13`,
		content:
			'Converting agricultural to commercial or multi-dwelling use needs planning approval with public notice. Build only after approval. Keep approval letters and plans.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['ardhi', 'ujenzi', 'ruhusa']
	},
	{
		id: 'ke-land-demolition-2026',
		title: 'Demolition orders and enforcement notices',
		citation: 'Physical and Land Use Planning Act, 2019',
		url: `${K}/akn/ke/act/2019/13`,
		content:
			'Unapproved structures attract enforcement and demolition notices with appeal windows. Respond in writing and regularise where possible. Keep notices, plans, and appeal filings.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['bomoa', 'ujenzi', 'ardhi']
	},
	{
		id: 'ke-land-rent tribunal-use-2026',
		title: 'When land disputes go to tribunals',
		citation: 'Land Act; tribunal guidance',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Some controlled tenancies and land rent matters start at tribunals before the ELC. Check the forum on the notice received. Keep notices and tribunal filings.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'mahakama', 'mgogoro']
	},
	{
		id: 'ke-land-legal-aid-land-2026',
		title: 'Legal aid for land grabbing',
		citation: 'Legal Aid Act, 2016',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Victims of grabbing or fraudulent transfer facing loss of homes can seek NLAS help with titles, searches, and OB records. The toll-free line is 0800 720 640. Keep all ownership documents.',
		topic: 'land',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['ardhi', 'wizi', 'msaada']
	},
	{
		id: 'ke-land-chief-boundary-2026',
		title: 'Chief-led boundary settlements',
		citation: 'Traditional dispute resolution guidance',
		url: `${K}/akn/ke/act/2013/1`,
		content:
			'Minor boundary disagreements can be settled by chiefs with survey input and written witnessed agreements. Serious or violent cases go to the registrar or ELC. Keep the settlement record.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['chifu', 'mpaka', 'ardhi']
	},
	{
		id: 'ke-land-fake-title-2026',
		title: 'Spotting fake title deeds',
		citation: 'Land Registration Act; DCI fraud guidance',
		url: `${K}/akn/ke/act/2012/3`,
		content:
			'Compare paper, seals, parcel numbers, and registry records; fake titles often mismatch TIMS-style green-card history. Insist on registry searches. Keep suspect documents for DCI.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['hati', 'bandia', 'ardhi']
	},
	{
		id: 'ke-land-inheritance-caveat-2026',
		title: 'Family disputes over ancestral land',
		citation: 'Law of Succession Act; ELC guidance',
		url: `${K}/akn/ke/act/1972/14`,
		content:
			'Ancestral land sales without heir consent are challenged through succession objections, cautions, and ELC suits. Gather family meeting minutes and heir lists. Keep filings and registry receipts.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1972-01-01',
		sw_keywords: ['urithi', 'ardhi', 'familia']
	},
	{
		id: 'ke-land-leased-sisal-2026',
		title: 'Leasing out farmland to investors',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Leasing shambas for farming or masts needs written terms on rent, duration, use, and restoration with registration for long terms. Keep the signed lease and payment records.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['shamba', 'kodi', 'ardhi']
	},
	{
		id: 'ke-land-mortgage-auction-2026',
		title: 'Auction of charged land on default',
		citation: 'Land Act, 2012',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Lenders must issue statutory notices and valuations before auctioning charged land. Borrowers can redeem before the fall of the hammer. Keep demand notices, statements, and sale adverts.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['mnada', 'mkopo', 'ardhi']
	},
	{
		id: 'ke-land-redemption-2026',
		title: 'Right to redeem charged land',
		citation: 'Land Act, 2012',
		url: `${K}/an/ke/act/2012/6`,
		content:
			'Borrowers may clear arrears and costs to stop a sale at any time before completion. Get the redemption figure in writing. Keep payment proof and lender correspondence.',
		topic: 'land',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['mkopo', 'ardhi', 'malipo']
	},
	{
		id: 'ke-land-valuation-dispute-2026',
		title: 'Disputing land valuations',
		citation: 'Valuers Act, Cap. 532',
		url: `${K}/akn/ke/act/1984/7`,
		content:
			'Valuation disputes are tested with independent registered valuer reports and comparable sales. Commission a second report where figures diverge. Keep both reports and instructions.',
		topic: 'land',
		source_type: 'guidance',
		effective_date: '1984-01-01',
		sw_keywords: ['ardhi', 'thamani', 'pesa']
	}
];

const housing = [
	{
		id: 'ke-hou-tenancy-agree-2026',
		title: 'Written tenancy agreements',
		citation: 'General tenancy law',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Put rent, deposit, duration, notice, utilities, and repair duties in a signed agreement with inventory. Oral terms are hard to prove. Keep the signed copy and handover photos.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kodi', 'nyumba', 'mpangaji']
	},
	{
		id: 'ke-hou-inventory-2026',
		title: 'Move-in inventory and photos',
		citation: 'General tenancy practice',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Record meter readings, defects, and furniture condition with dated photos signed by both sides. This decides deposit deductions later. Keep the inventory with the agreement.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['nyumba', 'kodi', 'uharibifu']
	},
	{
		id: 'ke-hou-deposit-2026b',
		title: 'Rent deposits and deductions',
		citation: 'General tenancy law',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Deposits are security against arrears and damage, refundable with an itemised statement. Challenge unfair deductions in writing with photos. Keep receipts and the refund statement.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['amana', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-receipts-2026',
		title: 'Rent receipts every payment',
		citation: 'General tenancy practice',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Insist on receipts or M-Pesa records naming the house, month, and recipient for every payment. Cash without receipt is unprovable. Keep a full payment file.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['risiti', 'kodi', 'mpesa']
	},
	{
		id: 'ke-hou-notice-quit-2026',
		title: 'Notice to quit: length and form',
		citation: 'Rent Restriction Act, Cap. 296; tenancy terms',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Termination notices must follow the agreement and applicable law in writing with clear dates. Defective notices can be challenged. Keep the notice and proof of delivery.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1959-01-01',
		sw_keywords: ['notisi', 'kufukuzwa', 'nyumba']
	},
	{
		id: 'ke-hou-early-termination-2026',
		title: 'Ending a lease early',
		citation: 'General contract; tenancy terms',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Early exit follows the break clause with notice and handover; otherwise negotiate surrender in writing. Document the meter and key return. Keep the surrender agreement.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['kuhama', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-lockout-2026b',
		title: 'Lockouts are unlawful without court process',
		citation: 'Tenancy law; court procedure',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Locking out, removing doors, or cutting water or power to force exit is unlawful. Report to police and seek urgent court restoration orders. Keep photos, witness contacts, and utility records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kufungiwa', 'nyumba', 'polisi']
	},
	{
		id: 'ke-hou-distress-2026',
		title: 'Distress for rent: landlord limits',
		citation: 'Distress for Rent Act, Cap. 293',
		url: `${K}/akn/ke/act/1960/8`,
		content:
			'Attachment of tenant goods for arrears follows strict legal procedure with inventory and timelines. Irregular distress is challengeable. Keep the distress notice and goods list.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1960-01-01',
		sw_keywords: ['kodi', 'deni', 'nyumba']
	},
	{
		id: 'ke-hou-rent-rise-2026b',
		title: 'Challenging unfair rent increases',
		citation: 'Rent Restriction Act; tribunal guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Increases must follow the agreement and law with written notice. Disputes go to negotiation, tribunal, or court with payment history. Keep the agreement and increase notices.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1959-01-01',
		sw_keywords: ['kodi', 'kupanda', 'nyumba']
	},
	{
		id: 'ke-hou-repairs-leak-2026',
		title: 'Leaking roofs and damp houses',
		citation: 'Public Health Act, Cap. 242',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Report leaks in writing with dated photos and allow reasonable repair time, then escalate to public health for uninhabitable conditions. Keep repair requests and health reports.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1921-01-01',
		sw_keywords: ['mvua', 'nyumba', 'ukarabati']
	},
	{
		id: 'ke-hou-sewage-2026',
		title: 'Sewage bursts and sanitation failures',
		citation: 'Public Health Act, Cap. 242',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Sewage overflows are public health hazards reported to the landlord and public health officers with photos. Seek alternative arrangement where uninhabitable. Keep reports and medical notes.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1921-01-01',
		sw_keywords: ['choo', 'nyumba', 'afya']
	},
	{
		id: 'ke-hou-water-cut-2026',
		title: 'Water disconnection in rentals',
		citation: 'Water Act, 2016; tenancy terms',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Water cuts for arrears follow provider procedure with notice; landlords must not cut supply as eviction pressure. Pay through official channels. Keep bills, notices, and payment proof.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'nyumba', 'kodi']
	},
	{
		id: 'ke-hou-power-cut-2026',
		title: 'Electricity disconnection in rentals',
		citation: 'Energy Act, 2019',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Power disconnections follow Kenya Power procedure with bills and notice. Landlords cutting supply to evict act unlawfully. Keep meter numbers, bills, and reconnection records.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'nyumba', 'token']
	},
	{
		id: 'ke-hou-caretaker-2026b',
		title: 'Caretaker harassment and demands',
		citation: 'Tenancy law guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Caretakers cannot levy new charges, lock gates, or disconnect services without landlord authority and law. Escalate in writing to the landlord or agent. Keep demands, receipts, and messages.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mlinzi', 'nyumba', 'kodi']
	},
	{
		id: 'ke-hou-agent-fees-2026',
		title: 'Agent and viewing fees',
		citation: 'Estate Agents Act; consumer guidance',
		url: `${K}/akn/ke/act/1984/6`,
		content:
			'Confirm agency registration and fee terms before paying viewing or agency fees, and receipt every payment. Fake agents vanish after deposits. Keep listings, IDs, and payment proof.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1984-01-01',
		sw_keywords: ['dalali', 'nyumba', 'pesa']
	},
	{
		id: 'ke-hou-double-let-2026b',
		title: 'Double letting of the same house',
		citation: 'Penal Code; tenancy guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Where two tenants hold receipts for one house, the earlier verifiable agreement and landlord authority decide. Report fraud to police. Keep agreements, receipts, and messages.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['nyumba', 'tapeli', 'kodi']
	},
	{
		id: 'ke-hou-subletting-2026',
		title: 'Subletting and Airbnb without consent',
		citation: 'Tenancy terms; county by-laws',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Subletting against the agreement can ground termination. Seek written landlord consent with terms. Keep consent letters and sub-tenant records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kupangisha', 'nyumba', 'ruhusa']
	},
	{
		id: 'ke-hou-controlled-2026',
		title: 'Controlled tenancies and fair rent',
		citation: 'Rent Restriction Act, Cap. 296',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Older low-rent tenancies may be controlled with regulated rents and tribunal oversight. Check control status before agreeing increases. Keep the letting history and tribunal orders.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1959-01-01',
		sw_keywords: ['kodi', 'nyumba', 'mahakama']
	},
	{
		id: 'ke-hou-bprt-shop-2026b',
		title: 'Shop tenants and goodwill protection',
		citation: 'Landlord and Tenant (Shops, Hotels) Act, Cap. 301',
		url: `${K}/akn/ke/act/1965/13`,
		content:
			'Protected shop tenancies have termination and rent safeguards with tribunal recourse. Notices must follow statutory form. Keep the lease, notices, and tribunal filings.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1965-01-01',
		sw_keywords: ['duka', 'kodi', 'biashara']
	},
	{
		id: 'ke-hou-hostel-2026',
		title: 'Hostel and bedsitter rules',
		citation: 'Tenancy terms; public health guidance',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Hostel terms should state curfews, visitors, deposits, and notice in writing. Safety and sanitation complaints go to management and public health. Keep the admission agreement and receipts.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['hosteli', 'nyumba', 'wanafunzi']
	},
	{
		id: 'ke-hou-maid-room-2026',
		title: 'Live-in househelp accommodation',
		citation: 'Employment Act; tenancy guidance',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Househelp quarters should be habitable with clear work hours separate from tenancy. Put accommodation terms in the employment contract. Keep payment and housing records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mfanyakazi', 'nyumba', 'kazi']
	},
	{
		id: 'ke-hou-noise-neighbour-2026',
		title: 'Noisy neighbours and landlords duty',
		citation: 'EMCA; tenancy terms',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Report persistent noise with a dated diary to the landlord, agent, and then NEMA or police. Keep recordings, diary entries, and complaint references.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1999-01-01',
		sw_keywords: ['kelele', 'jirani', 'nyumba']
	},
	{
		id: 'ke-hou-pets-2026',
		title: 'Pets in rental flats',
		citation: 'Tenancy terms; estate rules',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Pets depend on the agreement and estate rules with liability for damage and nuisance on the keeper. Seek written consent. Keep consent and vaccination records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mbwa', 'paka', 'nyumba']
	},
	{
		id: 'ke-hou-painting-2026',
		title: 'Repainting and improvements by tenants',
		citation: 'Tenancy terms guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Agree improvements and repainting in writing with who pays and reinstatement duties. Unapproved alterations invite deposit deductions. Keep approvals and cost receipts.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['rangi', 'nyumba', 'ukarabati']
	},
	{
		id: 'ke-hou-keys-handover-2026',
		title: 'Key handover and final meter readings',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Return all keys with a signed handover recording meters, condition, and date. Settle final bills the same day. Keep the handover note and clearance.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['funguo', 'kuhama', 'nyumba']
	},
	{
		id: 'ke-hou-rent-tribunal-file-2026',
		title: 'Filing at the Rent Tribunal',
		citation: 'Rent Restriction Act; tribunal guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'File with the agreement, receipts, notices, and a statement of the dispute on prescribed forms. Attend mentions with originals. Keep filing receipts and orders.',
		topic: 'housing',
		source_type: 'legislation',
		effective_date: '1959-01-01',
		sw_keywords: ['mahakama', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-eviction-defence-2026',
		title: 'Defending an eviction suit',
		citation: 'Civil procedure; tenancy law',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'File a defence with payment records and notice defects before the deadline and attend mentions. Seek interim stay where lockout threatens. Keep pleadings and hearing notices.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['kufukuzwa', 'mahakama', 'nyumba']
	},
	{
		id: 'ke-hou-rent-arrears-plan-2026',
		title: 'Clearing rent arrears by plan',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Propose a written catch-up plan with dates and amounts before arrears grow, and honour it. Keep the plan, payments, and landlord acknowledgements.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['deni', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-shortlet-estate-2026b',
		title: 'Short-term lets and estate consent',
		citation: 'Sectional Properties Act; county by-laws',
		url: `${K}/akn/ke/act/2020/21`,
		content:
			'Estates may regulate Airbnb-style lets with registration and conduct rules. Confirm management consent before listing. Keep consent, bookings, and guest records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2020-01-01',
		sw_keywords: ['airbnb', 'nyumba', 'wageni']
	},
	{
		id: 'ke-hou-fire-safety-2026',
		title: 'Fire safety in flats',
		citation: 'Fire and public safety guidance',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Estates need extinguishers, clear exits, and assembly points with landlord maintenance. Report blocked exits to management and county fire. Keep complaint records and photos.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['moto', 'nyumba', 'usalama']
	},
	{
		id: 'ke-hou-lift-2026',
		title: 'Lift breakdowns and service charges',
		citation: 'Sectional Properties Act; management guidance',
		url: `${K}/akn/ke/act/2020/21`,
		content:
			'Lift maintenance is a service-charge item with inspection duties. Demand maintenance logs where breakdowns recur. Keep demands and incident notes.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2020-01-01',
		sw_keywords: ['lifti', 'ghorofa', 'huduma']
	},
	{
		id: 'ke-hou-gated-dues-2026',
		title: 'Gated estate monthly dues',
		citation: 'Estate management guidance',
		url: `${K}/akn/ke/act/2020/21`,
		content:
			'Estate dues fund security, garbage, and common repairs with budgets approved at meetings. Ask for accounts where dues jump. Keep demand notes and meeting minutes.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['gharama', 'nyumba', 'ulinzi']
	},
	{
		id: 'ke-hou-water-vendor-2026',
		title: 'Borehole and vendor water in flats',
		citation: 'Water Act; public health guidance',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Vendor and borehole water should meet safety standards with treatment records. Report discoloured or unsafe supply to public health. Keep bills and test reports.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'nyumba', 'afya']
	},
	{
		id: 'ke-hou-mould-2026',
		title: 'Mould and damp health complaints',
		citation: 'Public Health Act',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Persistent damp causing illness is reported with medical notes to the landlord and public health. Request relocation or remediation in writing. Keep photos and treatment records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1921-01-01',
		sw_keywords: ['ukungu', 'nyumba', 'afya']
	},
	{
		id: 'ke-hou-bedsitter-deposit-2026',
		title: 'Bedsitter deposits and viewing scams',
		citation: 'Consumer and tenancy guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'View bedsitters physically, verify the agent, and receipt deposits to the landlord account. Avoid pay-before-view demands. Keep listings and payment proof.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['nyumba', 'tapeli', 'amana']
	},
	{
		id: 'ke-hou-plot-caretaker-2026',
		title: 'Plot caretaker rent collection',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Pay caretakers only with landlord-authorised receipts naming the plot and house. Confirm remittance with the landlord periodically. Keep every receipt.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kodi', 'nyumba', 'risiti']
	},
	{
		id: 'ke-hou-rent-book-2026',
		title: 'Rent books and payment ledgers',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Maintain a rent book signed by both sides or a digital ledger reconciled to M-Pesa. Disputes turn on this record. Keep the book and statements together.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kodi', 'kitabu', 'risiti']
	},
	{
		id: 'ke-hou-salary-rent-2026',
		title: 'Rent deductions from salary',
		citation: 'Employment Act; tenancy terms',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employer-housing deductions need written authorisation within lawful deduction limits. Confirm balances on payslips monthly. Keep authorisation and payslips.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mshahara', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-school-rent-2026',
		title: 'Renting near schools: term timing',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Align lease start with school terms and confirm commute and water reliability before paying. Keep the agreement and school admission records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['shule', 'nyumba', 'kodi']
	},
	{
		id: 'ke-hou-flood-2026',
		title: 'Flooded rental houses',
		citation: 'EMCA; tenancy guidance',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Document flooding with photos, notify the landlord in writing, and seek rent relief or relocation where uninhabitable. Report drainage failures to the county. Keep reports and expense receipts.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1999-01-01',
		sw_keywords: ['mafuriko', 'nyumba', 'mvua']
	},
	{
		id: 'ke-hou-security-robbery-2026',
		title: 'Break-ins and landlord security duties',
		citation: 'Tenancy law; Penal Code',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Report break-ins to police and the landlord with OB numbers, and demand gate, lighting, and lock fixes in writing. Keep OB slips and repair requests.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['wizi', 'nyumba', 'ulinzi']
	},
	{
		id: 'ke-hou-moving-out-2026',
		title: 'Notice checklist when moving out',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Give written notice, clear bills, repair damage, photograph the unit, and hand over keys with a signed note. Claim the deposit with the file. Keep every document.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kuhama', 'nyumba', 'kodi']
	},
	{
		id: 'ke-hou-legal-aid-rent-2026',
		title: 'Legal aid for eviction threats',
		citation: 'Legal Aid Act, 2016',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Tenants facing lockout or demolition threats can seek NLAS help with agreements, receipts, and notices. The toll-free line is 0800 720 640. Keep the full tenancy file.',
		topic: 'housing',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'kufukuzwa', 'nyumba']
	},
	{
		id: 'ke-hou-kb-cleaning-2026',
		title: 'Common cleaning and garbage fees',
		citation: 'Public Health Act; estate guidance',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Garbage and cleaning levies should be receipted with licensed collection. Report dumping to public health with photos. Keep payment receipts.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1921-01-01',
		sw_keywords: ['taka', 'nyumba', 'usafi']
	},
	{
		id: 'ke-hou-paint-wear-2026',
		title: 'Fair wear and tear vs damage',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Faded paint and minor scuffs are usually wear, while holes and burns are damage. Compare move-in and move-out photos. Keep both photo sets.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['uharibifu', 'nyumba', 'amana']
	},
	{
		id: 'ke-hou-guarantor-rent-2026',
		title: 'Guarantors for rent',
		citation: 'Law of Contract Act',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Rent guarantees should cap liability and notice terms in writing. Guarantors get copies of demands. Keep the guarantee and payment records.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['mdhamini', 'kodi', 'nyumba']
	},
	{
		id: 'ke-hou-military-police-house-2026',
		title: 'Institutional and police housing',
		citation: 'Service standing orders; tenancy guidance',
		url: 'https://www.nationalpolice.go.ke/',
		content:
			'Service quarters follow institutional allocation rules with deduction and vacation procedures. Keep allocation letters and payslip deductions.',
		topic: 'housing',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['nyumba', 'kazi', 'askari']
	}
];

const consumer = [
	{
		id: 'ke-con-receipt-right-2026',
		title: 'Always demand a receipt or ETR slip',
		citation: 'Consumer Protection Act, 2012; Tax Procedures Act',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Receipts prove price, date, and seller for every warranty or refund claim. eTIMS invoices add tax verification. Photograph receipts before ink fades and keep digital copies.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['risiti', 'mnunuzi', 'duka']
	},
	{
		id: 'ke-con-warranty-2026b',
		title: 'Warranties on electronics and appliances',
		citation: 'Consumer Protection Act, 2012',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Warranties state duration, exclusions, and service centres in writing. Register products and report defects within the window. Keep warranty cards and service job sheets.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['dhamana', 'simu', 'bidhaa']
	},
	{
		id: 'ke-con-phone-verify-2026',
		title: 'Verifying phones before buying',
		citation: 'Consumer and CA guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Check IMEI, box, receipt, and seller identity; test calls, cameras, and charging. Avoid blacklisted or iCloud-locked devices. Keep seller ID and payment proof.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['simu', 'nununua', 'tapeli']
	},
	{
		id: 'ke-con-refurbished-2026',
		title: 'Refurbished phones and laptops',
		citation: 'Consumer Protection Act, 2012',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Sellers must disclose refurbished status, battery health, and warranty length. Get the condition in writing. Keep the disclosure and test results.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['simu', 'kompyuta', 'dhamana']
	},
	{
		id: 'ke-con-bundle-expiry-2026',
		title: 'Expiring data bundles and airtime',
		citation: 'Kenya Information and Communications Act; CA guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Bundle terms on expiry and rollover follow provider terms filed with CA. Complain first to the provider, then CA with reference numbers. Keep purchase messages and complaint tickets.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1998-01-01',
		sw_keywords: ['bando', 'safaricom', 'kulalamika']
	},
	{
		id: 'ke-con-line-register-2026',
		title: 'SIM registration problems',
		citation: 'Kenya Information and Communications Act',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Unregistered or wrongly registered lines face suspension. Register with original ID at authorised agents. Keep registration confirmations.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1998-01-01',
		sw_keywords: ['laini', 'simu', 'sajili']
	},
	{
		id: 'ke-con-kplc-bill-2026',
		title: 'Disputing high electricity bills',
		citation: 'Energy Act, 2019; EPRA guidance',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Compare meter readings with bills, test for faults, and lodge written disputes with meter photos before disconnection. Escalate to EPRA with references. Keep bills and readings.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'token', 'bili']
	},
	{
		id: 'ke-con-token-fail-2026',
		title: 'Failed token purchases',
		citation: 'Energy Act; consumer guidance',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Unreceived tokens after payment are traced with the transaction code, meter number, and time. Report to the vendor and Kenya Power. Keep M-Pesa confirmations.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['token', 'stima', 'mpesa']
	},
	{
		id: 'ke-con-water-bill-2026b',
		title: 'Disputing water bills',
		citation: 'Water Act, 2016',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Test meters, check leaks, and dispute in writing with readings and photos. Pay undisputed amounts to avoid disconnection. Keep bills and plumber reports.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['maji', 'bili', 'kulalamika']
	},
	{
		id: 'ke-con-gas-refill-2026',
		title: 'Cooking gas refills and safety',
		citation: 'Energy Act; KEBS standards',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Refill at licensed dealers, check seals and weights, and keep cylinders upright and ventilated. Report illegal refilling to EPRA. Keep purchase receipts.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['gasi', 'jiko', 'usalama']
	},
	{
		id: 'ke-con-expiry-food-2026b',
		title: 'Expired food on shelves',
		citation: 'Food, Drugs and Chemical Substances Act',
		url: `${K}/akn/ke/act/1965/8`,
		content:
			'Report expired or relabelled food to public health with outlet name, receipt, and photos. Seek care where illness follows. Keep treatment records.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1965-01-01',
		sw_keywords: ['chakula', 'duka', 'tarehe']
	},
	{
		id: 'ke-con-school-fees-refund-2026',
		title: 'School fee refunds on withdrawal',
		citation: 'Basic Education Act; consumer contract terms',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Refunds follow the admission terms and fee policy with written withdrawal notice. Claim in writing with receipts. Keep admission letters and payment records.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'ada', 'pesa']
	},
	{
		id: 'ke-con-gym-2026',
		title: 'Gym and club membership cancellations',
		citation: 'Consumer Protection Act, 2012',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Memberships renew per signed terms with cancellation notice rules. Cancel in writing and stop auto-pay. Keep contracts and cancellation proof.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['gym', 'mkataba', 'kughairi']
	},
	{
		id: 'ke-con-travel-agent-2026',
		title: 'Travel agents and cancelled trips',
		citation: 'Consumer Protection Act; tourism regulation',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Package terms state cancellation tiers and refund timelines. Verify licensing and bookings directly. Keep itineraries, receipts, and cancellation notices.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['safiri', 'tiketi', 'pesa']
	},
	{
		id: 'ke-con-matatu-fare-2026',
		title: 'Matatu overcharging and receipts',
		citation: 'Traffic Act; NTSA passenger guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Fares should match gazetted or displayed rates with ticketing. Report overcharging with route, plate, and time to NTSA and police. Keep tickets and photos.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['matatu', 'nauli', 'beba']
	},
	{
		id: 'ke-con-taxi-app-2026',
		title: 'Ride-hailing disputes and safety',
		citation: 'NTSA transport network guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Screenshot trip details, route, and fare before disputing with the app. Report safety incidents to the app and police. Keep trip records and messages.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['uber', 'bolt', 'safiri']
	},
	{
		id: 'ke-con-furniture-2026',
		title: 'Furniture orders and deposits',
		citation: 'Consumer Protection Act; Sale of Goods Act',
		url: `${K}/akn/ke/act/1930/33`,
		content:
			'Furniture LPOs state design, timber, dimensions, delivery date, and balance terms. Inspect before final payment. Keep designs, receipts, and delivery notes.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['samani', 'fundi', 'amana']
	},
	{
		id: 'ke-con-tailor-2026',
		title: 'Tailor and fundi deposits',
		citation: 'Consumer Protection Act',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Agree fabric, measurements, price, and delivery date in writing with deposit receipts. Breaches are demanded in writing first. Keep samples and messages.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['fundi', 'shona', 'pesa']
	},
	{
		id: 'ke-con-salon-2026',
		title: 'Salon injuries and reactions',
		citation: 'Public Health Act; consumer guidance',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Allergic reactions and burns need prompt care with product names recorded. Complain in writing to the salon and public health. Keep treatment records and product details.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1921-01-01',
		sw_keywords: ['nywele', 'salon', 'jeraha']
	},
	{
		id: 'ke-con-private-hospital-2026',
		title: 'Private hospital billing disputes',
		citation: 'Health Act; consumer guidance',
		url: `${K}/akn/ke/act/2017/21`,
		content:
			'Request itemised bills, compare with admission estimates, and dispute in writing with the accounts office. Escalate to regulators where overcharged. Keep bills and medical reports.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2017-01-01',
		sw_keywords: ['hospitali', 'bili', 'pesa']
	},
	{
		id: 'ke-con-insurance-claim-2026b',
		title: 'Repudiated insurance claims',
		citation: 'Insurance Act, Cap. 487',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Insurers must give written repudiation reasons. Respond with policy, premium proof, and loss evidence, then complain to IRA. Keep claim numbers and correspondence.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'madai', 'pesa']
	},
	{
		id: 'ke-con-bank-charges-2026',
		title: 'Hidden bank charges',
		citation: 'Banking Act; CBK consumer guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Banks must disclose fees; dispute unexplained debits in writing with statements. Escalate to CBK with complaint references. Keep statements and tariff sheets.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['benki', 'pesa', 'gharama']
	},
	{
		id: 'ke-con-loan-app-2026b',
		title: 'Digital lender harassment in collection',
		citation: 'CBK licensing; Data Protection Act',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Abusive calls and contact-list shaming violate licensing and data rules. Report to CBK and ODPC with recordings and messages. Keep loan statements and proof of payments.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2023-01-01',
		sw_keywords: ['mkopo', 'app', 'unyanyasaji']
	},
	{
		id: 'ke-con-betting-2026',
		title: 'Betting payout disputes',
		citation: 'Betting, Lotteries and Gaming Act, Cap. 131',
		url: `${K}/akn/ke/act/1966/16`,
		content:
			'Payout disputes turn on bet slips, terms, and account logs. Complain to the operator then BCLB with records. Keep tickets and transaction histories.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1966-01-01',
		sw_keywords: ['kamari', 'pesa', 'tiketi']
	},
	{
		id: 'ke-con-landlord-shop-2026',
		title: 'Shop goods seized by landlord',
		citation: 'Distress for Rent Act; tenancy guidance',
		url: `${K}/akn/ke/act/1960/8`,
		content:
			'Shop stock attachment must follow distress procedure with inventory. Irregular seizures are challenged urgently in court or tribunal. Keep stock lists and seizure records.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['duka', 'bidhaa', 'kodi']
	},
	{
		id: 'ke-con-counterfeit-2026b',
		title: 'Spotting counterfeit goods',
		citation: 'Anti-Counterfeit Act, 2008; KEBS standards',
		url: `${K}/akn/ke/act/2008/13`,
		content:
			'Check KEBS marks, packaging, and seller authorisation; prices far below market signal fakes. Report to ACA and KEBS with samples. Keep receipts and seller details.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['bandia', 'bidhaa', 'duka']
	},
	{
		id: 'ke-con-car-hire-2026',
		title: 'Car hire damage claims',
		citation: 'Consumer Protection Act; contract terms',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Hire terms state excess, inspection, and fuel rules with pre-hire photos. Inspect jointly on return. Keep the hire agreement and inspection sheets.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['gari', 'kukodisha', 'uharibifu']
	},
	{
		id: 'ke-con-event-tickets-2026',
		title: 'Event cancellations and ticket refunds',
		citation: 'Consumer Protection Act',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Cancelled events trigger refund per promoter terms with timelines. Claim in writing with tickets and payment proof. Keep adverts and cancellation notices.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['tiketi', 'tamasha', 'pesa']
	},
	{
		id: 'ke-con-flight-2026',
		title: 'Delayed flights and lost luggage',
		citation: 'Carriage by Air; consumer guidance',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Report baggage loss immediately at the desk for a PIR, then claim with tags and receipts. Keep boarding passes and the PIR.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ndege', 'safiri', 'mzigo']
	},
	{
		id: 'ke-con-courier-2026',
		title: 'Lost parcels with couriers',
		citation: 'Consumer Protection Act; KICA',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Couriers insure per declared value with tracking. Declare value, keep the waybill, and claim in writing with contents proof. Escalate to CA where ignored.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['parcel', 'kupoteza', 'pesa']
	},
	{
		id: 'ke-con-mechanic-2026',
		title: 'Mechanic overcharging and part swaps',
		citation: 'Consumer Protection Act',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Agree diagnostics, parts, and labour in writing with old parts returned. Dispute in writing with a second quote. Keep job cards and receipts.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['fundi', 'gari', 'pesa']
	},
	{
		id: 'ke-con-mpesa-delay-2026',
		title: 'Delayed M-Pesa to wrong number',
		citation: 'NPS Regulations; provider guidance',
		url: 'https://www.safaricom.co.ke/',
		content:
			'Use reversal channels immediately for wrong sends and never resend to callers pressuring you. Report fraud to the provider and police. Keep transaction codes.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mpesa', 'kutuma', 'pesa']
	},
	{
		id: 'ke-con-airtime-deduct-2026',
		title: 'Unexplained airtime deductions',
		citation: 'KICA; CA consumer guidance',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'Unsubscribed VAS deductions are disputed with the provider for refund and opt-out, then CA. Keep deduction messages and complaint numbers.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1998-01-01',
		sw_keywords: ['krediti', 'safaricom', 'pesa']
	},
	{
		id: 'ke-con-housing-deposit-2026b',
		title: 'House deposits to fake agents',
		citation: 'Penal Code; tenancy guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Verify the house, agent authority, and landlord identity before paying deposits, and receipt to the landlord account. Report fraud with listings and messages. Keep all payment proof.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['nyumba', 'tapeli', 'amana']
	},
	{
		id: 'ke-con-school-transport-2026',
		title: 'School transport safety complaints',
		citation: 'Traffic Act; NTSA school transport rules',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'School vans need licensed drivers, speed governors, and seat belts with vetted crew. Report violations to the school and NTSA with plate and route. Keep fee receipts.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['shule', 'gari', 'usalama']
	},
	{
		id: 'ke-con-kplc-token-2026b',
		title: 'Token meter tampering allegations',
		citation: 'Energy Act, 2019',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Tampering allegations lead to back-billing and disconnection; demand inspection reports and test results in writing. Keep bills, inspection notes, and payment records.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'token', 'faini']
	},
	{
		id: 'ke-con-sacco-dividend-2026',
		title: 'SACCO dividend delays',
		citation: 'SACCO Societies Act, 2008',
		url: `${K}/akn/ke/act/2008/14`,
		content:
			'Dividends follow audited accounts and AGM resolutions with payment schedules. Raise delays with the society in writing, then SASRA. Keep statements and AGM minutes.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['sacco', 'pesa', 'gawio']
	},
	{
		id: 'ke-con-chama-loss-2026',
		title: 'Chama money lost by officials',
		citation: 'General contract; criminal guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Missing chama funds are demanded with contribution records and minutes, then reported as theft or breach. Keep M-Pesa records, minutes, and member lists.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['chama', 'pesa', 'wizi']
	},
	{
		id: 'ke-con-solar-2026',
		title: 'Solar kit pay-as-you-go disputes',
		citation: 'Energy Act; consumer guidance',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Solar PAYG terms state deposit, instalments, and switch-off rules. Confirm warranty and servicing before signing. Keep contracts and payment histories.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2019-01-01',
		sw_keywords: ['sola', 'stima', 'malipo']
	},
	{
		id: 'ke-con-legal-fees-2026',
		title: 'Advocate fee disputes',
		citation: 'Advocates Act, Cap. 16; Remuneration Orders',
		url: `${K}/akn/ke/act/1989/27`,
		content:
			'Fees follow fee schedules and engagement letters with taxation at the High Court where disputed. Ask for written fee notes upfront. Keep engagement letters and bills.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1989-01-01',
		sw_keywords: ['wakili', 'pesa', 'ada']
	},
	{
		id: 'ke-con-fundis-2026b',
		title: 'Unfinished fundi work after deposit',
		citation: 'Consumer Protection Act',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'Demand completion in writing with a deadline before engaging another fundi, then claim the extra cost. Keep quotations, deposit proof, and progress photos.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['fundi', 'pesa', 'kazi']
	},
	{
		id: 'ke-con-cattery-2026',
		title: 'Veterinary negligence and pet loss',
		citation: 'Veterinary Surgeons Act; consumer guidance',
		url: `${K}/akn/ke/act/1954/17`,
		content:
			'Negligent treatment claims need records, bills, and a second opinion. Complain to the practice and the veterinary board. Keep treatment cards and receipts.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1954-01-01',
		sw_keywords: ['mifugo', 'daktari', 'pesa']
	},
	{
		id: 'ke-con-job-scam-2026',
		title: 'Job offer fee scams',
		citation: 'Penal Code; Employment Act',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Legitimate employers never charge placement fees. Verify company registration and offices before paying. Report with adverts, messages, and payment proof.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['kazi', 'tapeli', 'ajira']
	},
	{
		id: 'ke-con-rental earnest-2026',
		title: 'Earnest money for plots and houses',
		citation: 'Contract and land practice guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Earnest payments need written refund, forfeiture, and timeline terms before transfer steps. Pay traceably to verified accounts. Keep agreements and receipts.',
		topic: 'consumer',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['amana', 'ardhi', 'pesa']
	},
	{
		id: 'ke-con-small-claims-shop-2026',
		title: 'Suing a shop in Small Claims Court',
		citation: 'Small Claims Court Act, 2016',
		url: `${K}/akn/ke/act/2016/2`,
		content:
			'Defective-goods claims within the monetary limit file with receipts, warranties, and demand letters at the registry. Confirm current limits before filing. Keep the claim and service copies.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['duka', 'mahakama', 'madai']
	},
	{
		id: 'ke-con-kebs-report-2026b',
		title: 'Reporting to KEBS and ACA',
		citation: 'Standards Act; Anti-Counterfeit Act',
		url: `${K}/akn/ke/act/1973/17`,
		content:
			'Reports attach samples, receipts, and seller details to KEBS for standards and ACA for counterfeits. Keep acknowledgement references for follow-up.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1973-01-01',
		sw_keywords: ['KEBS', 'bandia', 'ripoti']
	},
	{
		id: 'ke-con-ca-complaint-2026b',
		title: 'Escalating telecom complaints to CA',
		citation: 'KICA; CA complaints procedure',
		url: `${K}/akn/ke/act/1998/2`,
		content:
			'After 30-day provider non-resolution, escalate to CA with the provider reference, account, and evidence. Keep every ticket and response.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '1998-01-01',
		sw_keywords: ['safaricom', 'kulalamika', 'CA']
	},
	{
		id: 'ke-con-epra-complaint-2026b',
		title: 'Escalating energy complaints to EPRA',
		citation: 'Energy Act, 2019',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Unresolved distributor complaints escalate to EPRA with meter numbers, bills, and reference history. Keep the full correspondence file.',
		topic: 'consumer',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['stima', 'gasi', 'kulalamika']
	}
];

for (const [t, items] of [
	['succession', succession],
	['land', land],
	['housing', housing],
	['consumer', consumer]
]) {
	const cur = load(t);
	const ids = new Set(cur.map((x) => x.id));
	const fresh = items.filter((x) => !ids.has(x.id));
	save(t, [...cur, ...fresh]);
	console.log(`added ${fresh.length} to ${t}`);
}
