import type { UiLanguage } from '../../shared/languages';
import type { LegalPage } from './legalPages';

/**
 * Site policy page content, loaded only with the legal pages. Kept short and in plain words, like the rest of the app, and
 * translated into every interface language. Statements describe exactly what the code
 * does (see SECURITY.md and README), nothing more.
 */

export const LEGAL_UPDATED = '2026-09-17';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  intro: string;
  sections: LegalSection[];
}

type LegalContent = Record<LegalPage, LegalDocument>;

const en: LegalContent = {
  privacy: {
    intro:
      'Clause Anatomy is built to explain your papers without keeping them. This policy explains what happens to the information you add.',
    sections: [
      {
        heading: 'What we process',
        body: [
          'The words of the paper you paste or upload, a photo of a page if you choose to send one, and the questions you ask about it.',
          'Text files and digital PDFs are read on your own device.',
        ],
      },
      {
        heading: 'Private numbers are hidden first',
        body: [
          'Before any text leaves your device, Aadhaar, PAN, phone, email, bank account, card, passport and voter ID numbers are replaced with labels such as [PHONE HIDDEN]. The server hides them again.',
          'Names and addresses are not hidden. A photo cannot be redacted before it is read, so the app asks for your permission before sending one.',
        ],
      },
      {
        heading: 'Who else sees it',
        body: [
          'To write explanations, the redacted text (or the photo you approved) is sent to the Google Gemini API and processed under Google’s terms for that service.',
          'We do not sell, share or use your papers for advertising.',
        ],
      },
      {
        heading: 'What we keep',
        body: [
          'Nothing on our side. There are no accounts, no database, no cookies and no analytics. Papers, notes and answers stay inside this browser tab (so a refresh does not lose them) and the browser clears them when you close the tab.',
          'While the tab is open, it remembers explanations so the same paper is not sent twice. The server keeps no documents and never writes them to logs.',
          'Your settings (language, theme, text size, reading level) are saved in your browser’s local storage. Clearing site data removes them.',
        ],
      },
      {
        heading: 'Your own API key',
        body: [
          'If you add your own Gemini API key in Settings, it is kept only in this browser tab (sessionStorage) and forgotten when you close the tab.',
          'It is sent to our server with each AI request, used to call Google for that request only, and never stored, logged or shown back. You can remove it from Settings at any time.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'All requests are limited in size and rate, checked strictly, and protected by security headers. The AI key stays on the server.',
        ],
      },
      {
        heading: 'Changes',
        body: ['If this policy changes, the date at the top of this page will change too.'],
      },
    ],
  },
  terms: {
    intro: 'By using Clause Anatomy you agree to these simple terms.',
    sections: [
      {
        heading: 'What the service is',
        body: [
          'A free tool that explains legal papers in plain language. It gives general information, not legal advice, and using it does not create a lawyer–client relationship.',
        ],
      },
      {
        heading: 'Your responsibilities',
        body: [
          'Only add papers you are allowed to share. Check important points against the original paper and with a qualified lawyer or free legal aid before you act.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not use the service for anything unlawful, to harm others, to overload or attack it, or to try to get around its limits and protections.',
        ],
      },
      {
        heading: 'Accuracy and availability',
        body: [
          'Explanations are written by AI and can be wrong or incomplete, even when a quote is marked as found in your paper. The service is provided “as is” and may change or be unavailable at times.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'To the extent the law allows, the makers of Clause Anatomy are not responsible for decisions made or losses suffered because of its explanations.',
        ],
      },
      {
        heading: 'Open source',
        body: ['The source code is available under the MIT License.'],
      },
    ],
  },
  disclaimer: {
    intro: 'Please read this before relying on any explanation.',
    sections: [
      {
        heading: 'Not legal advice',
        body: [
          'Clause Anatomy is not a lawyer or a law firm. It describes what a paper says; it does not tell you what to do.',
        ],
      },
      {
        heading: 'AI can make mistakes',
        body: [
          'Explanations may be wrong, missing something or out of date. Laws also differ between states and change over time.',
        ],
      },
      {
        heading: 'Urgent papers',
        body: [
          'If you received a court summons, a warrant, an eviction notice or anything with a close deadline, talk to a lawyer now. Free legal aid (NALSA): call 15100. In an emergency: call 112.',
        ],
      },
      {
        heading: 'Examples',
        body: [
          'The example papers are made up. Any resemblance to real people or places is a coincidence.',
        ],
      },
    ],
  },
  accessibility: {
    intro:
      'Clause Anatomy is designed for everyone, including people with limited literacy, low vision or who use assistive technology.',
    sections: [
      {
        heading: 'Our target',
        body: ['We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.'],
      },
      {
        heading: 'What is built in',
        body: [
          'Full keyboard use, including a skip link and a search palette (Ctrl + K). Labelled controls and headings for screen readers. Light, dark and automatic themes, and text up to 125 % larger. Explanations read aloud, simple and detailed reading levels, and an interface in English, Hindi and Telugu.',
        ],
      },
      {
        heading: 'How we test',
        body: [
          'Automated accessibility checks run on every screen in tests, in light and dark themes, at phone, tablet and desktop sizes.',
        ],
      },
      {
        heading: 'Known limitations',
        body: [
          'Read-aloud and voice questions depend on the voices your device has. Some legal words in explanations stay in English because they appear that way in the paper.',
        ],
      },
    ],
  },
};

