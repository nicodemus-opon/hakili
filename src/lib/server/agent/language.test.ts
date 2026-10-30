import { describe, expect, it } from 'vitest';
import { isWordSalad } from './language.ts';

const SALAD_SAMPLE = `Kwa: [Mwana wa Mwana] Re: Mwanzo wa Ksh 50,000
Mwana alisahili kuwa na kushuka Ksh 50,000 kutoka matopeo ya kati kwa matopeo ya kati. Sio maandamaji ya matopeo zaidi kwa wakati hiki.
Mwana alisahili kuwa sio yetu amri kutoka kila matopeo au dokumentu kwenye kazi hii.
Mwana inaweza kuamini kwa matopeo ya kushuka Ksh 50,000, kusafisha matopeo ya jinsi la kushuka na jinsi la kutoa matopeo, na matopeo yasiopatikana. Matopeo hii inaweza kutuma matopeo katika matopeo, na kwa mfano kusafisha kati ya matopeo.
Mwana inaweza kuamini jinsi na matopeo yasiopatikana ya jinsi. Kama matopeo yasiopatikana, inaweza kutambua kwa kurudi.
Mwana inaweza kuamini kwa matopeo ya kushuka kati ya 7 siku kwa wakati hiki. Matopeo hii inaweza kutuma matopeo yasiopatikana na kutoa matopeo ya wakati.`;

const HEALTHY_SAMPLE = `Kwa: [Jina la Mteja] Kuhusu: Barua ya Madai ya Ksh50,000
Mpendwa Bwana/Bibi,
Mteja wetu anadai malipo ya Ksh50,000 kutoka kwako kufuatana na mkataba kati yenu. Ankara ilitolewa tarehe iliyotajwa na malipo hayajafanyika hadi sasa.
Fahamu kuwa isipokuwa tupokee malipo ndani ya siku saba kuanzia tarehe ya barua hii, mteja wetu atawasilisha dai Mahakamani ya Madai Madogo bila taarifa nyingine. Gharama zimehifadhiwa.
Wako mwaminifu, [Wakili] [Tarehe]`;

describe('isWordSalad', () => {
	it('flags the matopeo-loop translation as salad', () => {
		expect(isWordSalad(SALAD_SAMPLE)).toBe(true);
	});

	it('accepts a healthy Kiswahili letter', () => {
		expect(isWordSalad(HEALTHY_SAMPLE)).toBe(false);
	});

	it('ignores short texts', () => {
		expect(isWordSalad('Mteja wetu anadai malipo ya Ksh50,000.')).toBe(false);
	});
});
