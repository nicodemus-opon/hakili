// Bulk batch 3: debt, traffic, business.
// Run: node scripts/corpus-batch-03.mjs
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

const debt = [
	{
		id: 'ke-debt-demand-reply-2026',
		title: 'Replying to a demand letter',
		citation: 'General civil recovery guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Answer demand letters in writing within the deadline, admitting, disputing, or proposing payment with evidence. Silence invites suit. Keep the letter, reply proof, and payment records.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['deni', 'barua', 'madai']
	},
	{
		id: 'ke-debt-verify-loan-2026',
		title: 'Verifying a loan before paying',
		citation: 'General lending guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Ask for the loan agreement, statements, and computation of balances and penalties before paying alleged arrears. Verify the lender CBK licence. Keep statements and correspondence.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mkopo', 'deni', 'pesa']
	},
	{
		id: 'ke-debt-statute-limit-2026',
		title: 'Limitation periods on debt recovery',
		citation: 'Limitation of Actions Act, Cap. 22',
		url: `${K}/akn/ke/act/1968/21`,
		content:
			'Contract debts generally must be sued within six years, with acknowledgements restarting time. Verify the applicable period with a lawyer early. Keep dated agreements and payment records.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '1968-01-01',
		sw_keywords: ['deni', 'muda', 'mahakama']
	},
	{
		id: 'ke-debt-crb-dispute-2026b',
		title: 'Disputing a wrong CRB listing',
		citation: 'CBK CRB Regulations',
		url: 'https://www.centralbank.go.ke/bank-supervision/',
		content:
			'Request your clearance report, dispute errors in writing with payment proof to the bureau and lender, and escalate to CBK where unresolved. Keep dispute letters and reference numbers.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['CRB', 'mkopo', 'deni']
	},
	{
		id: 'ke-debt-crb-clearance-2026',
		title: 'CRB clearance certificates',
		citation: 'CBK CRB Regulations',
		url: 'https://www.centralbank.go.ke/bank-supervision/',
		content:
			'After clearing arrears, obtain a clearance certificate and confirm bureau updates before applying for loans. Keep settlement letters and clearance copies.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['CRB', 'cheti', 'mkopo']
	},
	{
		id: 'ke-debt-digital-lender-2026',
		title: 'Checking digital lender licences',
		citation: 'CBK (Digital Credit Providers) Regulations, 2022',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Borrow only from CBK-licensed digital lenders with disclosed fees and interest. Verify licensing on CBK lists. Keep screenshots of terms and disbursement messages.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2022-01-01',
		sw_keywords: ['mkopo', 'app', 'leseni']
	},
	{
		id: 'ke-debt-interest-cap-2026',
		title: 'Interest and penalty disclosures',
		citation: 'CBK consumer protection guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Lenders must disclose total cost, penalties, and default consequences upfront. Challenge undisclosed charges in writing. Keep adverts, agreements, and statements.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['riba', 'mkopo', 'pesa']
	},
	{
		id: 'ke-debt-guarantor-call-2026b',
		title: 'Called as a guarantor: steps',
		citation: 'Law of Contract Act, Cap. 23',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Demand the principal statements, default notice, and your guarantee cap before paying. Liability follows the signed guarantee terms. Keep the guarantee and all demand letters.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['mdhamini', 'deni', 'mkopo']
	},
	{
		id: 'ke-debt-logbook-loan-2026b',
		title: 'Logbook loans and repossession',
		citation: 'General lending; Traffic Act guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Logbook lenders register interests and may repossess on default with notice. Read the agreement on valuation and sale. Keep the agreement, statements, and repossession notices.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['logbook', 'mkopo', 'gari']
	},
	{
		id: 'ke-debt-car-repossess-2026',
		title: 'Challenging irregular repossession',
		citation: 'General lending and auction guidance',
		url: `${K}/akn/ke/act/1996/5`,
		content:
			'Repossessions without agreement process, notice, or licensed agents are challengeable with urgent court orders. Note agents, vehicles, and time. Keep the loan file and seizure evidence.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['gari', 'kutaifisha', 'mkopo']
	},
	{
		id: 'ke-debt-auction-notice-2026b',
		title: 'Auction notices and redemption',
		citation: 'Auctioneers Act, Cap. 526',
		url: `${K}/akn/ke/act/1996/5`,
		content:
			'Auctions need proclamation, advertisement, and notice periods; owners may redeem before the fall of the hammer. Verify the auctioneer licence. Keep notices and valuation reports.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '1996-01-01',
		sw_keywords: ['mnada', 'deni', 'mali']
	},
	{
		id: 'ke-debt-shamba-auction-2026',
		title: 'Family land facing auction',
		citation: 'Land Act, 2012; Auctioneers Act',
		url: `${K}/akn/ke/act/2012/6`,
		content:
			'Charged ancestral land auctions attract spousal consent and notice defences. Seek urgent legal help with the charge and notices. Keep title, statements, and sale adverts.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ardhi', 'mnada', 'mkopo']
	},
	{
		id: 'ke-debt-salary-deduction-2026b',
		title: 'Loan deductions from salary limits',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Deductions need written authority within statutory take-home limits. Challenge excess deductions with payroll. Keep deduction forms and payslips.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['mshahara', 'mkopo', 'deni']
	},
	{
		id: 'ke-debt-sacco-guarantor-2026',
		title: 'SACCO guarantor liability',
		citation: 'SACCO Societies Act; Co-operative Societies Act',
		url: `${K}/akn/ke/act/2008/14`,
		content:
			'Guarantors cover defaulted SACCO loans per by-laws and guarantee forms. Request statements and default notices before paying. Keep guarantee forms and payment records.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['sacco', 'mdhamini', 'mkopo']
	},
	{
		id: 'ke-debt-sacco-dividend-attach-2026',
		title: 'SACCO deposits attached for loans',
		citation: 'SACCO Societies Act, 2008',
		url: `${K}/akn/ke/act/2008/14`,
		content:
			'Societies may offset deposits against defaulted loans per by-laws. Reconcile statements and dispute errors in writing. Keep membership statements and offset notices.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2008-01-01',
		sw_keywords: ['sacco', 'pesa', 'deni']
	},
	{
		id: 'ke-debt-helb-repay-2026',
		title: 'HELB repayment and clearance',
		citation: 'Higher Education Loans Board Act',
		url: `${K}/akn/ke/act/1995/3`,
		content:
			'HELB loans accrue per award terms with employer check-off and self-payment options. Request statements and clearance after repaying. Keep award letters and payment records.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '1995-01-01',
		sw_keywords: ['HELB', 'mkopo', 'malipo']
	},
	{
		id: 'ke-debt-helb-penalty-2026',
		title: 'HELB penalties and compliance',
		citation: 'HELB Act; compliance guidance',
		url: `${K}/akn/ke/act/1995/3`,
		content:
			'Default penalties accrue on missed instalments; compliance certificates aid employment clearance. Negotiate catch-up plans in writing. Keep statements and clearance.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1995-01-01',
		sw_keywords: ['HELB', 'faini', 'malipo']
	},
	{
		id: 'ke-debt-kra-debt-2026',
		title: 'KRA tax debt and agency notices',
		citation: 'Tax Procedures Act, 2015',
		url: `${K}/akn/ke/act/2015/29`,
		content:
			'KRA may issue agency notices to banks and debtors for unpaid tax. Object within timelines with returns and payment proof. Keep assessments, objections, and receipts.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['ushuru', 'KRA', 'deni']
	},
	{
		id: 'ke-debt-payment-plan-kra-2026',
		title: 'KRA payment plans',
		citation: 'Tax Procedures Act, 2015',
		url: `${K}/akn/ke/act/2015/29`,
		content:
			'Taxpayers may seek instalment plans with reasons and cash-flow proof. Honour agreed dates to avoid enforcement. Keep the plan letter and payment receipts.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['ushuru', 'KRA', 'malipo']
	},
	{
		id: 'ke-debt-rent-deposit-debt-2026',
		title: 'Rent arrears recovery by landlords',
		citation: 'Tenancy and distress guidance',
		url: `${K}/akn/ke/act/1960/8`,
		content:
			'Landlords recover arrears through demand, distress procedure, or tribunal and court claims with ledgers. Tenants answer with payment proof. Keep ledgers and demands.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['kodi', 'deni', 'nyumba']
	},
	{
		id: 'ke-debt-supplier-debt-2026',
		title: 'Supplier debts and LPO claims',
		citation: 'Sale of Goods Act; contract guidance',
		url: `${K}/akn/ke/act/1930/33`,
		content:
			'Suppliers prove LPOs, delivery notes, and invoices for payment claims. Debtors verify deliveries before paying. Keep the full document chain.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['deni', 'biashara', 'malipo']
	},
	{
		id: 'ke-debt-hospital-bill-2026',
		title: 'Hospital bill payment plans',
		citation: 'Health Act; hospital practice',
		url: `${K}/akn/ke/act/2017/21`,
		content:
			'Hospitals allow written instalment plans against detained documents disputes; detention of bodies over bills is unlawful. Negotiate with itemised bills. Keep bills and plan letters.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2017-01-01',
		sw_keywords: ['hospitali', 'deni', 'bili']
	},
	{
		id: 'ke-debt-school-arrears-2026',
		title: 'School fee arrears and exams',
		citation: 'Basic Education Act, 2013',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'Schools should not bar candidates from exams over arrears; negotiate written plans with the board. Keep fee structures, receipts, and plan letters.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'ada', 'deni']
	},
	{
		id: 'ke-debt-chama-default-2026',
		title: 'Chama loan defaults',
		citation: 'Contract guidance; co-operative practice',
		url: `${K}/akn/ke/act/2012/55`,
		content:
			'Chama defaults follow the constitution with demand, guarantor calls, and mediation. Keep contribution records, minutes, and demand letters.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['chama', 'deni', 'pesa']
	},
	{
		id: 'ke-debt-shylock-2026',
		title: 'Unlicensed shylocks and illegal seizure',
		citation: 'Penal Code; lending guidance',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Seizing household goods or IDs without court process is unlawful even where money is owed. Report forceful seizures to police. Keep loan messages and seizure evidence.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mkopo', 'deni', 'wizi']
	},
	{
		id: 'ke-debt-hire-purchase-default-2026',
		title: 'Hire purchase defaults and repossession',
		citation: 'Hire Purchase Act, Cap. 507',
		url: `${K}/akn/ke/act/1968/42`,
		content:
			'Hirers in default face repossession per the Act with protected-payment rights. Demand statements and notices before surrender. Keep the agreement and payment receipts.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '1968-01-01',
		sw_keywords: ['mkopo', 'malipo', 'kutaifisha']
	},
	{
		id: 'ke-debt-credit-card-2026',
		title: 'Credit card debt and statements',
		citation: 'Banking Act; CBK guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Reconcile interest, fees, and minimum dues on statements monthly. Dispute errors in writing with the bank. Keep statements and dispute references.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['benki', 'deni', 'kadi']
	},
	{
		id: 'ke-debt-overdraft-2026',
		title: 'Overdrafts and bounced cheques',
		citation: 'Banking practice; Penal Code on fraud',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Unauthorised overdrafts attract fees; knowingly issuing bad cheques risks prosecution. Regularise limits in writing. Keep mandates and correspondence.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['benki', 'deni', 'hundi']
	},
	{
		id: 'ke-debt-sued-small-2026',
		title: 'Sued for debt in Small Claims Court',
		citation: 'Small Claims Court Act, 2016',
		url: `${K}/akn/ke/act/2016/2`,
		content:
			'Small debts file with agreements, statements, and demand letters for faster hearing. Defend with payment proof before the date. Keep pleadings and receipts.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2016-01-01',
		sw_keywords: ['deni', 'mahakama', 'madai']
	},
	{
		id: 'ke-debt-sued-magistrate-2026',
		title: 'Sued for debt in Magistrates Court',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Larger debts file as civil suits with plaints and supporting documents. File a defence within timelines. Keep service documents and hearing notices.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['deni', 'mahakama', 'kesi']
	},
	{
		id: 'ke-debt-judgment-debtor-2026',
		title: 'After judgment: paying by instalments',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Judgment debtors may apply to pay by instalments with income evidence. Honour orders to avoid execution. Keep the decree and payment records.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['deni', 'mahakama', 'malipo']
	},
	{
		id: 'ke-debt-attachment-2026',
		title: 'Attachment of salary or property',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Execution attaches salary or goods through court warrants with notice. Challenge irregular execution promptly. Keep warrants, notices, and payment proof.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['mshahara', 'deni', 'mahakama']
	},
	{
		id: 'ke-debt-bankruptcy-2026b',
		title: 'Bankruptcy as a last resort',
		citation: 'Insolvency Act, 2015',
		url: `${K}/akn/ke/act/2015/18`,
		content:
			'Bankruptcy writes down debts but restricts credit, travel, and offices for years. Get advice before petitioning. Keep creditor lists and asset records.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kufilisika', 'deni', 'mahakama']
	},
	{
		id: 'ke-debt-company-admin-2026b',
		title: 'Administration for struggling companies',
		citation: 'Insolvency Act, 2015',
		url: `${K}/akn/ke/act/2015/18`,
		content:
			'Administration protects viable companies while rescuing or winding down with practitioner control. Directors act fast on advice. Keep management accounts and creditor lists.',
		topic: 'debt',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kampuni', 'deni', 'kufilisika']
	},
	{
		id: 'ke-debt-negotiate-waiver-2026',
		title: 'Negotiating penalty waivers',
		citation: 'Lending practice guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Seek written waivers of penalties with lump-sum offers and hardship proof. Record any deal before paying. Keep offer letters and settlement receipts.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['deni', 'msamaha', 'malipo']
	},
	{
		id: 'ke-debt-acknowledge-2026',
		title: 'Acknowledging debt without restarting time',
		citation: 'Limitation of Actions Act',
		url: `${K}/akn/ke/act/1968/21`,
		content:
			'Careless acknowledgements can restart limitation. Mark payments as without prejudice where advised and get counsel before signing. Keep advice notes.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1968-01-01',
		sw_keywords: ['deni', 'barua', 'mahakama']
	},
	{
		id: 'ke-debt-fraud-loan-2026',
		title: 'Loans taken in your name by fraud',
		citation: 'Computer Misuse and Cybercrimes Act; Penal Code',
		url: `${K}/akn/ke/act/2018/5`,
		content:
			'Report fraudulent loans to the lender, CRB, and DCI with affidavits and IDs. Dispute the debts in writing. Keep affidavits, OB numbers, and dispute letters.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2018-01-01',
		sw_keywords: ['tapeli', 'mkopo', 'wizi']
	},
	{
		id: 'ke-debt-mpesa-loan-2026',
		title: 'M-Shwari, KCB M-Pesa and Fuliza arrears',
		citation: 'CBK digital credit guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Telco-bank overdrafts deduct from wallets on receipt; statements show balances and fees. Clear actively to protect CRB standing. Keep statements and repayment confirmations.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mpesa', 'mkopo', 'fuliza']
	},
	{
		id: 'ke-debt-tala-branch-2026',
		title: 'Tala, Branch and app loan disputes',
		citation: 'CBK digital credit guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Dispute balances with in-app statements, disbursement proof, and repayment records. Escalate unresolved cases to CBK. Keep screenshots and references.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mkopo', 'app', 'deni']
	},
	{
		id: 'ke-debt-employer-loan-exit-2026',
		title: 'Employer loans on resignation',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Employer advances are set off against final dues with itemised statements within deduction limits. Demand the computation. Keep loan forms and clearance records.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2008-06-02',
		sw_keywords: ['mkopo', 'kazi', 'malipo']
	},
	{
		id: 'ke-debt-landlord-deposit-debt-2026',
		title: 'Deposit set-off against rent arrears',
		citation: 'Tenancy practice guidance',
		url: `${K}/akn/ke/act/1959/35`,
		content:
			'Deposits may be set off against proven arrears or damage with an itemised statement, not blanket forfeiture. Challenge unsupported deductions. Keep ledgers and statements.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['amana', 'kodi', 'deni']
	},
	{
		id: 'ke-debt-mobile-blacklist-2026',
		title: 'Blacklisting threats by lenders',
		citation: 'CBK and data protection guidance',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Threatening messages should be verified against actual bureau status; listing needs notice. Dispute wrongful listings. Keep messages and bureau reports.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['CRB', 'vitisho', 'mkopo']
	},
	{
		id: 'ke-debt-court-annexed-mediation-debt-2026',
		title: 'Mediating debt disputes',
		citation: 'Court-annexed mediation guidance',
		url: `${K}/akn/ke/act/1995/4`,
		content:
			'Courts may refer debt cases to mediation for structured repayment consent orders. Prepare income and creditor schedules. Keep mediation agreements.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1995-01-01',
		sw_keywords: ['patanisho', 'deni', 'mahakama']
	},
	{
		id: 'ke-debt-instalment-order-2026',
		title: 'Instalment orders after judgment',
		citation: 'Civil Procedure Act',
		url: `${K}/akn/ke/act/1924/3`,
		content:
			'Courts set monthly instalments on income evidence where lump payment is impossible. Apply with budgets and proof. Keep the order and payment receipts.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1924-01-01',
		sw_keywords: ['deni', 'malipo', 'mahakama']
	},
	{
		id: 'ke-debt-harambee-pledge-2026',
		title: 'Harambee pledges as debts',
		citation: 'General contract guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Public pledges can be enforceable depending on reliance and wording. Honour or renegotiate in writing. Keep pledge records and communications.',
		topic: 'debt',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['harambee', 'ahadi', 'deni']
	},
	{
		id: 'ke-debt-legal-aid-debt-2026',
		title: 'Legal aid for auction threats',
		citation: 'Legal Aid Act, 2016',
		url: `${K}/akn/ke/act/2016/6`,
		content:
			'Borrowers facing auction of homes or tools of trade can seek NLAS help with loan files and notices. The toll-free line is 0800 720 640. Keep statements and sale adverts.',
		topic: 'debt',
		source_type: 'ngo',
		effective_date: '2016-01-01',
		sw_keywords: ['msaada', 'mnada', 'deni']
	}
];