const hi: LegalContent = {
  privacy: {
    intro:
      'Clause Anatomy आपके कागज़ों को रखे बिना समझाने के लिए बना है। यह नीति बताती है कि आपकी जानकारी के साथ क्या होता है।',
    sections: [
      {
        heading: 'हम क्या इस्तेमाल करते हैं',
        body: [
          'आपके पेस्ट या अपलोड किए कागज़ के शब्द, अगर आप भेजना चुनें तो पेज की फ़ोटो, और आपके पूछे सवाल।',
          'टेक्स्ट फ़ाइलें और डिजिटल PDF आपके अपने डिवाइस पर ही पढ़ी जाती हैं।',
        ],
      },
      {
        heading: 'निजी नंबर पहले छिपाए जाते हैं',
        body: [
          'कोई भी टेक्स्ट आपके डिवाइस से जाने से पहले आधार, पैन, फ़ोन, ईमेल, बैंक खाता, कार्ड, पासपोर्ट और वोटर आईडी नंबर [PHONE HIDDEN] जैसे निशानों से बदल दिए जाते हैं। सर्वर उन्हें फिर से छिपाता है।',
          'नाम और पते नहीं छिपाए जाते। फ़ोटो को पढ़ने से पहले छिपाया नहीं जा सकता, इसलिए फ़ोटो भेजने से पहले ऐप आपकी अनुमति लेता है।',
        ],
      },
      {
        heading: 'और कौन देखता है',
        body: [
          'समझ लिखने के लिए छिपाया हुआ टेक्स्ट (या आपकी मंज़ूर की हुई फ़ोटो) Google Gemini API को भेजा जाता है और उस सेवा की Google की शर्तों के तहत इस्तेमाल होता है।',
          'हम आपके कागज़ न बेचते हैं, न साझा करते हैं, न विज्ञापन के लिए इस्तेमाल करते हैं।',
        ],
      },
      {
        heading: 'हम क्या रखते हैं',
        body: [
          'हमारी तरफ़ कुछ नहीं। न अकाउंट, न डेटाबेस, न कुकी, न एनालिटिक्स। कागज़, नोट्स और जवाब इसी ब्राउज़र टैब में रहते हैं (रीलोड करने पर भी नहीं मिटते) और टैब बंद करते ही ब्राउज़र उन्हें हटा देता है।',
          'टैब खुला रहने तक यह समझ याद रखता है ताकि वही कागज़ दोबारा न भेजना पड़े। सर्वर कोई दस्तावेज़ नहीं रखता और लॉग में कभी नहीं लिखता।',
          'आपकी सेटिंग्स (भाषा, थीम, अक्षरों का आकार, पढ़ने का स्तर) आपके ब्राउज़र के लोकल स्टोरेज में रहती हैं। साइट डेटा मिटाने पर ये हट जाती हैं।',
        ],
      },
      {
        heading: 'आपकी अपनी API key',
        body: [
          'अगर आप सेटिंग्स में अपनी Gemini API key डालते हैं, तो वह सिर्फ़ इसी ब्राउज़र टैब (sessionStorage) में रहती है और टैब बंद करते ही मिट जाती है।',
          'हर AI अनुरोध के साथ यह हमारे सर्वर पर भेजी जाती है, सिर्फ़ उसी अनुरोध के लिए Google को कॉल करने में इस्तेमाल होती है, और कभी सेव, लॉग या वापस दिखाई नहीं जाती। आप इसे कभी भी सेटिंग्स से हटा सकते हैं।',
        ],
      },
      {
        heading: 'सुरक्षा',
        body: [
          'हर अनुरोध का आकार और गिनती सीमित है, सख़्ती से जाँचा जाता है और सुरक्षा हेडर से सुरक्षित है। AI की चाबी सिर्फ़ सर्वर पर रहती है।',
        ],
      },
      {
        heading: 'बदलाव',
        body: ['अगर यह नीति बदलती है, तो इस पेज के ऊपर की तारीख़ भी बदलेगी।'],
      },
    ],
  },
  terms: {
    intro: 'Clause Anatomy इस्तेमाल करके आप इन आसान शर्तों से सहमत होते हैं।',
    sections: [
      {
        heading: 'यह सेवा क्या है',
        body: [
          'एक मुफ़्त टूल जो कानूनी कागज़ों को आसान भाषा में समझाता है। यह सामान्य जानकारी देता है, कानूनी सलाह नहीं, और इसे इस्तेमाल करने से वकील–मुवक्किल का रिश्ता नहीं बनता।',
        ],
      },
      {
        heading: 'आपकी ज़िम्मेदारी',
        body: [
          'सिर्फ़ वही कागज़ डालें जिन्हें साझा करने का आपको हक़ है। कोई कदम उठाने से पहले ज़रूरी बातें असली कागज़ से और किसी योग्य वकील या मुफ़्त कानूनी मदद से जाँच लें।',
        ],
      },
      {
        heading: 'सही इस्तेमाल',
        body: [
          'सेवा का इस्तेमाल किसी गैर-कानूनी काम, दूसरों को नुकसान पहुँचाने, उस पर ज़्यादा भार डालने या हमला करने, या उसकी सीमाओं और सुरक्षा को तोड़ने की कोशिश के लिए न करें।',
        ],
      },
      {
        heading: 'सटीकता और उपलब्धता',
        body: [
          'समझ AI लिखता है और गलत या अधूरी हो सकती है, तब भी जब उद्धरण आपके कागज़ में मिला हुआ दिखे। सेवा "जैसी है" वैसी दी जाती है और कभी बदल या बंद हो सकती है।',
        ],
      },
      {
        heading: 'ज़िम्मेदारी की सीमा',
        body: [
          'कानून जहाँ तक अनुमति देता है, Clause Anatomy बनाने वाले इसकी समझ के आधार पर लिए गए फ़ैसलों या हुए नुकसान के ज़िम्मेदार नहीं हैं।',
        ],
      },
      {
        heading: 'ओपन सोर्स',
        body: ['इसका सोर्स कोड MIT लाइसेंस के तहत उपलब्ध है।'],
      },
    ],
  },
  disclaimer: {
    intro: 'किसी भी समझ पर भरोसा करने से पहले इसे पढ़ें।',
    sections: [
      {
        heading: 'कानूनी सलाह नहीं',
        body: [
          'Clause Anatomy न वकील है, न लॉ फ़र्म। यह बताता है कि कागज़ में क्या लिखा है; यह नहीं बताता कि आपको क्या करना चाहिए।',
        ],
      },
      {
        heading: 'AI से गलती हो सकती है',
        body: [
          'समझ गलत, अधूरी या पुरानी हो सकती है। कानून राज्यों के हिसाब से अलग होते हैं और समय के साथ बदलते हैं।',
        ],
      },
      {
        heading: 'ज़रूरी कागज़',
        body: [
          'अगर आपको कोर्ट का समन, वारंट, घर खाली करने का नोटिस या कोई नज़दीकी आख़िरी तारीख़ वाला कागज़ मिला है, तो अभी वकील से बात करें। मुफ़्त कानूनी मदद (NALSA): 15100 पर कॉल करें। आपातकाल में: 112 पर कॉल करें।',
        ],
      },
      {
        heading: 'उदाहरण',
        body: ['उदाहरण वाले कागज़ बनावटी हैं। किसी असली व्यक्ति या जगह से मिलना सिर्फ़ संयोग है।'],
      },
    ],
  },
  accessibility: {
    intro:
      'Clause Anatomy सबके लिए बना है, जिनमें कम पढ़े-लिखे लोग, कम देखने वाले लोग और सहायक तकनीक इस्तेमाल करने वाले लोग भी शामिल हैं।',
    sections: [
      {
        heading: 'हमारा लक्ष्य',
        body: [
          'हमारा लक्ष्य वेब कंटेंट एक्सेसिबिलिटी गाइडलाइंस (WCAG) 2.2 के AA स्तर को पूरा करना है।',
        ],
      },
      {
        heading: 'क्या-क्या शामिल है',
        body: [
          'पूरा कीबोर्ड से इस्तेमाल, जिसमें स्किप लिंक और खोज पैलेट (Ctrl + K) शामिल है। स्क्रीन रीडर के लिए नाम वाले बटन और शीर्षक। लाइट, डार्क और ऑटो थीम, और 125 % तक बड़े अक्षर। समझ को पढ़कर सुनाना, आसान और विस्तार वाले स्तर, और अंग्रेज़ी, हिन्दी और तेलुगु में इंटरफ़ेस।',
        ],
      },
      {
        heading: 'हम कैसे जाँचते हैं',
        body: [
          'टेस्ट में हर स्क्रीन पर लाइट और डार्क थीम में, फ़ोन, टैबलेट और डेस्कटॉप आकार पर स्वचालित सुगम्यता जाँच चलती है।',
        ],
      },
      {
        heading: 'जानी हुई सीमाएँ',
        body: [
          'पढ़कर सुनाना और बोलकर सवाल पूछना आपके डिवाइस की आवाज़ों पर निर्भर है। कुछ कानूनी शब्द अंग्रेज़ी में ही रहते हैं क्योंकि कागज़ में वे ऐसे ही लिखे होते हैं।',
        ],
      },
    ],
  },
};

