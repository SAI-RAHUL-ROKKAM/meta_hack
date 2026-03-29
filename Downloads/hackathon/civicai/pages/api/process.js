export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { text, language } = req.body
  if (!text) return res.status(400).json({ error: 'No complaint text provided' })

  try {
    // ─── STEP 1: DETECT LANGUAGE LOCALLY (NO API NEEDED) ─────────────────
    // We detect the script from Unicode ranges and use the user-selected language.
    // Multilingual keywords in Step 2 handle matching directly — no translation needed.

    const detectScript = (t) => {
      if (/[\u0900-\u097F]/.test(t)) return 'Hindi'       // Devanagari (Hindi/Marathi)
      if (/[\u0C00-\u0C7F]/.test(t)) return 'Telugu'
      if (/[\u0B80-\u0BFF]/.test(t)) return 'Tamil'
      if (/[\u0C80-\u0CFF]/.test(t)) return 'Kannada'
      if (/[\u0980-\u09FF]/.test(t)) return 'Bengali'
      if (/[\u0A80-\u0AFF]/.test(t)) return 'Gujarati'
      if (/[\u0A00-\u0A7F]/.test(t)) return 'Punjabi'
      if (/[\u0B00-\u0B7F]/.test(t)) return 'Odia'
      return 'English'
    }

    let detectedLanguage = language || detectScript(text) || 'Unknown'
    // If user selected a language, trust that; otherwise use script detection
    if (!language || language === 'English') {
      const scriptLang = detectScript(text)
      if (scriptLang !== 'English') detectedLanguage = scriptLang
    }

    // Use original text directly for keyword matching — multilingual keywords cover all languages
    const combinedText = text.toLowerCase()

    // ─── STEP 2: MULTILINGUAL KEYWORD MAPS ──────────────────────────────
    // Each department has keywords in English + Hindi + Telugu + Tamil + Kannada + Marathi + Bengali

    const departmentKeywords = {
      Hospital: [
        // English
        'hospital', 'doctor', 'nurse', 'patient', 'ward', 'emergency room', 'icu', 'medical staff',
        'ambulance', 'surgery', 'operation theatre', 'blood bank', 'pharmacy', 'casualty',
        // Hindi
        'अस्पताल', 'डॉक्टर', 'नर्स', 'मरीज', 'एम्बुलेंस', 'ऑपरेशन', 'आईसीयू', 'फार्मेसी', 'खून',
        // Telugu
        'ఆసుపత్రి', 'డాక్టర్', 'నర్సు', 'రోగి', 'అంబులెన్స్', 'శస్త్రచికిత్స',
        // Tamil
        'மருத்துவமனை', 'மருத்துவர்', 'செவிலியர்', 'நோயாளி', 'அம்புலன்ஸ்',
        // Kannada
        'ಆಸ್ಪತ್ರೆ', 'ವೈದ್ಯ', 'ನರ್ಸ್', 'ರೋಗಿ', 'ಆಂಬುಲೆನ್ಸ್',
        // Marathi
        'रुग्णालय', 'डॉक्टर', 'परिचारिका', 'रुग्ण', 'रुग्णवाहिका',
        // Bengali
        'হাসপাতাল', 'ডাক্তার', 'নার্স', 'রোগী', 'অ্যাম্বুলেন্স'
      ],
      Health: [
        // English
        'health', 'disease', 'medical', 'clinic', 'vaccination', 'public health', 'epidemic',
        'infection', 'fever', 'dengue', 'malaria', 'cholera', 'food poisoning', 'contamination',
        'hygiene', 'mental health', 'medicine', 'drug', 'pandemic', 'heart', 'cardiac', 'attack', 'chest pain', 'stroke',
        // Hindi
        'स्वास्थ्य', 'बीमारी', 'बुखार', 'डेंगू', 'मलेरिया', 'टीकाकरण', 'टीका', 'संक्रमण', 'चिकित्सा',
        'दवाई', 'दवा', 'महामारी', 'खांसी', 'जुकाम', 'उल्टी', 'दस्त', 'विषाक्तता',
        // Telugu
        'ఆరోగ్యం', 'వ్యాధి', 'జ్వరం', 'డెంగ్యూ', 'మలేరియా', 'టీకా', 'అంటువ్యాధి', 'మందులు',
        // Tamil
        'சுகாதாரம்', 'நோய்', 'காய்ச்சல்', 'டெங்கு', 'மலேரியா', 'தடுப்பூசி', 'தொற்று', 'மருந்து',
        // Kannada
        'ಆರೋಗ್ಯ', 'ರೋಗ', 'ಜ್ವರ', 'ಡೆಂಗ್ಯೂ', 'ಮಲೇರಿಯಾ', 'ಲಸಿಕೆ', 'ಸೋಂಕು',
        // Marathi
        'आरोग्य', 'आजार', 'ताप', 'डेंग्यू', 'मलेरिया', 'लसीकरण', 'संसर्ग',
        // Bengali
        'স্বাস্থ্য', 'রোগ', 'জ্বর', 'ডেঙ্গু', 'ম্যালেরিয়া', 'টিকা', 'সংক্রমণ'
      ],
      Police: [
        // English
        'police', 'theft', 'robbery', 'assault', 'crime', 'harassment', 'violence', 'murder',
        'kidnapping', 'burglary', 'stalking', 'domestic violence', 'eve teasing', 'chain snatching',
        'fraud', 'scam', 'cybercrime', 'extortion', 'threat', 'drunk driving', 'accident',
        'FIR', 'stolen', 'missing person', 'drug trafficking', 'gambling', 'fighting',
        // Hindi
        'पुलिस', 'चोरी', 'लूट', 'डकैती', 'हमला', 'अपराध', 'उत्पीड़न', 'हत्या', 'हिंसा',
        'अपहरण', 'धोखाधड़ी', 'छेड़छाड़', 'मारपीट', 'धमकी', 'चेन स्नैचिंग', 'नशा', 'शराब',
        'गायब', 'लापता', 'गुंडागर्दी', 'एफआईआर',
        // Telugu
        'పోలీసు', 'దొంగతనం', 'దోపిడీ', 'దాడి', 'నేరం', 'వేధింపు', 'హత్య', 'హింస',
        'అపహరణ', 'మోసం', 'బెదిరింపు', 'తాగి డ్రైవింగ్',
        // Tamil
        'காவல்', 'திருட்டு', 'கொள்ளை', 'தாக்குதல்', 'குற்றம்', 'தொல்லை', 'கொலை',
        'கடத்தல்', 'மோசடி', 'மிரட்டல்', 'போலீஸ்',
        // Kannada
        'ಪೊಲೀಸ್', 'ಕಳ್ಳತನ', 'ದರೋಡೆ', 'ಹಲ್ಲೆ', 'ಅಪರಾಧ', 'ಕಿರುಕುಳ', 'ಕೊಲೆ',
        'ಅಪಹರಣ', 'ವಂಚನೆ', 'ಬೆದರಿಕೆ',
        // Marathi
        'पोलीस', 'चोरी', 'दरोडा', 'हल्ला', 'गुन्हा', 'छळ', 'खून', 'अपहरण', 'फसवणूक',
        // Bengali
        'পুলিশ', 'চুরি', 'ডাকাতি', 'হামলা', 'অপরাধ', 'হয়রানি', 'খুন', 'অপহরণ', 'প্রতারণা'
      ],
      Sanitation: [
        // English
        'garbage', 'trash', 'dustbin', 'sewage', 'drainage', 'smell', 'litter', 'sanitation',
        'manhole', 'gutter', 'waste', 'dump', 'rubbish', 'compost', 'recycle', 'toilet',
        'public toilet', 'open defecation', 'cleaning', 'sweeping', 'stinking', 'dirty',
        'clogged drain', 'overflowing', 'mosquito breeding', 'filth', 'unhygienic',
        // Hindi
        'कचरा', 'कूड़ा', 'सफाई', 'नाली', 'गंदगी', 'बदबू', 'सीवर', 'मैनहोल', 'गटर',
        'शौचालय', 'खुले में शौच', 'सड़ांध', 'गंदा', 'नालियाँ', 'डस्टबिन', 'मच्छर',
        // Telugu
        'చెత్త', 'మురుగు', 'పారిశుధ్యం', 'డ్రైనేజ్', 'వాసన', 'మురికి', 'మ్యాన్‌హోల్',
        'శుభ్రత', 'మరుగుదొడ్డి', 'దుర్గంధం',
        // Tamil
        'குப்பை', 'கழிவு', 'சுகாதாரம்', 'வடிகால்', 'துர்நாற்றம்', 'கழிவுநீர்', 'கொசு',
        'சுத்தம்', 'கழிப்பறை', 'அசுத்தம்',
        // Kannada
        'ಕಸ', 'ತ್ಯಾಜ್ಯ', 'ನೈರ್ಮಲ್ಯ', 'ಒಳಚರಂಡಿ', 'ದುರ್ವಾಸನೆ', 'ಗಟಾರ', 'ಶೌಚಾಲಯ',
        // Marathi
        'कचरा', 'सफाई', 'गटार', 'दुर्गंधी', 'मॅनहोल', 'शौचालय', 'स्वच्छता',
        // Bengali
        'আবর্জনা', 'জঞ্জাল', 'পরিষ্কার', 'নর্দমা', 'দুর্গন্ধ', 'ম্যানহোল', 'শৌচাগার'
      ],
      Education: [
        // English
        'school', 'college', 'teacher', 'student', 'class', 'education', 'university',
        'exam', 'syllabus', 'principal', 'hostel', 'library', 'scholarship', 'tuition',
        'midday meal', 'playground', 'campus', 'classroom', 'lab', 'professor',
        'admission', 'dropout', 'infrastructure', 'sports facility',
        // Hindi
        'स्कूल', 'विद्यालय', 'कॉलेज', 'शिक्षक', 'अध्यापक', 'छात्र', 'विद्यार्थी', 'शिक्षा',
        'परीक्षा', 'पाठ्यक्रम', 'प्रधानाचार्य', 'पुस्तकालय', 'छात्रवृत्ति', 'मिड डे मील',
        'कक्षा', 'प्रयोगशाला', 'खेल का मैदान', 'प्रवेश',
        // Telugu
        'పాఠశాల', 'కళాశాల', 'ఉపాధ్యాయుడు', 'విద్యార్థి', 'విద్య', 'పరీక్ష', 'ప్రధానోపాధ్యాయుడు',
        'గ్రంథాలయం', 'ఉపకారవేతనం', 'మధ్యాహ్న భోజనం',
        // Tamil
        'பள்ளி', 'கல்லூரி', 'ஆசிரியர்', 'மாணவர்', 'கல்வி', 'தேர்வு', 'தலைமையாசிரியர்',
        'நூலகம்', 'உதவித்தொகை', 'மதிய உணவு',
        // Kannada
        'ಶಾಲೆ', 'ಕಾಲೇಜು', 'ಶಿಕ್ಷಕ', 'ವಿದ್ಯಾರ್ಥಿ', 'ಶಿಕ್ಷಣ', 'ಪರೀಕ್ಷೆ', 'ಗ್ರಂಥಾಲಯ',
        // Marathi
        'शाळा', 'महाविद्यालय', 'शिक्षक', 'विद्यार्थी', 'शिक्षण', 'परीक्षा', 'ग्रंथालय',
        // Bengali
        'স্কুল', 'কলেজ', 'শিক্ষক', 'ছাত্র', 'শিক্ষা', 'পরীক্ষা', 'গ্রন্থাগার'
      ],
      Roads: [
        // English
        'pothole', 'road', 'street', 'traffic', 'asphalt', 'bridge', 'roads', 'speedbreaker',
        'speed breaker', 'zebra crossing', 'signal', 'traffic light', 'footpath', 'divider',
        'highway', 'flyover', 'pavement', 'crack in road', 'uneven road', 'construction',
        // Hindi
        'गड्ढा', 'सड़क', 'रास्ता', 'ट्रैफिक', 'पुल', 'फ्लाईओवर', 'स्पीड ब्रेकर',
        'ज़ेबरा क्रॉसिंग', 'सिग्नल', 'फुटपाथ', 'राजमार्ग', 'निर्माण',
        // Telugu
        'గుంత', 'రోడ్డు', 'రహదారి', 'ట్రాఫిక్', 'వంతెన', 'ఫ్లైఓవర్', 'సిగ్నల్', 'ఫుట్‌పాత్',
        // Tamil
        'குழி', 'சாலை', 'போக்குவரத்து', 'பாலம்', 'மேம்பாலம்', 'சிக்னல்', 'நடைபாதை',
        // Kannada
        'ಗುಂಡಿ', 'ರಸ್ತೆ', 'ಸಂಚಾರ', 'ಸೇತುವೆ', 'ಮೇಲ್ಸೇತುವೆ', 'ಸಿಗ್ನಲ್',
        // Marathi
        'खड्डा', 'रस्ता', 'वाहतूक', 'पूल', 'उड्डाणपूल', 'सिग्नल', 'पदपथ',
        // Bengali
        'গর্ত', 'রাস্তা', 'যানজট', 'সেতু', 'ফ্লাইওভার', 'সিগন্যাল', 'ফুটপাথ'
      ],
      Water: [
        // English
        'water', 'leak', 'tap', 'pipeline', 'drinking water', 'flooding', 'water scarcity',
        'borewell', 'water supply', 'contaminated water', 'water tank', 'water pressure',
        'water logging', 'rain water', 'water connection', 'water bill', 'dirty water',
        // Hindi
        'पानी', 'नल', 'पाइपलाइन', 'जलापूर्ति', 'बोरवेल', 'बाढ़', 'जल', 'टंकी', 'रिसाव',
        'पेयजल', 'गंदा पानी', 'पानी की कमी', 'जलभराव', 'पानी का बिल',
        // Telugu
        'నీరు', 'కొళాయి', 'పైపులైన్', 'తాగునీరు', 'బోరుబావి', 'వరదలు', 'నీటి ట్యాంక్',
        // Tamil
        'தண்ணீர்', 'குழாய்', 'குடிநீர்', 'ஆழ்துளை', 'வெள்ளம்', 'நீர் தொட்டி', 'நீர் வழங்கல்',
        // Kannada
        'ನೀರು', 'ನಲ್ಲಿ', 'ಕುಡಿಯುವ ನೀರು', 'ಕೊಳವೆಬಾವಿ', 'ಪ್ರವಾಹ', 'ನೀರಿನ ಟ್ಯಾಂಕ್',
        // Marathi
        'पाणी', 'नळ', 'पाइपलाइन', 'पिण्याचे पाणी', 'बोअरवेल', 'पूर', 'पाण्याची टाकी',
        // Bengali
        'জল', 'পানি', 'কল', 'পাইপলাইন', 'পানীয় জল', 'বন্যা', 'জলের ট্যাঙ্ক'
      ],
      Electricity: [
        // English
        'power', 'electricity', 'outage', 'streetlight', 'transformer', 'voltage', 'breaker',
        'power cut', 'short circuit', 'electric pole', 'wire', 'meter', 'electric shock',
        'billing', 'power supply', 'generator', 'inverter', 'load shedding', 'blackout',
        'broken streetlight', 'dark street', 'no light', 'lamps',
        // Hindi
        'बिजली', 'बत्ती', 'ट्रांसफार्मर', 'तार', 'स्ट्रीटलाइट', 'बिजली कटौती',
        'शॉर्ट सर्किट', 'बिजली का खंभा', 'मीटर', 'बिजली का बिल', 'इन्वर्टर', 'अंधेरा',
        // Telugu
        'విద్యుత్', 'కరెంట్', 'ట్రాన్స్‌ఫార్మర్', 'వైర్', 'స్ట్రీట్ లైట్', 'పవర్ కట్',
        'షార్ట్ సర్క్యూట్', 'మీటర్', 'చీకటి',
        // Tamil
        'மின்சாரம்', 'மின்கம்பி', 'மின்மாற்றி', 'தெரு விளக்கு', 'மின்தடை', 'மின்கட்டணம்',
        'ஷார்ட் சர்க்யூட்', 'மீட்டர்', 'இருட்டு',
        // Kannada
        'ವಿದ್ಯುತ್', 'ಕರೆಂಟ್', 'ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್', 'ಬೀದಿ ದೀಪ', 'ವಿದ್ಯುತ್ ಕಡಿತ', 'ಮೀಟರ್',
        // Marathi
        'वीज', 'ट्रान्सफॉर्मर', 'पथदीप', 'वीज खंडित', 'शॉर्ट सर्किट', 'मीटर', 'अंधार',
        // Bengali
        'বিদ্যুৎ', 'ট্রান্সফর্মার', 'রাস্তার বাতি', 'লোডশেডিং', 'শর্ট সার্কিট', 'মিটার', 'অন্ধকার'
      ],
      Rescue: [
        // English
        'rescue', 'fire brigade', 'firefighter', 'airlift', 'lifeguard', 'disaster response',
        'natural disaster', 'search and rescue', 'fire', 'earthquake', 'cyclone', 'landslide',
        'building collapse', 'flood rescue', 'trapped', 'drowning', 'explosion', 'gas leak',
        // Hindi
        'बचाव', 'आग', 'दमकल', 'भूकंप', 'तूफान', 'बाढ़ बचाव', 'फंसे', 'डूबना',
        'विस्फोट', 'गैस लीक', 'इमारत गिरी', 'भूस्खलन', 'चक्रवात',
        // Telugu
        'రక్షణ', 'అగ్ని', 'భూకంపం', 'తుఫాను', 'చిక్కుకుపోయారు', 'మునిగిపోవడం',
        'పేలుడు', 'గ్యాస్ లీక్', 'భవనం కూలిపోయింది',
        // Tamil
        'மீட்பு', 'தீ', 'நிலநடுக்கம்', 'புயல்', 'சிக்கியவர்', 'மூழ்கிய', 'வெடிப்பு',
        'எரிவாயு கசிவு', 'கட்டிடம் இடிந்தது',
        // Kannada
        'ರಕ್ಷಣೆ', 'ಬೆಂಕಿ', 'ಭೂಕಂಪ', 'ಚಂಡಮಾರುತ', 'ಸಿಲುಕಿದ', 'ಮುಳುಗಿದ', 'ಸ್ಫೋಟ',
        // Marathi
        'बचाव', 'आग', 'भूकंप', 'वादळ', 'अडकले', 'बुडणे', 'स्फोट', 'गॅस गळती',
        // Bengali
        'উদ্ধার', 'আগুন', 'ভূমিকম্প', 'ঝড়', 'আটকে পড়া', 'ডুবে যাওয়া', 'বিস্ফোরণ', 'গ্যাস লিক'
      ],
      Transport: [
        // English
        'bus', 'train', 'metro', 'auto', 'rickshaw', 'cab', 'taxi', 'public transport',
        'bus stop', 'railway station', 'train delay', 'bus route', 'ticket', 'conductor',
        'overcrowded', 'rash driving', 'traffic jam',
        // Hindi
        'बस', 'ट्रेन', 'मेट्रो', 'ऑटो', 'रिक्शा', 'टैक्सी', 'बस स्टॉप', 'रेलवे स्टेशन',
        'ट्रेन लेट', 'भीड़भाड़', 'लापरवाह ड्राइविंग',
        // Telugu
        'బస్సు', 'రైలు', 'మెట్రో', 'ఆటో', 'రిక్షా', 'బస్ స్టాప్', 'రైల్వే స్టేషన్',
        // Tamil
        'பேருந்து', 'ரயில்', 'மெட்ரோ', 'ஆட்டோ', 'பேருந்து நிறுத்தம்', 'ரயில் நிலையம்',
        // Kannada
        'ಬಸ್', 'ರೈಲು', 'ಮೆಟ್ರೋ', 'ಆಟೋ', 'ಬಸ್ ನಿಲ್ದಾಣ', 'ರೈಲ್ವೇ ನಿಲ್ದಾಣ',
        // Marathi
        'बस', 'ट्रेन', 'मेट्रो', 'ऑटो', 'बस थांबा', 'रेल्वे स्टेशन',
        // Bengali
        'বাস', 'ট্রেন', 'মেট্রো', 'অটো', 'বাস স্টপ', 'রেলস্টেশন'
      ],
      Municipal: [
        // English
        'property', 'building', 'construction', 'encroachment', 'illegal construction',
        'parking', 'noise', 'stray dogs', 'stray animals', 'tax', 'birth certificate',
        'death certificate', 'trade license', 'zoning', 'municipal', 'corporation',
        'hawkers', 'street vendor', 'advertisement', 'hoarding',
        // Hindi
        'भवन', 'निर्माण', 'अतिक्रमण', 'अवैध निर्माण', 'पार्किंग', 'शोर', 'कुत्ते',
        'आवारा जानवर', 'कर', 'जन्म प्रमाणपत्र', 'नगर निगम', 'नगरपालिका',
        // Telugu
        'భవనం', 'నిర్మాణం', 'ఆక్రమణ', 'పార్కింగ్', 'శబ్దం', 'వీధి కుక్కలు', 'పన్ను',
        // Tamil
        'கட்டிடம்', 'கட்டுமானம்', 'ஆக்கிரமிப்பு', 'பார்க்கிங்', 'சத்தம்', 'தெரு நாய்', 'வரி',
        // Kannada
        'ಕಟ್ಟಡ', 'ನಿರ್ಮಾಣ', 'ಅತಿಕ್ರಮಣ', 'ಪಾರ್ಕಿಂಗ್', 'ಶಬ್ದ', 'ಬೀದಿ ನಾಯಿ', 'ತೆರಿಗೆ',
        // Marathi
        'इमारत', 'बांधकाम', 'अतिक्रमण', 'पार्किंग', 'आवाज', 'भटके कुत्रे', 'कर',
        // Bengali
        'ভবন', 'নির্মাণ', 'দখল', 'পার্কিং', 'শব্দ', 'পথকুকুর', 'কর'
      ],
      Environment: [
        // English
        'pollution', 'air quality', 'tree', 'deforestation', 'factory emission', 'smoke',
        'dust', 'noise pollution', 'river pollution', 'lake', 'park', 'garden', 'green cover',
        'plastic ban', 'waste burning', 'industrial waste', 'chemical',
        // Hindi
        'प्रदूषण', 'वायु प्रदूषण', 'पेड़', 'वनों की कटाई', 'धुआं', 'धूल', 'ध्वनि प्रदूषण',
        'नदी प्रदूषण', 'झील', 'पार्क', 'बगीचा', 'प्लास्टिक', 'कचरा जलाना',
        // Telugu
        'కాలుష్యం', 'చెట్టు', 'పొగ', 'దుమ్ము', 'నది కాలుష్యం', 'పార్కు', 'ప్లాస్టిక్',
        // Tamil
        'மாசு', 'மரம்', 'புகை', 'தூசி', 'ஆற்று மாசு', 'பூங்கா', 'பிளாஸ்டிக்',
        // Kannada
        'ಮಾಲಿನ್ಯ', 'ಮರ', 'ಹೊಗೆ', 'ಧೂಳು', 'ನದಿ ಮಾಲಿನ್ಯ', 'ಉದ್ಯಾನ', 'ಪ್ಲಾಸ್ಟಿಕ್',
        // Marathi
        'प्रदूषण', 'झाड', 'धूर', 'धूळ', 'नदी प्रदूषण', 'उद्यान', 'प्लास्टिक',
        // Bengali
        'দূষণ', 'গাছ', 'ধোঁয়া', 'ধুলো', 'নদী দূষণ', 'পার্ক', 'প্লাস্টিক'
      ]
    }

    const urgencyKeywords = {
      Critical: [
        // English
        'death', 'dying', 'dead', 'life threatening', 'life', 'injury', 'injured', 'fire',
        'gas leak', 'explosion', 'drowning', 'crime in progress', 'shooting', 'murder',
        'collapsed', 'heart attack', 'bleeding', 'unconscious', 'electrocuted', 'trapped',
        // Hindi
        'मौत', 'मरना', 'जान', 'खतरा', 'चोट', 'आग', 'गैस लीक', 'विस्फोट', 'डूबना',
        'गोली', 'हत्या', 'दिल का दौरा', 'खून बह रहा', 'बेहोश', 'फंसे',
        // Telugu
        'మరణం', 'ప్రాణం', 'ప్రమాదం', 'గాయం', 'అగ్ని', 'పేలుడు', 'గుండెపోటు',
        // Tamil
        'மரணம்', 'உயிர்', 'ஆபத்து', 'காயம்', 'தீ', 'வெடிப்பு', 'மாரடைப்பு',
        // Kannada
        'ಸಾವು', 'ಜೀವ', 'ಅಪಾಯ', 'ಗಾಯ', 'ಬೆಂಕಿ', 'ಸ್ಫೋಟ',
        // Bengali
        'মৃত্যু', 'প্রাণ', 'বিপদ', 'আঘাত', 'আগুন', 'বিস্ফোরণ'
      ],
      High: [
        // English
        'urgent', 'immediate', 'asap', 'emergency', 'danger', 'collapse', 'flood', 'blocked',
        'severe', 'accident', 'broken', 'major', 'serious', 'critical condition', 'stranded',
        // Hindi
        'तत्काल', 'आपातकालीन', 'खतरनाक', 'गंभीर', 'टूटा', 'बाढ़', 'दुर्घटना', 'अवरुद्ध',
        // Telugu
        'అత్యవసరం', 'ప్రమాదకరం', 'తీవ్రమైన', 'విరిగింది', 'వరదలు', 'ప్రమాదం',
        // Tamil
        'அவசரம்', 'ஆபத்தான', 'தீவிர', 'உடைந்த', 'வெள்ளம்', 'விபத்து',
        // Kannada
        'ತುರ್ತು', 'ಅಪಾಯಕಾರಿ', 'ತೀವ್ರ', 'ಮುರಿದ', 'ಪ್ರವಾಹ', 'ಅಪಘಾತ',
        // Bengali
        'জরুরি', 'বিপজ্জনক', 'গুরুতর', 'ভাঙা', 'বন্যা', 'দুর্ঘটনা'
      ],
      Medium: [
        // English
        'days', 'soon', 'need attention', 'problem persists', 'ongoing', 'continued',
        'recurring', 'frequent', 'regular', 'multiple complaints', 'no response',
        'not fixed', 'pending', 'weeks', 'several',
        // Hindi
        'कई दिन', 'जल्दी', 'ध्यान', 'समस्या बनी हुई', 'बार-बार', 'जवाब नहीं',
        'ठीक नहीं', 'लंबित', 'हफ्ते',
        // Telugu
        'రోజులు', 'త్వరగా', 'సమస్య', 'పదేపదే', 'జవాబు లేదు',
        // Tamil
        'நாட்கள்', 'விரைவில்', 'பிரச்சனை', 'அடிக்கடி', 'பதில் இல்லை',
        // Bengali
        'দিন', 'শীঘ্র', 'সমস্যা', 'বারবার', 'উত্তর নেই'
      ],
      Low: [
        // English
        'routine', 'minor', 'small', 'slow', 'inconvenience', 'suggestion', 'request',
        'general', 'information', 'inquiry', 'feedback',
        // Hindi
        'छोटा', 'मामूली', 'सुझाव', 'जानकारी', 'अनुरोध', 'सामान्य',
        // Telugu
        'చిన్న', 'సూచన', 'సమాచారం', 'అభ్యర్థన',
        // Tamil
        'சிறிய', 'ஆலோசனை', 'தகவல்', 'கோரிக்கை',
        // Bengali
        'ছোট', 'সামান্য', 'পরামর্শ', 'তথ্য', 'অনুরোধ'
      ]
    }

    // ─── STEP 3: KEYWORD MATCHING ON COMBINED TEXT ──────────────────────
    const scoreCategory = (keywordsMap, fallback) => {
      const scores = {}
      for (const [cat, keys] of Object.entries(keywordsMap)) {
        for (const key of keys) {
          if (combinedText.includes(key.toLowerCase())) {
            scores[cat] = (scores[cat] || 0) + 1
          }
        }
      }
      const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
      return top ? top[0] : fallback
    }

    let department = scoreCategory(departmentKeywords, 'Other')
    let urgency = scoreCategory(urgencyKeywords, 'Low')

    // Prefer Health for clear medical emergencies
    if (/heart attack|cardiac arrest|chest pain|stroke|severe bleeding|medical emergency|unconscious|life-threatening/i.test(combinedText)) {
      department = 'Health'
      urgency = 'Critical'
    }

    // Urgency overrides
    if (/accident|collapsed|severe|दुर्घटना|गंभीर/i.test(combinedText)) {
      urgency = 'High'
    }

    if (department === 'Police' && /hit and run|killed|shooting|murder|हत्या|गोली|খুন|கொலை|ಕೊಲೆ/i.test(combinedText)) {
      urgency = 'Critical'
    }
    if (department === 'Rescue') {
      urgency = urgency === 'Low' ? 'High' : urgency
    }

    // ─── STEP 4: EXTRACT LOCATION ──────────────────────────────────────
    const extractLocation = () => {
      // Try English patterns
      const enMatch = text.match(/(?:near|at|in|beside|outside|opposite)\s+([A-Za-z0-9\s',.-]{5,80})/i)
      if (enMatch) return enMatch[1].trim()

      // Try Hindi location patterns
      const hiMatch = text.match(/(?:के पास|में|के सामने|के बगल में|पर)\s+(.{5,60})/i)
      if (hiMatch) return hiMatch[1].trim()

      // Try Telugu location patterns
      const teMatch = text.match(/(?:దగ్గర|లో|వద్ద)\s+(.{5,60})/i)
      if (teMatch) return teMatch[1].trim()

      // Try Tamil location patterns
      const taMatch = text.match(/(?:அருகில்|இல்|பக்கத்தில்)\s+(.{5,60})/i)
      if (taMatch) return taMatch[1].trim()

      // Fallback: look for common location words in any language
      const spl = text.split(/\n|\.|,/)
      return spl.find(s => /road|street|colony|area|block|sector|park|market|nagar|puram|pally|gali|chowk|rasta|marg|गली|चौक|मार्ग|నగర్|వీధి|தெரு|சாலை|রাস্তা/i.test(s))?.trim() || null
    }

    const location = extractLocation() || null

    // ─── STEP 5: GENERATE SUMMARY ──────────────────────────────────────
    const summary = (() => {
      const core = text.split(/[\.?\!]\s*/).filter(Boolean).slice(0, 2).join('. ')
      if (core.length < 20) return text.slice(0, 180)
      return core.length > 200 ? `${core.slice(0, 197)}...` : core
    })()

    // ─── STEP 6: GENERATE ACTION ITEMS ─────────────────────────────────
    const defaultActions = [
      'Inspect the issue on site',
      'Assign a responsible team',
      'Provide status update to the resident'
    ]

    const actionCandidates = []

    if (department === 'Roads') {
      actionCandidates.push('Repair or resurface the affected road stretch')
      actionCandidates.push('Install warning signs and barricade the hazard')
    }
    if (department === 'Water') {
      actionCandidates.push('Fix the water leakage and test supply pressure')
      actionCandidates.push('Clear blockages in the pipeline and drain')
    }
    if (department === 'Sanitation') {
      actionCandidates.push('Clean the garbage accumulation and service the drain')
      actionCandidates.push('Schedule frequent waste collection for the area')
    }
    if (department === 'Electricity') {
      actionCandidates.push('Inspect power infrastructure and repair fault')
      actionCandidates.push('Restore electricity and replace defective fittings')
    }
    if (department === 'Health') {
      actionCandidates.push('Arrange medical support and sanitation response')
      actionCandidates.push('Deploy health inspection team to assess public health risk')
    }
    if (department === 'Hospital') {
      actionCandidates.push('Dispatch medical team and ensure hospital bed availability')
      actionCandidates.push('Coordinate with nearby hospitals for emergency care')
    }
    if (department === 'Rescue') {
      actionCandidates.push('Mobilize rescue team and emergency services immediately')
      actionCandidates.push('Coordinate evacuation and search-and-rescue operations')
    }
    if (department === 'Police') {
      actionCandidates.push('Register the FIR and patrol the area immediately')
      actionCandidates.push('Dispatch nearest patrol unit and collect evidence')
    }
    if (department === 'Education') {
      actionCandidates.push('Notify the education officer and inspect the institution')
      actionCandidates.push('Ensure compliance with educational standards and student safety')
    }
    if (department === 'Transport') {
      actionCandidates.push('Inspect the transport service and take corrective action')
      actionCandidates.push('Coordinate with the transport authority for route/schedule fixes')
    }
    if (department === 'Municipal') {
      actionCandidates.push('Deploy municipal inspection team to verify the complaint')
      actionCandidates.push('Issue notice if violation found and initiate corrective action')
    }
    if (department === 'Environment') {
      actionCandidates.push('Conduct environmental survey and check pollution levels')
      actionCandidates.push('Issue notice to violators and enforce environmental norms')
    }

    const action_items = [...new Set([...actionCandidates, ...defaultActions])].slice(0, 3)

    // ─── STEP 7: RESOLUTION ETA ────────────────────────────────────────
    const estimated_resolution = urgency === 'Critical' ? '12 hours'
      : urgency === 'High' ? '24-48 hours'
      : urgency === 'Medium' ? '3-5 days'
      : '7-14 days'

    const language_detected = detectedLanguage || language || 'Unknown'

    const parsed = {
      summary,
      department,
      urgency,
      action_items,
      location,
      estimated_resolution,
      language_detected
    }

    // ─── STEP 8: SAVE TO DATABASE ──────────────────────────────────────
    const { supabase } = await import('../../lib/supabase')
    const { data: saved, error } = await supabase
      .from('complaints')
      .insert({
        raw_text: text,
        language: language || 'Unknown',
        summary: parsed.summary,
        department: parsed.department,
        urgency: parsed.urgency,
        action_items: parsed.action_items,
        location: parsed.location,
        estimated_resolution: parsed.estimated_resolution,
        language_detected: parsed.language_detected,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error))
      throw new Error(`Database error: ${error.message}`)
    }

    // ─── STEP 9: CRITICAL ALERT ────────────────────────────────────────
    if (parsed.urgency === 'Critical') {
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      await fetch(`${base}/api/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: saved })
      }).catch(e => console.error('Alert failed:', e))
    }

    res.status(200).json(saved)
  } catch (err) {
    console.error('Processing error:', err)
    res.status(500).json({ error: 'Processing failed', detail: err.message })
  }
}