const traffic = [
	{
		id: 'ke-traf-licence-classes-2026',
		title: 'Driving licence classes in Kenya',
		citation: 'Traffic Act, Cap. 403; NTSA guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Licences are classed by vehicle type with tests, medicals, and renewals per class. Drive only the endorsed class. Keep the licence, test records, and renewal receipts.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['leseni', 'dereva', 'NTSA']
	},
	{
		id: 'ke-traf-smart-dl-2026',
		title: 'Smart driving licence applications',
		citation: 'NTSA licensing guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Smart licences apply through NTSA with biometrics, medical, and fees. Book early and track the application. Keep booking slips and payment receipts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['leseni', 'NTSA', 'dereva']
	},
	{
		id: 'ke-traf-renewal-2026',
		title: 'Renewing driving licences',
		citation: 'Traffic Act; NTSA guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Renew before expiry through NTSA channels to avoid penalties and enforcement. Keep renewal receipts with the licence.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['leseni', 'NTSA', 'kusasisha']
	},
	{
		id: 'ke-traf-duplicate-dl-2026',
		title: 'Replacing a lost driving licence',
		citation: 'NTSA guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Lost licences need police abstract, application, and fees for replacement. Report loss promptly. Keep the abstract and application receipts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['leseni', 'kupoteza', 'polisi']
	},
	{
		id: 'ke-traf-speed-limits-2026',
		title: 'Speed limits and cameras',
		citation: 'Traffic Act; speed rules',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Limits vary by road class and vehicle type with camera and NTSA enforcement. Fines and licence action follow readings. Keep the charge sheet and calibration queries for counsel.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['mwendo', 'faini', 'polisi']
	},
	{
		id: 'ke-traf-alcokit-2026',
		title: 'Drink-driving breath tests',
		citation: 'Traffic Act, Cap. 403',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Officers may require breath or blood tests where drink-driving is suspected. Refusal has legal consequences. Seek counsel early and note testing details.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['pombe', 'dereva', 'polisi']
	},
	{
		id: 'ke-traf-careless-2026',
		title: 'Careless and dangerous driving charges',
		citation: 'Traffic Act, Cap. 403',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Charges grade from careless to dangerous with fines, licence consequences, and jail terms. Defences turn on road evidence and witnesses. Keep scene photos and charge sheets.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['ajali', 'dereva', 'mahakama']
	},
	{
		id: 'ke-traf-obstruction-2026',
		title: 'Obstruction and illegal parking',
		citation: 'Traffic Act; county by-laws',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Obstructing traffic or parking illegally attracts fines, clamping, and towing. Pay through official channels with receipts. Keep the ticket and payment proof.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['park', 'faini', 'gari']
	},
	{
		id: 'ke-traf-tow-2026',
		title: 'Towed vehicles: recovery steps',
		citation: 'County and NTSA enforcement guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Locate the yard, verify the offence and fees, pay officially, and inspect for damage before leaving. Keep the ticket, payment receipts, and yard records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['kutaifisha', 'gari', 'faini']
	},
	{
		id: 'ke-traf-accident-first-2026',
		title: 'First steps after any accident',
		citation: 'Traffic Act; first-aid guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Secure the scene, help the injured, call emergency services, and exchange details. Do not admit liability at the roadside. Keep photos, plates, and witness contacts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['ajali', 'polisi', 'bima']
	},
	{
		id: 'ke-traf-injury-claim-2026b',
		title: 'Third-party injury claims',
		citation: 'Insurance (Motor Vehicle Third Party Risks) Act',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Injury claims need police abstract, P3 and medical reports, expense receipts, and lost-income proof within limitation periods. Start early with counsel. Keep every bill.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1985-01-01',
		sw_keywords: ['ajali', 'jeraha', 'bima']
	},
	{
		id: 'ke-traf-death-claim-2026',
		title: 'Fatal accident claims by dependants',
		citation: 'Fatal Accidents Act; Law Reform Act',
		url: `${K}/akn/ke/act/1946/9`,
		content:
			'Dependants claim lost support with death, dependency, and income evidence. File within limitation with grant and records. Keep OB, post-mortem, and income proof.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1946-01-01',
		sw_keywords: ['ajali', 'kifo', 'fidia']
	},
	{
		id: 'ke-traf-passenger-2026',
		title: 'Passenger rights after accidents',
		citation: 'Insurance Act; carrier liability guidance',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Passengers claim against the at-fault vehicle cover with tickets, treatment records, and the abstract. Record the plate and SACCO. Keep fare proof and medical files.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['abiria', 'ajali', 'bima']
	},
	{
		id: 'ke-traf-pedestrian-2026',
		title: 'Pedestrian knock-down claims',
		citation: 'Insurance Act; Traffic Act',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Pedestrian claims need the abstract, treatment records, and witness details with the offending plate. Report promptly. Keep every medical receipt.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['mtembea', 'ajali', 'gari']
	},
	{
		id: 'ke-traf-cyclist-2026',
		title: 'Cyclist and motorbike rider claims',
		citation: 'Insurance Act; Traffic Act',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Rider claims follow the same abstract, P3, and medical evidence chain with helmet and licence context. Keep repair estimates and treatment records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['baiskeli', 'ajali', 'bima']
	},
	{
		id: 'ke-traf-inspection-2026b',
		title: 'Motor vehicle inspection bookings',
		citation: 'Traffic Act; NTSA inspection guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Commercial and PSV vehicles undergo periodic inspection for roadworthiness with stickers. Book early with registration documents. Keep inspection reports and stickers.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['ukaguzi', 'NTSA', 'gari']
	},
	{
		id: 'ke-traf-psv-licence-2026b',
		title: 'PSV licensing and SACCO membership',
		citation: 'NTSA PSV regulations',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'PSVs need operator licences, SACCO or company affiliation, and compliant crew with badges. Verify documents before investing. Keep licences and agreements.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['matatu', 'SACCO', 'NTSA']
	},
	{
		id: 'ke-traf-boda-register-2026',
		title: 'Boda boda registration and stages',
		citation: 'NTSA motorcycle regulations',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Riders need licences, protective gear, and stage registration with SACCO or association records. Keep licences, stage cards, and payment records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['boda', 'pikipiki', 'leseni']
	},
	{
		id: 'ke-traf-tuktuk-2026',
		title: 'Tuk-tuk operating requirements',
		citation: 'NTSA three-wheeler guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Tuk-tuks need registration, inspection, insurance, and licensed drivers on authorised routes. Keep permits and fee receipts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['tuktuk', 'leseni', 'NTSA']
	},
	{
		id: 'ke-traf-school-van-2026b',
		title: 'School transport compliance',
		citation: 'NTSA school transport regulations',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'School vans need yellow paint, speed governors, attendants, and vetted drivers with no overloading. Report violations with photos. Keep contracts and fee receipts.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['shule', 'gari', 'usalama']
	},
	{
		id: 'ke-traf-overload-2026',
		title: 'Overloading fines',
		citation: 'Traffic Act; axle load rules',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Overloaded lorries face weighbridge fines and offloading with owner and driver liability. Verify load sheets. Keep weighbridge tickets and charge sheets.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['mzigo', 'lori', 'faini']
	},
	{
		id: 'ke-traf-helmet-2026',
		title: 'Helmet and safety gear offences',
		citation: 'Traffic Act; motorcycle rules',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Riders and passengers must wear standard helmets with reflective gear at night. Fines follow non-compliance. Keep receipts for compliant gear.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['helmet', 'boda', 'faini']
	},
	{
		id: 'ke-traf-seatbelt-2026',
		title: 'Seat belt offences',
		citation: 'Traffic Act',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Drivers and passengers must wear belts where fitted. Fines apply per occupant. Keep the charge sheet where disputing fitting or use.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['mkanda', 'gari', 'faini']
	},
	{
		id: 'ke-traf-phone-driving-2026',
		title: 'Phone use while driving',
		citation: 'Traffic Act',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Holding a phone while driving attracts fines and licence action. Use hands-free mounts. Keep the ticket where disputing the facts.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['simu', 'dereva', 'faini']
	},
	{
		id: 'ke-traf-unlicensed-2026',
		title: 'Driving without a licence',
		citation: 'Traffic Act, Cap. 403',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Driving unlicensed or outside the endorsed class risks fines, vehicle detention, and insurance repudiation. Get the correct class before driving. Keep test and licence records.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['leseni', 'dereva', 'faini']
	},
	{
		id: 'ke-traf-uninsured-2026',
		title: 'Driving without insurance',
		citation: 'Insurance Act; Traffic Act',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Every public-road vehicle needs at least third-party cover; driving uninsured risks fines, impound, and personal liability. Keep the cover note and policy.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'gari', 'faini']
	},
	{
		id: 'ke-traf-fake-insurance-2026',
		title: 'Fake insurance stickers',
		citation: 'Insurance Act; IRA guidance',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Verify stickers with the insurer and IRA before driving off. Fake cover voids claims. Keep verification messages and policy documents.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'bandia', 'gari']
	},
	{
		id: 'ke-traf-claim-notify-2026',
		title: 'Notifying insurers after accidents',
		citation: 'Insurance Act; policy conditions',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Notify the insurer promptly with abstract, photos, and estimates per policy timelines. Late notice risks repudiation. Keep claim numbers and submission receipts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'ajali', 'madai']
	},
	{
		id: 'ke-traf-assessor-2026',
		title: 'Insurance assessors and repairs',
		citation: 'Insurance practice guidance',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Assessors inspect and approve repair estimates; do not authorise repairs before approval except to secure the vehicle. Keep estimates, approvals, and garage invoices.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'gari', 'ukarabati']
	},
	{
		id: 'ke-traf-writeoff-2026',
		title: 'Total loss and write-off settlements',
		citation: 'Insurance practice guidance',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Write-offs settle on market value less excess and salvage per policy. Compare valuations before accepting. Keep valuation reports and settlement letters.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'gari', 'fidia']
	},
	{
		id: 'ke-traf-own-damage-2026',
		title: 'Own-damage (comprehensive) claims',
		citation: 'Insurance policy guidance',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Comprehensive claims need the policy schedule, abstract, and repair evidence with excess deducted. Confirm exclusions like drink-driving. Keep the full claim file.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'gari', 'madai']
	},
	{
		id: 'ke-traf-political-convoy-2026',
		title: 'Accidents with convoys and GK vehicles',
		citation: 'Traffic Act; government claims guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Record plate, unit markings, time, and witnesses, then report to police for abstract processing. Claims follow government procedure. Keep OB and treatment records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['ajali', 'polisi', 'gari']
	},
	{
		id: 'ke-traf-nduthi-loan-2026',
		title: 'Boda loans and repossession',
		citation: 'Hire purchase and lending guidance',
		url: `${K}/akn/ke/act/1968/42`,
		content:
			'Boda hire-purchase needs statements, instalment proof, and repossession notices. Demand the arrears figure in writing. Keep agreements and payment records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1968-01-01',
		sw_keywords: ['boda', 'mkopo', 'malipo']
	},
	{
		id: 'ke-traf-sale-agreement-2026b',
		title: 'Motor sale agreements checklist',
		citation: 'Law of Contract; Traffic Act',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Agreements record IDs, registration, engine and chassis numbers, price, schedule, and handover with witnesses. Both sides sign. Keep copies and payment receipts.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1960-01-01',
		sw_keywords: ['kuuza', 'gari', 'mkataba']
	},
	{
		id: 'ke-traf-tims-transfer-2026b',
		title: 'TIMS transfer step by step',
		citation: 'NTSA TIMS guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'The seller initiates transfer, the buyer accepts, fees are paid officially, and a new logbook issues. Both need eCitizen and TIMS accounts. Keep sale, payment, ID, and receipt records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['logbook', 'NTSA', 'kuuza']
	},
	{
		id: 'ke-traf-number-plate-2026b',
		title: 'Number plate verification',
		citation: 'Traffic Act; NTSA guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Plates must match the logbook and TIMS record, properly fixed and unobscured. Mismatches signal fraud. Keep plate photos and the search result.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['namba', 'gari', 'NTSA']
	},
	{
		id: 'ke-traf-chassis-2026',
		title: 'Chassis and engine number checks',
		citation: 'NTSA inspection guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Compare physical stampings with the logbook and TIMS; tampering voids the deal. Walk away where the seller resists verification. Keep search and inspection notes.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['gari', 'NTSA', 'uthibitisho']
	},
	{
		id: 'ke-traf-duty-verify-2026',
		title: 'Duty verification for imports',
		citation: 'EAC Customs Management Act; KRA guidance',
		url: `${K}/akn/aa-eac/act/2004/1`,
		content:
			'Ask for import entries and duty receipts and verify registration before paying. Unpaid duty cars face seizure. Keep import and TIMS records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2004-01-01',
		sw_keywords: ['ushuru', 'gari', 'KRA']
	},
	{
		id: 'ke-traf-accident-p3-2026b',
		title: 'P3 forms after road injuries',
		citation: 'NPS and health guidance',
		url: `${K}/akn/ke/act/2011/11a`,
		content:
			'Police issue P3 forms for medical documentation of road injuries. Complete promptly and return to investigators. Keep hospital notes and OB numbers.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2011-01-01',
		sw_keywords: ['P3', 'ajali', 'hospitali']
	},
	{
		id: 'ke-traf-cash-bail-2026',
		title: 'Cash bail at traffic stops',
		citation: 'Criminal procedure; police standing orders',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Minor traffic offences may attract cash bail with official receipts and a court date. Demand a receipt for any payment. Keep the bail receipt and charge sheet.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['dhamana', 'faini', 'polisi']
	},
	{
		id: 'ke-traf-court-plea-2026',
		title: 'Pleading in traffic court',
		citation: 'Criminal Procedure Code',
		url: `${K}/akn/ke/act/1930/11`,
		content:
			'Understand the charge, consider plea options with counsel, and bring licence, insurance, and inspection documents. Keep the charge sheet and hearing dates.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['mahakama', 'faini', 'dereva']
	},
	{
		id: 'ke-traf-fine-payment-2026',
		title: 'Paying traffic fines officially',
		citation: 'Judiciary fines guidance',
		url: 'https://efiling.court.go.ke/',
		content:
			'Pay fines through official court and government channels with receipts, never cash to individuals. Keep the ticket, receipt, and case reference.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['faini', 'malipo', 'mahakama']
	},
	{
		id: 'ke-traf-licence-endorse-2026',
		title: 'Licence endorsement and suspension',
		citation: 'Traffic Act',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Repeat offences attract endorsements and suspension with hearing rights. Defend with records and counsel. Keep offence history and hearing notices.',
		topic: 'traffic',
		source_type: 'legislation',
		effective_date: '1953-01-01',
		sw_keywords: ['leseni', 'dereva', 'faini']
	},
	{
		id: 'ke-traf-hit-run-2026b',
		title: 'Hit-and-run: victim steps',
		citation: 'Traffic Act; Penal Code',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Get care, report immediately, and preserve dashcam, CCTV, fragments, and witness details. Do not chase dangerously. Keep OB and treatment records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['ajali', 'kutoroka', 'polisi']
	},
	{
		id: 'ke-traf-drunk-passenger-2026',
		title: 'Passengers and drink-driving liability',
		citation: 'Traffic Act guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Passengers should avoid drunk drivers and report dangerous driving; owners face liability for entrusting vehicles. Keep trip and report records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['pombe', 'abiria', 'usalama']
	},
	{
		id: 'ke-traf-lorry-turnboy-2026',
		title: 'Turnboys and loader injuries',
		citation: 'Work Injury Benefits Act; Traffic Act',
		url: `${K}/akn/ke/act/2007/13`,
		content:
			'Loader injuries need incident reports, treatment records, and employer compensation filings. Keep employment proof and medical files.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2007-01-01',
		sw_keywords: ['lori', 'jeraha', 'kazi']
	},
	{
		id: 'ke-traf-taxi-licence-2026',
		title: 'Taxi licensing basics',
		citation: 'NTSA transport guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Taxis need registration, inspection, insurance, and licensed drivers with fare transparency. Keep permits and inspection records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['teksi', 'leseni', 'NTSA']
	},
	{
		id: 'ke-traf-driving-school-2026',
		title: 'Choosing a driving school',
		citation: 'NTSA driving school regulations',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Train at NTSA-licensed schools with written fees, lessons, and test booking terms. Keep receipts and training records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['shule', 'leseni', 'dereva']
	},
	{
		id: 'ke-traf-test-booking-2026',
		title: 'Driving test bookings',
		citation: 'NTSA testing guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Tests book through NTSA with ID, training proof, and fees. Prepare documents and practise the route. Keep booking slips and results.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['mtihani', 'leseni', 'NTSA']
	},
	{
		id: 'ke-traf-foreign-dl-2026',
		title: 'Foreign licences in Kenya',
		citation: 'Traffic Act; NTSA guidance',
		url: `${K}/akn/ke/act/1953/39`,
		content:
			'Visitors drive on valid foreign or international permits within allowed periods; residents convert to Kenyan licences. Keep permits and entry records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '1953-01-01',
		sw_keywords: ['leseni', 'mgeni', 'dereva']
	},
	{
		id: 'ke-traf-new-car-2026',
		title: 'New car registration (scratch to plates)',
		citation: 'NTSA registration guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Dealers handle KRA duty, registration, and plates with logbook processing. Verify TIMS records before driving off. Keep sale, duty, and registration records.',
		topic: 'traffic',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['gari', 'NTSA', 'sajili']
	}
];