const te: LegalContent = {
  privacy: {
    intro:
      'Clause Anatomy మీ కాగితాలను నిల్వ చేయకుండా వివరించడానికి రూపొందించబడింది. మీరు ఇచ్చే సమాచారానికి ఏమి జరుగుతుందో ఈ విధానం వివరిస్తుంది.',
    sections: [
      {
        heading: 'మేము ఏమి ఉపయోగిస్తాం',
        body: [
          'మీరు పేస్ట్ చేసిన లేదా అప్‌లోడ్ చేసిన కాగితంలోని పదాలు, మీరు పంపాలని ఎంచుకుంటే పేజీ ఫోటో, మీరు అడిగే ప్రశ్నలు.',
          'టెక్స్ట్ ఫైళ్ళు, డిజిటల్ PDFలు మీ పరికరంలోనే చదవబడతాయి.',
        ],
      },
      {
        heading: 'ప్రైవేట్ నంబర్లు ముందే దాచబడతాయి',
        body: [
          'ఏ పాఠమైనా మీ పరికరం నుంచి వెళ్ళే ముందు ఆధార్, పాన్, ఫోన్, ఈమెయిల్, బ్యాంక్ ఖాతా, కార్డ్, పాస్‌పోర్ట్, ఓటర్ ఐడీ నంబర్ల స్థానంలో [PHONE HIDDEN] వంటి గుర్తులు పెడతాం. సర్వర్ వాటిని మళ్ళీ దాస్తుంది.',
          'పేర్లు, చిరునామాలు దాచబడవు. ఫోటోను చదవక ముందు దాచలేం, అందుకే ఫోటో పంపే ముందు యాప్ మీ అనుమతి అడుగుతుంది.',
        ],
      },
      {
        heading: 'ఇంకా ఎవరు చూస్తారు',
        body: [
          'వివరణలు రాయడానికి, దాచిన పాఠం (లేదా మీరు అనుమతించిన ఫోటో) Google Gemini API కి పంపబడుతుంది, ఆ సేవకు Google నిబంధనల ప్రకారం ప్రాసెస్ అవుతుంది.',
          'మీ కాగితాలను మేము అమ్మము, పంచుకోము, ప్రకటనల కోసం ఉపయోగించము.',
        ],
      },
      {
        heading: 'మేము ఏమి ఉంచుకుంటాం',
        body: [
          'మా వైపు ఏమీ లేదు. ఖాతాలు, డేటాబేస్, కుకీలు, అనలిటిక్స్ లేవు. కాగితాలు, నోట్స్, జవాబులు ఈ బ్రౌజర్ ట్యాబ్‌లోనే ఉంటాయి (రీలోడ్ చేసినా పోవు); ట్యాబ్ మూసినప్పుడు బ్రౌజర్ వాటిని తొలగిస్తుంది.',
          'ట్యాబ్ తెరిచి ఉన్నంత వరకు వివరణలను గుర్తుంచుకుంటుంది, అదే కాగితం మళ్ళీ పంపకుండా. సర్వర్ ఏ పత్రాలనూ ఉంచదు, లాగ్‌లలో ఎప్పుడూ రాయదు.',
          'మీ సెట్టింగ్‌లు (భాష, థీమ్, అక్షర పరిమాణం, చదివే స్థాయి) మీ బ్రౌజర్ లోకల్ స్టోరేజ్‌లో ఉంటాయి. సైట్ డేటా తొలగిస్తే అవి పోతాయి.',
        ],
      },
      {
        heading: 'మీ సొంత API key',
        body: [
          'మీరు సెట్టింగ్స్‌లో మీ Gemini API key జోడిస్తే, అది ఈ బ్రౌజర్ ట్యాబ్‌లో (sessionStorage) మాత్రమే ఉంటుంది, ట్యాబ్ మూసివేయగానే మరచిపోతుంది.',
          'ప్రతి AI అభ్యర్థనతో ఇది మా సర్వర్‌కు పంపబడుతుంది, ఆ అభ్యర్థన కోసం మాత్రమే Google ని పిలవడానికి ఉపయోగించబడుతుంది, ఎప్పుడూ సేవ్, లాగ్ లేదా తిరిగి చూపబడదు. సెట్టింగ్స్ నుండి ఎప్పుడైనా తీసివేయవచ్చు.',
        ],
      },
      {
        heading: 'భద్రత',
        body: [
          'ప్రతి అభ్యర్థన పరిమాణం, సంఖ్య పరిమితం; కఠినంగా తనిఖీ చేయబడుతుంది; భద్రతా హెడర్లతో రక్షించబడుతుంది. AI కీ సర్వర్‌లోనే ఉంటుంది.',
        ],
      },
      {
        heading: 'మార్పులు',
        body: ['ఈ విధానం మారితే, ఈ పేజీ పైన ఉన్న తేదీ కూడా మారుతుంది.'],
      },
    ],
  },
  terms: {
    intro: 'Clause Anatomy ఉపయోగించడం ద్వారా మీరు ఈ సులభమైన నిబంధనలకు అంగీకరిస్తున్నారు.',
    sections: [
      {
        heading: 'ఈ సేవ ఏమిటి',
        body: [
          'చట్టపరమైన కాగితాలను సులభమైన భాషలో వివరించే ఉచిత సాధనం. ఇది సాధారణ సమాచారం ఇస్తుంది, న్యాయ సలహా కాదు; దీన్ని ఉపయోగించడం వల్ల లాయర్–క్లయింట్ సంబంధం ఏర్పడదు.',
        ],
      },
      {
        heading: 'మీ బాధ్యతలు',
        body: [
          'పంచుకునే హక్కు ఉన్న కాగితాలనే చేర్చండి. ఏదైనా చేసే ముందు ముఖ్యమైన విషయాలను అసలు కాగితంతో, అర్హత ఉన్న లాయర్ లేదా ఉచిత న్యాయ సహాయంతో సరిచూసుకోండి.',
        ],
      },
      {
        heading: 'సరైన ఉపయోగం',
        body: [
          'చట్టవిరుద్ధమైన పనులకు, ఇతరులకు హాని చేయడానికి, సేవపై అధిక భారం వేయడానికి లేదా దాడి చేయడానికి, దాని పరిమితులు, రక్షణలను దాటడానికి ఉపయోగించకండి.',
        ],
      },
      {
        heading: 'ఖచ్చితత్వం, లభ్యత',
        body: [
          'వివరణలు AI రాస్తుంది; ఉల్లేఖనం మీ కాగితంలో దొరికినట్టు చూపినా అవి తప్పుగా లేదా అసంపూర్ణంగా ఉండవచ్చు. సేవ "ఉన్నది ఉన్నట్టుగా" అందించబడుతుంది, కొన్నిసార్లు మారవచ్చు లేదా అందుబాటులో లేకపోవచ్చు.',
        ],
      },
      {
        heading: 'బాధ్యత పరిమితి',
        body: [
          'చట్టం అనుమతించినంత వరకు, దీని వివరణల ఆధారంగా తీసుకున్న నిర్ణయాలకు లేదా జరిగిన నష్టాలకు Clause Anatomy రూపకర్తలు బాధ్యులు కారు.',
        ],
      },
      {
        heading: 'ఓపెన్ సోర్స్',
        body: ['సోర్స్ కోడ్ MIT లైసెన్స్ కింద అందుబాటులో ఉంది.'],
      },
    ],
  },
  disclaimer: {
    intro: 'ఏ వివరణపైనైనా ఆధారపడే ముందు దీన్ని చదవండి.',
    sections: [
      {
        heading: 'న్యాయ సలహా కాదు',
        body: [
          'Clause Anatomy లాయర్ కాదు, లా ఫర్మ్ కాదు. కాగితంలో ఏముందో చెబుతుంది; మీరు ఏమి చేయాలో చెప్పదు.',
        ],
      },
      {
        heading: 'AI పొరపాటు చేయవచ్చు',
        body: [
          'వివరణలు తప్పుగా, అసంపూర్ణంగా లేదా పాతవిగా ఉండవచ్చు. చట్టాలు రాష్ట్రాలను బట్టి మారుతాయి, కాలంతో మారుతాయి.',
        ],
      },
      {
        heading: 'అత్యవసర కాగితాలు',
        body: [
          'మీకు కోర్టు సమన్లు, వారెంట్, ఖాళీ చేయమనే నోటీసు లేదా దగ్గర గడువు ఉన్న ఏదైనా కాగితం వస్తే, ఇప్పుడే లాయర్‌తో మాట్లాడండి. ఉచిత న్యాయ సహాయం (NALSA): 15100 కి కాల్ చేయండి. అత్యవసరంలో: 112 కి కాల్ చేయండి.',
        ],
      },
      {
        heading: 'ఉదాహరణలు',
        body: [
          'ఉదాహరణ కాగితాలు కల్పితం. నిజమైన వ్యక్తులు లేదా ప్రదేశాలతో పోలిక ఉంటే అది యాదృచ్ఛికం.',
        ],
      },
    ],
  },
  accessibility: {
    intro:
      'Clause Anatomy అందరి కోసం రూపొందించబడింది — తక్కువ చదువు ఉన్నవారు, తక్కువ చూపు ఉన్నవారు, సహాయక సాంకేతికత ఉపయోగించేవారితో సహా.',
    sections: [
      {
        heading: 'మా లక్ష్యం',
        body: [
          'వెబ్ కంటెంట్ యాక్సెసిబిలిటీ గైడ్‌లైన్స్ (WCAG) 2.2 AA స్థాయిని అందుకోవడం మా లక్ష్యం.',
        ],
      },
      {
        heading: 'ఏమేమి ఉన్నాయి',
        body: [
          'పూర్తిగా కీబోర్డ్‌తో ఉపయోగం — స్కిప్ లింక్, శోధన ప్యాలెట్ (Ctrl + K) సహా. స్క్రీన్ రీడర్ల కోసం పేర్లు ఉన్న బటన్లు, శీర్షికలు. లైట్, డార్క్, ఆటో థీమ్‌లు, 125 % వరకు పెద్ద అక్షరాలు. వివరణలను చదివి వినిపించడం, సులభ, వివరమైన స్థాయిలు, ఇంగ్లీష్, హిందీ, తెలుగులో ఇంటర్‌ఫేస్.',
        ],
      },
      {
        heading: 'మేము ఎలా పరీక్షిస్తాం',
        body: [
          'పరీక్షల్లో ప్రతి స్క్రీన్‌పై లైట్, డార్క్ థీమ్‌లలో, ఫోన్, టాబ్లెట్, డెస్క్‌టాప్ పరిమాణాల్లో స్వయంచాలక యాక్సెసిబిలిటీ తనిఖీలు నడుస్తాయి.',
        ],
      },
      {
        heading: 'తెలిసిన పరిమితులు',
        body: [
          'చదివి వినిపించడం, మాట్లాడి ప్రశ్నలు అడగడం మీ పరికరంలోని స్వరాలపై ఆధారపడతాయి. కొన్ని న్యాయ పదాలు కాగితంలో ఉన్నట్టే ఇంగ్లీష్‌లో ఉంటాయి.',
        ],
      },
    ],
  },
};

export const LEGAL_CONTENT: Record<UiLanguage, LegalContent> = { en, hi, te };