const business = [
	{
		id: 'ke-biz-idea-validate-2026',
		title: 'Validating a business idea in Kenya',
		citation: 'MSE Act, 2012; business practice',
		url: `${K}/akn/ke/act/2012/55`,
		content:
			'Test demand, pricing, and costs with small pilots before registering or borrowing. Survey customers and track margins. Keep pilot sales and expense records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['biashara', 'wazo', 'pesa']
	},
	{
		id: 'ke-biz-name-search-2026',
		title: 'Name search and reservation on BRS',
		citation: 'Business Registration Service Act, 2015',
		url: `${K}/akn/ke/act/2015/15`,
		content:
			'Reserve the business name on BRS through eCitizen with alternatives and fees. Approval precedes registration. Keep the reservation and payment receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['jina', 'biashara', 'sajili']
	},
	{
		id: 'ke-biz-permit-2026b',
		title: 'Single business permit renewals',
		citation: 'County Governments Act; county finance acts',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Renew the county permit annually before expiry with the fee for the business size and zone. Display the licence. Keep yearly licences and receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['leseni', 'kaunti', 'biashara']
	},
	{
		id: 'ke-biz-fire-cert-2026',
		title: 'Fire clearance for business premises',
		citation: 'County fire safety by-laws',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Premises handling crowds, fuel, or kitchens need fire inspection and certificates with extinguishers. Book inspection early. Keep certificates and inspection reports.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['moto', 'leseni', 'biashara']
	},
	{
		id: 'ke-biz-food-licence-2026',
		title: 'Food business licences and medicals',
		citation: 'Public Health Act; Food and Drugs Act',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Food handlers need medical certificates with premises meeting hygiene standards. Renew medicals periodically. Keep certificates and inspection reports.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1921-01-01',
		sw_keywords: ['chakula', 'leseni', 'afya']
	},
	{
		id: 'ke-biz-kebs-mark-2026',
		title: 'KEBS standardisation marks for products',
		citation: 'Standards Act, Cap. 496',
		url: `${K}/akn/ke/act/1973/17`,
		content:
			'Manufactured goods need KEBS certification and marks before sale with factory inspection. Apply with samples and labels. Keep certificates and test reports.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1973-01-01',
		sw_keywords: ['KEBS', 'bidhaa', 'biashara']
	},
	{
		id: 'ke-biz-epra-petrol-2026',
		title: 'Petrol station licensing',
		citation: 'Energy Act, 2019; EPRA licensing',
		url: `${K}/akn/ke/act/2019/1`,
		content:
			'Fuel retail needs EPRA licences with safety, calibration, and environmental compliance. Apply with site plans. Keep licences and calibration records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['petroli', 'leseni', 'biashara']
	},
	{
		id: 'ke-biz-liquor-apply-2026',
		title: 'Applying for liquor licences',
		citation: 'Alcoholic Drinks Control Act; county laws',
		url: `${K}/akn/ke/act/2010/4`,
		content:
			'Outlets apply for national and county licences with premises, hours, and location vetting. Renew before expiry. Keep licences displayed and renewal receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2010-01-01',
		sw_keywords: ['pombe', 'leseni', 'duka']
	},
	{
		id: 'ke-biz-tobacco-2026',
		title: 'Tobacco retail rules',
		citation: 'Tobacco Control Act, 2007',
		url: `${K}/akn/ke/act/2007/4`,
		content:
			'Tobacco sales face display, advertising, and smoke-free zone restrictions with age limits. Train staff on compliance. Keep supplier invoices and licences.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2007-01-01',
		sw_keywords: ['sigara', 'duka', 'sheria']
	},
	{
		id: 'ke-biz-pharmacy-2026',
		title: 'Opening a pharmacy or chemist',
		citation: 'Pharmacy and Poisons Act, Cap. 244',
		url: `${K}/akn/ke/act/1957/7`,
		content:
			'Chemists need superintending pharmacists and Pharmacy and Poisons Board licensing with controlled storage. Apply with premises plans. Keep licences and prescription records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1957-01-01',
		sw_keywords: ['dawa', 'duka', 'leseni']
	},
	{
		id: 'ke-biz-agrovet-2026',
		title: 'Agrovet shop requirements',
		citation: 'Pest Control Products Act; veterinary guidance',
		url: `${K}/akn/ke/act/1982/17`,
		content:
			'Agrovets need trained staff and board licensing with safe storage of chemicals. Verify supplier authorisation. Keep licences and stock records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1982-01-01',
		sw_keywords: ['duka', 'kilimo', 'leseni']
	},
	{
		id: 'ke-biz-mpesa-agent-2026',
		title: 'M-Pesa agency: float and fraud',
		citation: 'CBK agency and NPS guidance',
		url: 'https://www.safaricom.co.ke/',
		content:
			'Agents manage float, tills, and ID verification with CCTV and receipting to deter fraud. Reconcile daily. Keep float records and incident reports.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['mpesa', 'wakala', 'biashara']
	},
	{
		id: 'ke-biz-pos-2026',
		title: 'POS machines and settlement',
		citation: 'NPS Regulations; bank practice',
		url: 'https://www.centralbank.go.ke/',
		content:
			'Card settlements need provider contracts with fee and settlement timelines. Reconcile daily batches. Keep contracts and settlement reports.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['kadi', 'malipo', 'biashara']
	},
	{
		id: 'ke-biz-etims-exempt-2026',
		title: 'eTIMS exemptions and thresholds',
		citation: 'Tax Procedures Act; VAT Act',
		url: 'https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system',
		content:
			'Confirm current eTIMS onboarding bands and exemptions on KRA guidance before trading without invoices. Keep the KRA determination and sales records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2023-01-01',
		sw_keywords: ['KRA', 'risiti', 'ushuru']
	},
	{
		id: 'ke-biz-withholding-2026',
		title: 'Withholding tax on suppliers',
		citation: 'Income Tax Act; Tax Procedures Act',
		url: `${K}/akn/ke/act/1973/16`,
		content:
			'Payers deduct withholding on rents, professional fees, and imports per schedules and remit with certificates. Issue certificates to payees. Keep deduction records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1973-01-01',
		sw_keywords: ['ushuru', 'KRA', 'malipo']
	},
	{
		id: 'ke-biz-payroll-taxes-2026b',
		title: 'Payroll taxes checklist for employers',
		citation: 'Income Tax Act; SHIF, NSSF, AHL laws',
		url: `${K}/akn/ke/act/1973/16`,
		content:
			'Remit PAYE, SHIF, NSSF, and housing levy per payroll calendars with returns. Late remittance attracts penalties. Keep payroll and remittance receipts together.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2024-01-01',
		sw_keywords: ['mshahara', 'ushuru', 'KRA']
	},
	{
		id: 'ke-biz-annual-returns-2026',
		title: 'Company annual returns on BRS',
		citation: 'Companies Act, 2015',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'Companies file annual returns with current directors, shares, and registered office. Late filing attracts penalties. Keep filing receipts and registers.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kampuni', 'sajili', 'ripoti']
	},
	{
		id: 'ke-biz-beneficial-2026',
		title: 'Beneficial ownership register',
		citation: 'Companies Act, 2015',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'Companies maintain beneficial ownership records of significant controllers with BRS filings. Update on share changes. Keep registers and filing receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kampuni', 'umiliki', 'sajili']
	},
	{
		id: 'ke-biz-director-change-2026',
		title: 'Changing directors or address',
		citation: 'Companies Act, 2015',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'File director, secretary, and address changes on BRS with resolutions within timelines. Keep minutes and filing receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['kampuni', 'wakurugenzi', 'sajili']
	},
	{
		id: 'ke-biz-share-transfer-2026',
		title: 'Transferring company shares',
		citation: 'Companies Act, 2015',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'Share transfers use transfer forms, board approval, stamp duty, and register updates. Keep transfer forms, duty receipts, and updated registers.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['hisa', 'kampuni', 'kuuza']
	},
	{
		id: 'ke-biz-partnership-deed-2026b',
		title: 'Partnership deed essentials',
		citation: 'Partnership Act, 2012',
		url: `${K}/akn/ke/act/2012/16`,
		content:
			'Deeds record capital, profit sharing, signatories, drawings, and exit terms with dispute clauses. Sign before trading. Keep the deed and contribution records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2012-01-01',
		sw_keywords: ['ushirika', 'biashara', 'mkataba']
	},
	{
		id: 'ke-biz-chama-constitute-2026',
		title: 'Chama constitution essentials',
		citation: 'Community groups registration guidance',
		url: `${K}/akn/ke/act/2012/55`,
		content:
			'Constitutions state membership, contributions, leadership, loans, and dispute handling with meeting rules. Register where opening accounts. Keep minutes and ledgers.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['chama', 'pesa', 'mkutano']
	},
	{
		id: 'ke-biz-tender-search-2026',
		title: 'Finding public tenders',
		citation: 'Public Procurement Act, 2015; PPRA guidance',
		url: `${K}/akn/ke/act/2015/33`,
		content:
			'Track tenders on the PPRA portal and supplier registration with AGPO certificates where eligible. Meet submission formats strictly. Keep registration and bid receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['tenda', 'serikali', 'biashara']
	},
	{
		id: 'ke-biz-tender-bid-2026',
		title: 'Bidding compliantly for tenders',
		citation: 'Public Procurement Act, 2015',
		url: `${K}/akn/ke/act/2015/33`,
		content:
			'Bids need tax compliance, business permits, CR12, and technical sheets in sealed formats by the deadline. Late bids are rejected. Keep submission receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['tenda', 'zabuni', 'biashara']
	},
	{
		id: 'ke-biz-agpo-2026',
		title: 'AGPO certificates for youth, women, PWDs',
		citation: 'Public Procurement Act; AGPO guidance',
		url: `${K}/akn/ke/act/2015/33`,
		content:
			'AGPO reserves tenders for youth, women, and persons with disabilities with renewable certificates. Apply with IDs and business records. Keep certificates and renewal dates.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['tenda', 'vijana', 'biashara']
	},
	{
		id: 'ke-biz-tender-dispute-2026b',
		title: 'Challenging tender awards',
		citation: 'Public Procurement Act; Review Board',
		url: `${K}/akn/ke/act/2015/33`,
		content:
			'Aggrieved bidders seek administrative review within short standstill timelines with bid and award records. Act immediately. Keep award notices and review filings.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2015-01-01',
		sw_keywords: ['tenda', 'pingamizi', 'mahakama']
	},
	{
		id: 'ke-biz-debt-collect-2026b',
		title: 'Collecting business debts',
		citation: 'Contract and civil procedure guidance',
		url: `${K}/akn/ke/act/1960/43`,
		content:
			'Send itemised demands with invoices and delivery proof, then mediate or file in small claims. Keep LPOs, delivery notes, and acknowledgement messages.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2022-01-01',
		sw_keywords: ['deni', 'biashara', 'madai']
	},
	{
		id: 'ke-biz-employee-theft-2026',
		title: 'Employee theft and fraud',
		citation: 'Penal Code; Employment Act',
		url: `${K}/akn/ke/act/1930/10`,
		content:
			'Theft by staff needs stock audits, OB reports, and fair disciplinary process with hearings. Keep audit reports, statements, and hearing minutes.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1930-01-01',
		sw_keywords: ['wizi', 'mfanyakazi', 'biashara']
	},
	{
		id: 'ke-biz-dismissal-sme-2026',
		title: 'Dismissing fairly in small businesses',
		citation: 'Employment Act, 2007',
		url: `${K}/akn/ke/act/2007/11`,
		content:
			'Even small employers must give notice, reasons, and hearings before termination. Document warnings and minutes. Keep contracts and termination letters.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2008-06-02',
		sw_keywords: ['kufutwa', 'mfanyakazi', 'biashara']
	},
	{
		id: 'ke-biz-nssf-staff-2026b',
		title: 'Registering staff for NSSF and SHIF',
		citation: 'NSSF Act; SHIF Act',
		url: `${K}/akn/ke/act/2013/45`,
		content:
			'Register employees promptly and remit monthly with payroll records. Confirm active cover for staff. Keep registration and remittance receipts.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2023-01-01',
		sw_keywords: ['mfanyakazi', 'bima', 'mshahara']
	},
	{
		id: 'ke-biz-data-small-2026',
		title: 'Customer data duties for shops',
		citation: 'Data Protection Act, 2019',
		url: `${K}/akn/ke/act/2019/24`,
		content:
			'Shops holding customer contacts need consent, limited collection, and secure records with deletion on request. Register where thresholds apply. Keep consent records.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2019-01-01',
		sw_keywords: ['wateja', 'faragha', 'biashara']
	},
	{
		id: 'ke-biz-closure-2026b',
		title: 'Closing a business properly',
		citation: 'Companies Act; BRS and KRA guidance',
		url: `${K}/akn/ke/act/2015/17`,
		content:
			'Settle debts, taxes, and dues, notify staff and creditors, and file dissolution or cessation. Keep clearance certificates and filings.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2015-01-01',
		sw_keywords: ['kufunga', 'biashara', 'KRA']
	},
	{
		id: 'ke-biz-insurance-shop-2026',
		title: 'Insuring stock and premises',
		citation: 'Insurance Act; business practice',
		url: `${K}/akn/ke/act/1985/1`,
		content:
			'Cover fire, burglary, and liability per stock values with updated schedules. Disclose material facts. Keep policies and valuation records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1985-01-01',
		sw_keywords: ['bima', 'duka', 'biashara']
	},
	{
		id: 'ke-biz-school-contract-2026',
		title: 'Supplying schools: contracts',
		citation: 'Basic Education Act; procurement guidance',
		url: `${K}/akn/ke/act/2013/14`,
		content:
			'School supplies need LPOs, delivery notes, and payment schedules signed by authorised officers. Verify signatories. Keep delivery and payment records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2013-01-01',
		sw_keywords: ['shule', 'biashara', 'malipo']
	},
	{
		id: 'ke-biz-market-stall-2026b',
		title: 'Market stall allocation and fees',
		citation: 'County Governments Act',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Stalls allocate through the county with allocation letters and daily or monthly fees. Keep allocation documents and fee receipts for enforcement checks.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['soko', 'kibanda', 'kaunti']
	},
	{
		id: 'ke-biz-hawker-2026',
		title: 'Hawking and street trading permits',
		citation: 'County by-laws',
		url: `${K}/akn/ke/act/2012/17`,
		content:
			'Street traders need county permits for zones and hours with fee receipts. Trade only in designated areas. Keep permits and receipts.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['machinga', 'biashara', 'leseni']
	},
	{
		id: 'ke-biz-boda-fleet-2026',
		title: 'Running a boda fleet',
		citation: 'NTSA and employment guidance',
		url: `${K}/akn/ke/act/2012/33`,
		content:
			'Fleet owners document hire terms, maintenance, insurance, and instalments per bike with rider IDs. Keep agreements and payment records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['boda', 'biashara', 'pikipiki']
	},
	{
		id: 'ke-biz-salon-shop-2026',
		title: 'Opening a salon or barbershop',
		citation: 'Public health and county licensing',
		url: `${K}/akn/ke/act/1921/38`,
		content:
			'Salons need county licences, sterilised tools, and trained staff with client records for reactions. Keep licences and medical certificates.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1921-01-01',
		sw_keywords: ['nywele', 'biashara', 'leseni']
	},
	{
		id: 'ke-biz-car-wash-2026',
		title: 'Car wash water and location rules',
		citation: 'Water Act; county by-laws',
		url: `${K}/akn/ke/act/2016/43`,
		content:
			'Car washes need authorised water sources, drainage, and county permits away from road reserves. Keep permits and water bills.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2016-01-01',
		sw_keywords: ['gari', 'biashara', 'maji']
	},
	{
		id: 'ke-biz-posho-2026',
		title: 'Posho mill licensing and KEBS flour',
		citation: 'County licensing; KEBS standards',
		url: `${K}/akn/ke/act/1973/17`,
		content:
			'Mills need county licences, machine safety, and KEBS-compliant packaging with weights. Keep licences and test records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1973-01-01',
		sw_keywords: ['posho', 'biashara', 'leseni']
	},
	{
		id: 'ke-biz-butchery-2026',
		title: 'Butchery licences and meat inspection',
		citation: 'Meat Control Act; public health',
		url: `${K}/akn/ke/act/1972/13`,
		content:
			'Butcheries need slaughter and inspection compliance with cold-chain records. Source from licensed slabs. Keep licences and inspection stamps.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1972-01-01',
		sw_keywords: ['nyama', 'duka', 'leseni']
	},
	{
		id: 'ke-biz-milk-bar-2026',
		title: 'Milk bars and dairy handling',
		citation: 'Dairy Industry Act; public health',
		url: `${K}/akn/ke/act/1958/34`,
		content:
			'Milk handling needs pasteurisation, cold chain, and Kenya Dairy Board compliance. Keep supplier records and test results.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '1958-01-01',
		sw_keywords: ['maziwa', 'biashara', 'leseni']
	},
	{
		id: 'ke-biz-wines-spirits-2026b',
		title: 'Wines and spirits outlet rules',
		citation: 'Alcoholic Drinks Control Act',
		url: `${K}/akn/ke/act/2010/4`,
		content:
			'Outlets observe hours, age, and location rules with displayed licences. Train staff on compliance. Keep licences and supplier invoices.',
		topic: 'business',
		source_type: 'legislation',
		effective_date: '2010-01-01',
		sw_keywords: ['pombe', 'duka', 'leseni']
	},
	{
		id: 'ke-biz-cafe-noise-2026',
		title: 'Cafes and noise compliance',
		citation: 'EMCA noise regulations',
		url: `${K}/akn/ke/act/1999/8`,
		content:
			'Music and generators must respect night-noise limits with NEMA permits for events. Keep permits and complaint responses.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1999-01-01',
		sw_keywords: ['kelele', 'mgahawa', 'leseni']
	},
	{
		id: 'ke-biz-online-shop-2026',
		title: 'Running an online shop',
		citation: 'Consumer Protection Act; KICA',
		url: `${K}/akn/ke/act/2012/46`,
		content:
			'List exact items, prices, delivery fees, and return terms with traceable payments. Honour delivery promises. Keep order and delivery records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '2012-01-01',
		sw_keywords: ['mtandaoni', 'duka', 'biashara']
	},
	{
		id: 'ke-biz-influencer-tax-2026',
		title: 'Influencer and creator taxes',
		citation: 'Income Tax Act; KRA guidance',
		url: `${K}/akn/ke/act/1973/16`,
		content:
			'Content income is taxable with PIN, records, and returns; brands deduct withholding where applicable. Keep contracts and payment records.',
		topic: 'business',
		source_type: 'guidance',
		effective_date: '1973-01-01',
		sw_keywords: ['mtandaoni', 'pesa', 'KRA']
	}
];

for (const [t, items] of [
	['debt', debt],
	['traffic', traffic],
	['business', business]
]) {
	const cur = load(t);
	const ids = new Set(cur.map((x) => x.id));
	const fresh = items.filter((x) => !ids.has(x.id));
	save(t, [...cur, ...fresh]);
	console.log(`added ${fresh.length} to ${t}`);
}
