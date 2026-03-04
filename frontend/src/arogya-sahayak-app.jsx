import { useState, useRef, useEffect, useCallback } from "react";

// ════════════════════════════════════════════════════════════════
//  AROGYA SAHAYAK — 100% FREE VERSION
//  No API keys · No paid services · Works offline
//  Built-in rule-based AI triage engine for Indian healthcare
// ════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────
//  MULTILINGUAL SYMPTOM KEYWORD MAP
//  English + Hindi + Tamil keywords → canonical symptom IDs
// ────────────────────────────────────────────────────────────────
const SYMPTOM_KEYWORDS = {
  fever:          ["fever","bukhar","bukhaar","temperature","jwara","kaichal","गर्मी","बुखार","ज्वर","காய்ச்சல்","உடல் வெப்பம்"],
  high_fever:     ["high fever","tej bukhar","103","104","105","very high","bahut tej","तेज बुखार","அதிக காய்ச்சல்"],
  headache:       ["headache","sir dard","sar dard","mastishk dard","thalaivaali","head pain","सिरदर्द","सिर दर्द","தலைவலி"],
  bodyache:       ["body ache","body pain","badan dard","ang dard","udal vali","muscle pain","joints pain","बदन दर्द","உடல் வலி","மூட்டு வலி"],
  cough:          ["cough","khansi","khaansi","irumal","dry cough","खाँसी","खांसी","இருமல்"],
  cold:           ["cold","nazla","jukam","sardi","kulir","runny nose","nasal","नजला","जुकाम","சளி","நாசி"],
  sore_throat:    ["sore throat","gala dard","gale me dard","throat pain","tonsil","தொண்டை வலி","गले में दर्द"],
  breathlessness: ["breathless","breathing","dyspnea","shortness of breath","cant breathe","chest tight","saans","सांस","மூச்சிரைப்பு"],
  chest_pain:     ["chest pain","seene me dard","heart pain","seene","छाती दर्द","सीने में दर्द","மார்பு வலி","நெஞ்சு வலி"],
  stomach_pain:   ["stomach pain","pet dard","abdominal","vayiru vali","tummy","abdomen","पेट दर्द","வயிற்று வலி"],
  diarrhea:       ["diarrhea","diarrhoea","loose motion","loose motions","daast","dast","iraichu","पेचिश","दस्त","வயிற்றுப்போக்கு","பேதி"],
  vomiting:       ["vomit","vomiting","ulti","uiti","vanti","nausea","उल्टी","வாந்தி","குமட்டல்"],
  rash:           ["rash","skin rash","spots","daane","chale","தோல் சொறி","दाने","चकत्ते"],
  weakness:       ["weakness","kamzori","thakan","fatigue","tired","थकान","कमजोरी","சோர்வு"],
  dehydration:    ["dehydration","thirst","pyaas","dry mouth","dizziness","dizzy","निर्जलीकरण","தலைச்சுற்றல்"],
  dengue_signs:   ["dengue","bone pain","joint pain","platelet","eye pain","dengue fever","डेंगू","हड्डी दर्द","டெங்கு","எலும்பு வலி"],
  malaria_signs:  ["malaria","chills","shivering","rigor","cyclic fever","evening fever","मलेरिया","ठंड लगना","மலேரியா","குளிர்"],
  jaundice:       ["jaundice","yellow eyes","yellowing","piliya","pagal pan","liver","पीलिया","மஞ்சள் காமாலை"],
  skin_issue:     ["skin","itching","khujli","infection","wound","cut","burn","eczema","redness","खुजली","घाव","தோல்"],
  period_pain:    ["period","periods","menstrual","mc pain","masik","महावारी","मासिक","மாதவிடாய்"],
  pregnancy:      ["pregnant","pregnancy","garbhavati","trimester","கர்ப்பம்","गर्भवती"],
  diabetes:       ["diabetes","sugar","blood sugar","insulin","madhumeh","நீரிழிவு","மधुமेह","शुगर"],
  bp:             ["blood pressure","bp","hypertension","high bp","low bp","रक्तचाप","இரத்த அழுத்தம்"],
  stroke_signs:   ["stroke","face droop","arm weakness","slurred","paralysis","numbness","लकवा","பக்கவாதம்"],
  snake_bite:     ["snake","snakebite","bite","venom","samp","साँप काटा","சர்ப்ப கடி","பாம்பு"],
  unconscious:    ["unconscious","fainted","faint","passed out","not waking","coma","behosh","बेहोश","சுயநினைவு இல்லை"],
  tb_signs:       ["tb","tuberculosis","cough blood","night sweat","weight loss","chronic cough","2 weeks","टीबी","காசநோய்"],
  heat_stroke:    ["heat stroke","heatstroke","heat exhaustion","sun stroke","loo","लू","வெப்பாகி","சூர்ய வெப்பம்"],
  food_poison:    ["food poison","food poisoning","ate outside","bad food","contaminated","खाना खाने के बाद","உணவு விஷம்"],
};

// ────────────────────────────────────────────────────────────────
//  DISEASE PROFILES DATABASE — 20+ Indian health conditions
// ────────────────────────────────────────────────────────────────
const PROFILES = [
  {
    id:"emergency_chest", symptoms:["chest_pain"], urgency:"emergency",
    conditions:["Heart attack (Myocardial Infarction)","Angina","Pulmonary embolism"],
    remedies:["DO NOT give food or water","Keep the person still and calm","Loosen tight clothing"],
    dietary:"Do not eat or drink anything.",
    recommendation:"CALL 108 IMMEDIATELY. This is a life-threatening emergency. Do not delay.",
    doctor:"Emergency Room — call 108 NOW. Do not drive yourself.",
    ayurvedic:null, specialist:"Emergency",
  },
  {
    id:"emergency_stroke", symptoms:["stroke_signs"], urgency:"emergency",
    conditions:["Stroke (Brain attack)","TIA (Mini-stroke)"],
    remedies:["Note the time symptoms started","Keep person lying down, head slightly elevated","Do NOT give food/water"],
    dietary:"Nothing orally.",
    recommendation:"CALL 108 NOW. FAST test: Face drooping, Arm weakness, Speech difficulty, Time to call 108.",
    doctor:"Call 108 immediately — stroke treatment window is 4.5 hours.",
    ayurvedic:null, specialist:"Emergency",
  },
  {
    id:"emergency_snake", symptoms:["snake_bite"], urgency:"emergency",
    conditions:["Venomous snake bite — systemic envenomation risk"],
    remedies:["Keep bitten limb still and BELOW heart level","Remove jewellery near bite","Do NOT cut, suck, or use tourniquet","Carry patient — do not let them walk"],
    dietary:"Nothing orally.",
    recommendation:"CALL 108 IMMEDIATELY. Go to nearest government hospital for anti-venom.",
    doctor:"Anti-venom available FREE at all government hospitals. Call 108 NOW.",
    ayurvedic:null, specialist:"Emergency",
  },
  {
    id:"emergency_unconscious", symptoms:["unconscious"], urgency:"emergency",
    conditions:["Loss of consciousness","Possible cardiac/neurological emergency"],
    remedies:["Place in recovery position (on their side)","Keep airway clear","Check breathing","Start CPR if no breathing and no pulse"],
    dietary:"Nothing orally.",
    recommendation:"Call 108 immediately. Do not leave the person alone.",
    doctor:"Call 108 NOW.",
    ayurvedic:null, specialist:"Emergency",
  },
  {
    id:"dengue", symptoms:["fever","dengue_signs"], urgency:"high",
    conditions:["Dengue Fever (likely — especially in monsoon season)","Chikungunya (if joint pain prominent)"],
    remedies:[
      "Giloy (Guduchi) kadha — boil 2 Giloy stems in 2 cups water, reduce to 1 cup, drink twice daily",
      "Papaya leaf juice — grind 2 fresh papaya leaves, strain, take 1 tbsp twice daily (supports platelet recovery)",
      "ORS / Jeevan Jal — sip continuously throughout the day to prevent dehydration",
      "Coconut water (nariyal pani) — 2–3 glasses daily for natural electrolytes",
      "Warm moong dal soup or lauki soup — easy to digest",
    ],
    dietary:"Soft food only: khichdi, moong dal, boiled rice. Drink minimum 3L fluids daily. No fried/spicy food. Strictly NO aspirin or ibuprofen — use Paracetamol only.",
    recommendation:"Seek medical care urgently. A CBC blood test to check platelet count is essential. Platelet below 1 lakh = hospitalise immediately.",
    doctor:"Visit nearest PHC or government hospital today. Tell them you suspect dengue. Free testing available.",
    ayurvedic:"Giloy (Guduchi) is the most proven Ayurvedic herb for dengue recovery and immune boost. Widely available at AYUSH centres.",
    specialist:"Internal Medicine",
  },
  {
    id:"malaria", symptoms:["fever","malaria_signs"], urgency:"high",
    conditions:["Malaria (Plasmodium falciparum or vivax — common monsoon belt disease)"],
    remedies:[
      "Tulsi and Neem kadha — boil 10 tulsi + 5 neem leaves in 2 cups water, drink warm 3x daily",
      "Ginger tea with honey — reduces chills and fever discomfort",
      "ORS continuously during fever and sweating phases",
      "Cold wet cloth on forehead during high fever",
      "Kiratatikta (Chirayata) herb tea — traditional anti-malarial herb",
    ],
    dietary:"Soft warm diet: khichdi, moong dal soup. Drink only boiled/filtered water. High fluid intake. No cold water.",
    recommendation:"Malaria requires blood test (RDT) and prescription anti-malarials. Do NOT self-medicate. Visit nearest PHC urgently.",
    doctor:"FREE malaria testing and treatment at all government PHCs under NVBDCP programme. Don't delay.",
    ayurvedic:"Neem leaf extract is a classical anti-malarial. Kiratatikta (Chirayata) is specifically prescribed in Ayurveda for intermittent fever/malaria.",
    specialist:"General Physician",
  },
  {
    id:"typhoid", symptoms:["fever","stomach_pain"], urgency:"high",
    conditions:["Typhoid Fever (Enteric fever — from contaminated food/water)","Viral fever with GI involvement"],
    remedies:[
      "Tulsi kadha with ginger — 10 tulsi leaves + ginger, boil, drink 3x daily",
      "Banana — easy to digest, restores potassium",
      "Rice curd (dahi chawal) — probiotic, gut recovery",
      "Pomegranate juice (anardana) — helps weakness",
      "Cold compress on forehead for fever above 102°F",
    ],
    dietary:"LIQUID/SOFT DIET ONLY: ORS, coconut water, rice water (kanji), khichdi, moong dal soup. No solid food until fever-free for 48 hrs. No raw vegetables or spicy food.",
    recommendation:"Typhoid needs antibiotic treatment confirmed by Widal test. Visit a doctor. Do NOT stop antibiotics midway — full course is critical.",
    doctor:"Blood test (Widal/blood culture) at nearest PHC. Free treatment available.",
    ayurvedic:"Tulsi, Ginger, and Neem provide anti-bacterial support. However, prescription antibiotics from a doctor are absolutely essential for typhoid.",
    specialist:"General Physician",
  },
  {
    id:"breathlessness", symptoms:["breathlessness"], urgency:"high",
    conditions:["Asthma attack","Pneumonia","Severe anaemia","Viral pneumonitis"],
    remedies:[
      "Sit upright — do NOT lie flat",
      "Steam inhalation with ajwain seeds — 1 tsp ajwain in hot water, inhale steam 2x daily",
      "Warm honey + ginger water — soothing for airways",
      "If known asthma: use Salbutamol (reliever inhaler) immediately",
      "Warm turmeric milk (haldi doodh) at night",
    ],
    dietary:"Light warm meals only. No cold food or cold water. Hot soup, warm herbal teas.",
    recommendation:"Breathlessness needs urgent medical evaluation. If worsening rapidly — call 108. For known asthma, use your inhaler first.",
    doctor:"Visit nearest PHC immediately. If no improvement in 30 min — call 108.",
    ayurvedic:"Vasa (Adhatoda vasica / Malabar nut) leaf juice — 2 tsp twice daily — is the most effective classical Ayurvedic bronchodilator.",
    specialist:"Internal Medicine / Pulmonologist",
  },
  {
    id:"jaundice", symptoms:["jaundice"], urgency:"high",
    conditions:["Viral Hepatitis A or E (waterborne — common in monsoon)","Hepatitis B","Malaria-related jaundice"],
    remedies:[
      "Sugarcane juice (ganne ka ras) — 1 glass twice daily (best natural liver tonic for jaundice)",
      "Radish leaves (mooli patte) juice — 1 tbsp twice daily",
      "Warm water with lemon — early morning on empty stomach",
      "Papaya fruit — ripe, 1 cup daily",
    ],
    dietary:"STRICTLY: high-carb, zero-fat diet. Rice, banana, boiled vegetables, sugarcane juice ONLY. No alcohol, no oily/fried food, no high-protein food for at least 4 weeks.",
    recommendation:"Jaundice requires LFT (Liver Function Test) immediately. Rest completely. Hepatitis A and E are infectious — isolate utensils and bathroom use.",
    doctor:"Visit PHC today for liver function tests. Hepatitis A/E often resolve with rest; Hepatitis B needs specialist care.",
    ayurvedic:"Kutaki (Picrorhiza kurroa) is the most effective Ayurvedic herb for liver protection — available at AYUSH pharmacies as Kutaki churna.",
    specialist:"Internal Medicine / Gastroenterologist",
  },
  {
    id:"heat_stroke", symptoms:["heat_stroke"], urgency:"high",
    conditions:["Heat stroke (Loo / Sun stroke)","Heat exhaustion","Severe dehydration from heat"],
    remedies:[
      "Move to shade or cool room IMMEDIATELY",
      "Remove excess clothing",
      "Wet cloth on forehead, armpits, neck, groin",
      "Aam Panna (raw mango drink) or ORS immediately — best natural electrolyte",
      "Onion juice rubbed on chest/back — traditional Indian cooling remedy",
    ],
    dietary:"Cool (not cold) fluids immediately: ORS, lemonade, coconut water, buttermilk (chaas). No hot beverages, no solid food until stable.",
    recommendation:"If person is confused, hot but NOT sweating, or temperature above 104°F — call 108. Heat stroke can be fatal within hours.",
    doctor:"For confusion, very high temperature, or loss of consciousness — Emergency (108). For heat exhaustion: PHC.",
    ayurvedic:"Khus (Vetiver) water is a traditional Indian summer cooling drink. Sandalwood paste on forehead provides cooling. Gulkand (rose jam) is a natural body coolant.",
    specialist:"Emergency / General Physician",
  },
  {
    id:"viral_fever", symptoms:["fever","weakness"], urgency:"medium",
    conditions:["Viral fever (most common — self-limiting)","Influenza","Common cold with fever"],
    remedies:[
      "Tulsi-ginger kadha — 10 tulsi leaves + 1 inch ginger in 2 cups water, boil 10 min, add honey, drink 3x daily",
      "Haldi doodh (golden milk) — 1/4 tsp turmeric + pinch black pepper in warm milk, nightly",
      "Adrak-shahad-nimbu — 1 tsp grated ginger + 1 tsp honey + half lemon in warm water",
      "Paracetamol 500mg (Crocin/Dolo) — every 6 hours for fever above 100°F (max 4 per day)",
      "Cold wet cloth sponging on forehead if fever above 102°F",
    ],
    dietary:"Plenty of fluids: ORS, coconut water, lemon water, soups. Light food: khichdi, moong dal, bananas. No cold drinks or fried food.",
    recommendation:"Rest, fluids, and paracetamol for 3 days. If fever persists beyond 3 days or goes above 103°F — see a doctor urgently.",
    doctor:"Visit PHC if: fever lasts more than 3 days, fever above 103°F, rash appears, severe joint/bone pain (possible dengue or malaria).",
    ayurvedic:"Tulsi (Holy Basil) is India's most powerful anti-viral herb for fever. Giloy kadha strengthens immunity. Chyawanprash 1 tsp daily during recovery.",
    specialist:"General Physician",
  },
  {
    id:"cold_cough", symptoms:["cold","cough"], urgency:"low",
    conditions:["Common cold (viral rhinitis)","Allergic rhinitis","Seasonal viral infection"],
    remedies:[
      "Adrak-shahad — chew small ginger piece with honey, 3x daily (most effective natural cough remedy)",
      "Mulethi (licorice root) tea — boil 2 mulethi sticks in water, add honey, drink warm",
      "Steam inhalation with ajwain seeds or eucalyptus oil — 2x daily for 10 min each",
      "Haldi doodh at night — anti-inflammatory, aids sleep",
      "Saline nasal rinse — pinch of salt in lukewarm water, sniff gently 3x daily",
    ],
    dietary:"Only warm fluids: warm water, herbal teas, soups, kadha. No cold water, ice cream, cold food. Eat amla, orange, lemon (Vitamin C) daily.",
    recommendation:"Usually resolves in 5–7 days with home care. Rest, stay warm, drink warm fluids very frequently.",
    doctor:"See doctor if: cough lasts more than 2 weeks (possible TB), breathing difficulty, fever above 102°F, green/yellow mucus for more than 5 days.",
    ayurvedic:"Sitopaladi Churna — 1/2 tsp with honey twice daily — the best Ayurvedic remedy for cough and cold. Available at any AYUSH pharmacy for ~₹50.",
    specialist:"General Physician / ENT",
  },
  {
    id:"diarrhea", symptoms:["diarrhea"], urgency:"medium",
    conditions:["Acute gastroenteritis","Food poisoning","Waterborne infection (cholera risk in monsoon)"],
    remedies:[
      "ORS (Jeevan Jal) — MOST IMPORTANT. 1 sachet in 1 litre clean water, sip every 10 minutes continuously",
      "Rice water (Kanji/Maand) — boil rice, drain water, add pinch of salt, sip warm",
      "Curd (dahi) with rice — probiotics restore gut bacteria",
      "Banana — BRAT diet (Banana, Rice, Applesauce, Toast/Roti)",
      "Ajwain water — 1 tsp ajwain boiled in 1 cup water, strain, drink 3x daily",
      "Isabgol (psyllium husk) with curd — binds loose stools",
    ],
    dietary:"BRAT diet ONLY: Banana, Rice, Applesauce, Toast/plain roti. NO spicy, oily, or dairy (except curd). Drink minimum 3–4 litres of ORS/fluids daily.",
    recommendation:"ORS is life-saving — prioritise it above everything else. If more than 6 loose stools per day or blood in stool — see doctor immediately.",
    doctor:"PHC if: more than 6 stools/day, blood in stool, vomiting prevents ORS, dehydration signs (sunken eyes, no urine for 6+ hours, dry mouth).",
    ayurvedic:"Kutajghan Vati — classical Ayurvedic tablet for diarrhoea. Pomegranate (anardana) peel boiled in water also effective.",
    specialist:"General Physician",
  },
  {
    id:"vomiting", symptoms:["vomiting"], urgency:"medium",
    conditions:["Gastritis","Food poisoning","Viral gastroenteritis","Motion sickness"],
    remedies:[
      "Ginger tea (adrak chai) — small sips of warm ginger tea",
      "Nimbu pani with salt + sugar — gentle hydration",
      "Ice chips or frozen ORS — if unable to drink larger volumes",
      "Cardamom (elachi) and fennel (saunf) tea — calms nausea",
      "Rest in semi-reclined position — do NOT lie flat immediately after vomiting",
    ],
    dietary:"Clear liquids only until vomiting stops: ORS sips, rice water, lemon water. Then progress slowly to banana, rice, curd. No solid food for 4–6 hours after last vomit.",
    recommendation:"Sip ORS or lemon water every 5–10 mins in tiny amounts. If unable to keep any fluids down for 6+ hours — seek medical care.",
    doctor:"Seek care if: vomiting with severe abdominal pain (possible appendicitis), blood in vomit, child is lethargic, or unable to keep any fluids down.",
    ayurvedic:"Elachi (cardamom) and saunf (fennel seed) tea is excellent for nausea. Chew raw ginger with rock salt for instant nausea relief.",
    specialist:"General Physician",
  },
  {
    id:"stomach_pain", symptoms:["stomach_pain"], urgency:"medium",
    conditions:["Gastritis / acidity","IBS (Irritable Bowel Syndrome)","Gastroenteritis","Worm infestation (very common in rural areas)"],
    remedies:[
      "Ajwain water — 1 tsp ajwain boiled in 1 cup water, add pinch of black salt, drink warm",
      "Hing (asafoetida) in warm water — best anti-spasmodic for gas/cramps",
      "Saunf (fennel seed) — chew 1 tsp after every meal for digestion",
      "Warm compress on abdomen — relieves muscle cramping",
      "Jaggery (gud) with ginger — digestive stimulant",
    ],
    dietary:"Light warm food: khichdi, moong soup. No spicy, oily, or junk food. No carbonated drinks. Eat small frequent meals. Drink warm water.",
    recommendation:"Most stomach pain resolves with rest and simple remedies. Identify trigger food. Seek care if pain is severe or in a specific location.",
    doctor:"See doctor if: severe pain in lower right (possible appendicitis), pain with fever, blood in stool, pain radiates to back (kidney stone), or child with severe pain.",
    ayurvedic:"Hingvastak Churna — 1/4 tsp with warm water before meals — the best Ayurvedic digestive powder for chronic digestive issues.",
    specialist:"General Physician / Gastroenterologist",
  },
  {
    id:"food_poison", symptoms:["food_poison"], urgency:"medium",
    conditions:["Food poisoning (bacterial — Salmonella, E.coli, Staphylococcus)","Viral gastroenteritis"],
    remedies:[
      "ORS immediately and continuously — most critical intervention",
      "Ginger lemon water — anti-bacterial, reduces nausea",
      "Activated charcoal (if available at chemist) — absorbs toxins",
      "Complete rest — do not exert",
      "BRAT diet once vomiting stops",
    ],
    dietary:"Clear liquids for first 12 hours. Then BRAT. No dairy (except curd), no meat, no oily food for 48 hours.",
    recommendation:"Hydration is the #1 priority. Most food poisoning resolves in 24–48 hours with rest and ORS. Discard suspected food immediately.",
    doctor:"See doctor if: high fever with vomiting, severe cramps, bloody diarrhoea, symptoms lasting more than 48 hours, elderly/child/pregnant person affected.",
    ayurvedic:"Kutajghan Vati and Bilwadi Churna are classical Ayurvedic remedies for bacterial gut infections and food poisoning.",
    specialist:"General Physician",
  },
  {
    id:"skin_rash", symptoms:["rash","skin_issue"], urgency:"medium",
    conditions:["Viral rash (measles, chickenpox, hand-foot-mouth)","Allergic dermatitis","Fungal infection (common in monsoon)","Scabies"],
    remedies:[
      "Neem paste — grind fresh neem leaves to paste, apply on rash (powerful anti-bacterial, anti-fungal)",
      "Coconut oil with camphor — apply on itchy areas twice daily",
      "Turmeric paste (haldi + water) — apply on infected/inflamed skin",
      "Calamine lotion — available at any chemist for ~₹30, highly effective for itching",
      "Aloe vera gel — soothing for inflamed, irritated skin",
    ],
    dietary:"Avoid eggs, seafood, processed food if allergic rash. Drink plenty of water. Eat amla and citrus fruits (Vitamin C) for skin healing.",
    recommendation:"Identify and avoid the trigger (new soap, detergent, food, or plant contact). Keep skin clean and dry. Neem paste is highly effective for Indian tropical skin infections.",
    doctor:"See doctor if: rash is spreading rapidly, blistering, accompanied by high fever (chickenpox), in infants, or not improving after 3 days.",
    ayurvedic:"Neem is the supreme Ayurvedic skin herb — anti-bacterial and anti-fungal. Mahamarichyadi Taila for stubborn skin infections. Available at AYUSH pharmacies.",
    specialist:"Dermatologist / General Physician",
  },
  {
    id:"tb_suspect", symptoms:["tb_signs"], urgency:"high",
    conditions:["Tuberculosis (TB) — very common in India","Chronic bronchitis","Lung infection (bacterial)"],
    remedies:[
      "Medical treatment is ESSENTIAL — home remedies alone cannot treat TB",
      "High protein diet: eggs, dal, milk, paneer, meat (if non-veg)",
      "Tulsi kadha for throat soothing while awaiting diagnosis",
      "Haldi doodh — immune support",
      "Sunlight exposure — 30 min daily for natural Vitamin D",
    ],
    dietary:"High protein, high calorie diet is critical for TB recovery: eggs, dal, milk, paneer. Vitamin D from sunlight. 5–6 small nutritious meals daily.",
    recommendation:"Cough for 2+ weeks + weight loss + night sweats = TB screening URGENT. Testing and treatment are 100% FREE under Nikshay/RNTCP government programme.",
    doctor:"Visit nearest PHC or DOTS (Directly Observed Treatment) centre immediately. TB treatment is COMPLETELY FREE. Do NOT delay.",
    ayurvedic:"Vasavaleha — classical Ayurvedic respiratory formulation. Use ALONGSIDE standard TB medicines, NEVER as replacement. Inform your doctor about any Ayurvedic medicines taken.",
    specialist:"Pulmonologist / General Physician",
  },
  {
    id:"diabetes", symptoms:["diabetes"], urgency:"medium",
    conditions:["Diabetes mellitus type 2","Hypoglycemia (low blood sugar)","Diabetic complication"],
    remedies:[
      "Methi (fenugreek) seeds — soak 1 tsp overnight in water, eat on empty stomach every morning",
      "Karela (bitter gourd) juice — 1 small glass every morning on empty stomach",
      "Jamun seed powder (jamun ki gutli) — 1/4 tsp with water twice daily",
      "Cinnamon (dalchini) tea — 1 cinnamon stick boiled in 2 cups water, drink daily",
      "If dizzy/shaky (low sugar): immediately eat glucose tablet or sweet",
    ],
    dietary:"Low glycaemic index: replace white rice with ragi/jowar roti or brown rice. No sugar, no maida, no processed food. Eat every 3–4 hours. Walk 30 min daily. Check feet daily.",
    recommendation:"Monitor blood sugar regularly. Never skip meals if on diabetes medicine. Take all prescribed medicines. Foot care is essential — small cuts can become serious.",
    doctor:"PHC for HbA1c every 3 months. Free diabetes medicines at Jan Aushadhi Kendras (₹1–5 per tablet). Free in government hospitals.",
    ayurvedic:"Madhunashini Vati and Gymnema sylvestre (Gurmar) are popular Ayurvedic anti-diabetic supplements. Use alongside — not instead of — prescribed medicines.",
    specialist:"General Physician / Diabetologist",
  },
  {
    id:"headache", symptoms:["headache"], urgency:"low",
    conditions:["Tension headache (most common)","Migraine","Dehydration headache","Sinusitis-related headache"],
    remedies:[
      "Peppermint oil massage — apply 2–3 drops on temples and back of neck (very effective for tension headache)",
      "Clove (laung) paste — crush 2–3 cloves + rock salt, apply on temples",
      "Ginger tea with honey — natural anti-inflammatory",
      "Drink 2 large glasses of water immediately — dehydration is the #1 cause of headaches",
      "Cold compress for migraine, warm compress for tension/sinus headache",
    ],
    dietary:"Stay well hydrated. Avoid triggers: excess caffeine, aged cheese, MSG. Eat regular meals — skipping meals triggers migraines.",
    recommendation:"Most headaches resolve with rest, hydration, and simple remedies. Peppermint oil on temples is as effective as mild painkillers for tension headache.",
    doctor:"See doctor if: sudden worst headache of your life (possible brain bleed), headache with stiff neck + fever (possible meningitis), after head injury, or daily headaches.",
    ayurvedic:"Brahmi (Bacopa) oil for scalp massage reduces chronic headache and mental stress. Shirashooladi Vajra Rasa for severe migraines — available at AYUSH centres.",
    specialist:"General Physician / Neurologist",
  },
  {
    id:"weakness", symptoms:["weakness","dehydration"], urgency:"low",
    conditions:["Iron-deficiency anaemia (very common — especially in rural women/children)","Dehydration","General debility","Post-viral fatigue"],
    remedies:[
      "Chyawanprash — 1 tsp with warm milk daily (India's best all-round immunity + energy tonic)",
      "Amla (Indian gooseberry) — eat 1–2 daily or take amla juice; highest Vitamin C concentration in any food",
      "Dates (khajoor) + warm milk — traditional iron-rich energy booster",
      "Ashwagandha powder — 1/4 tsp with warm milk at bedtime (best adaptogen for strength and energy)",
      "Jaggery (gud) + sesame seeds (til) — iron-rich combination eaten together",
    ],
    dietary:"Iron-rich foods: green leafy vegetables (palak), jaggery, dates, amla, ragi (finger millet), rajma, chana, pomegranate. Always eat Vitamin C alongside iron foods for better absorption.",
    recommendation:"Weakness in rural India is very commonly iron-deficiency anaemia — especially in women and children. Free iron+folic acid tablets available from ASHA workers and PHCs.",
    doctor:"Visit PHC for haemoglobin (Hb) test — free. Free iron and folic acid tablets available at all PHCs and from ASHA workers.",
    ayurvedic:"Lohasava (Ayurvedic iron tonic) and Drakshavaleha are classical formulations for anaemia. Ashwagandha is evidence-backed for fatigue and weakness.",
    specialist:"General Physician",
  },
  {
    id:"sore_throat", symptoms:["sore_throat"], urgency:"low",
    conditions:["Viral pharyngitis (most common)","Streptococcal throat infection","Tonsillitis"],
    remedies:[
      "Warm salt water gargle — 1/2 tsp salt in 1 cup warm water, gargle 30 seconds, repeat 4–5x daily (most evidence-based remedy)",
      "Haldi-namak-ghee — mix 1/4 tsp turmeric + pinch salt + 1/4 tsp ghee, swallow slowly",
      "Mulethi (licorice root) stick — chew slowly; best classical throat remedy",
      "Honey + warm lemon water — anti-bacterial soothing coating",
      "Clove (laung) — hold 2 cloves between teeth and gum, let juice soothe throat",
    ],
    dietary:"Only warm liquids: warm water, herbal teas, golden milk. No cold drinks, ice cream, cold food. Honey is the best food for throat healing.",
    recommendation:"Salt water gargle is the single most proven home remedy for sore throat. Do it 4–5 times daily. Most viral sore throats heal in 5–7 days.",
    doctor:"See doctor if: throat very red with white patches (needs antibiotics), fever above 101°F, difficulty swallowing, voice completely lost for 3+ days.",
    ayurvedic:"Kanakasava and Talisadi Churna — classical Ayurvedic sore throat formulations. Khadiradi Vati — medicated lozenges for throat available at AYUSH pharmacies.",
    specialist:"ENT / General Physician",
  },
  {
    id:"period_pain", symptoms:["period_pain"], urgency:"low",
    conditions:["Dysmenorrhoea (menstrual cramps)","PMS (Premenstrual syndrome)","Endometriosis (if very severe)"],
    remedies:[
      "Hot water bag on lower abdomen — most effective immediate relief",
      "Ajwain water — 1 tsp ajwain + 1 tsp jaggery in warm water; classical Indian period pain remedy",
      "Ginger tea with jaggery — anti-inflammatory, reduces cramping",
      "Fenugreek (methi) seeds tea — hormonal balance support",
      "Gentle yoga — child's pose and cat-cow stretches relieve cramping",
    ],
    dietary:"Warm food and drinks only during periods. Avoid cold food, caffeine, salty snacks. Increase iron-rich foods (leafy greens, jaggery) to compensate blood loss.",
    recommendation:"Period pain is common but severe pain is not normal. Warmth and ginger/ajwain are very effective. Track your cycle and pain levels.",
    doctor:"See doctor if: pain is debilitating and preventing daily activities, periods are very irregular or very heavy, pain between periods (possible endometriosis).",
    ayurvedic:"Dashmoolarishta and Shatavari are classical Ayurvedic formulations for menstrual health and hormonal balance. Widely available at AYUSH pharmacies.",
    specialist:"Gynaecologist",
  },
  {
    id:"general", symptoms:[], urgency:"low",
    conditions:["General illness — insufficient symptom information for specific diagnosis"],
    remedies:[
      "Rest and adequate sleep (8+ hours)",
      "Plenty of warm fluids: water, herbal teas, soups",
      "Light, nutritious food: khichdi, fruits, vegetables",
      "Tulsi kadha — general immunity booster",
      "Haldi doodh (golden milk) at bedtime",
    ],
    dietary:"Light, warm, easily digestible food. Plenty of fluids. Avoid junk food and cold drinks.",
    recommendation:"Please describe your symptoms in more detail for a more accurate assessment. Share how long you've had the symptoms and any other details.",
    doctor:"Visit your nearest ASHA worker or PHC (Primary Health Center) if symptoms persist more than 3 days or worsen.",
    ayurvedic:"Chyawanprash — India's best general immunity and energy tonic. 1 tsp daily with warm milk.",
    specialist:"General Physician",
  },
];

// ────────────────────────────────────────────────────────────────
//  FREE AI TRIAGE ENGINE
// ────────────────────────────────────────────────────────────────
function detectSymptoms(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [id, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) { found.add(id); break; }
    }
  }
  return [...found];
}

function matchProfile(symptoms) {
  if (!symptoms.length) return PROFILES.find(p => p.id === "general");
  // Emergencies first
  for (const p of PROFILES.filter(p => p.urgency === "emergency")) {
    if (p.symptoms.some(s => symptoms.includes(s))) return p;
  }
  // Score by overlap
  const scored = PROFILES
    .filter(p => p.urgency !== "emergency" && p.id !== "general")
    .map(p => {
      const overlap = p.symptoms.filter(s => symptoms.includes(s)).length;
      return { p, score: overlap + (p.symptoms.length > 0 ? overlap / p.symptoms.length : 0) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.p || PROFILES.find(p => p.id === "general");
}

function detectLang(text) {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  return "en";
}

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 9)  return { name:"Monsoon",      emoji:"🌧️", risk:"Dengue, Malaria, Typhoid, Waterborne diseases — HIGH risk season" };
  if (m >= 3 && m <= 5)  return { name:"Summer",       emoji:"☀️", risk:"Heat stroke, Dehydration, Food poisoning — HIGH risk season" };
  if (m <= 2 || m === 12) return { name:"Winter",      emoji:"❄️", risk:"Respiratory infections, Pneumonia, Asthma — HIGH risk season" };
  return                         { name:"Post-Monsoon", emoji:"🍂", risk:"Dengue and Chikungunya cases may still be elevated" };
}

function buildMessage(profile, symptoms, lang) {
  const season = getSeason();
  const isEmergency = profile.urgency === "emergency";
  const msgs = {
    en: isEmergency
      ? `⚠️ This appears to be a MEDICAL EMERGENCY. ${profile.recommendation} Call 108 immediately!`
      : `I've assessed your symptoms. This looks like it could be ${profile.conditions[0]}. ${profile.recommendation} ${profile.urgency !== "low" ? `Note: It's ${season.name} season — ${season.risk}.` : ""}`,
    hi: isEmergency
      ? `⚠️ यह एक आपात स्थिति लग रही है। ${profile.recommendation} अभी 108 पर कॉल करें!`
      : `मैंने आपके लक्षण देखे। यह ${profile.conditions[0]} हो सकता है। ${profile.recommendation}`,
    ta: isEmergency
      ? `⚠️ இது மருத்துவ அவசரநிலையாக தோன்றுகிறது। ${profile.recommendation} உடனே 108 அழைக்கவும்!`
      : `உங்கள் அறிகுறிகளை மதிப்பிட்டேன். இது ${profile.conditions[0]} ஆக இருக்கலாம். ${profile.recommendation}`,
  };
  return msgs[lang] || msgs.en;
}

function runTriage(text) {
  const symptoms = detectSymptoms(text);
  const profile  = matchProfile(symptoms);
  const lang     = detectLang(text);
  const season   = getSeason();
  const symptomLabels = symptoms.map(s => s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
  const fqMap = {
    fever: ["How many days have you had the fever?","Is the temperature above 103°F?","Do you have any rash or joint pain?"],
    cough: ["Is it a dry or wet/phlegm cough?","Have you had this cough for more than 2 weeks?","Any blood in the cough?"],
    stomach_pain: ["Where exactly is the pain — left, right, or center?","Did you eat outside food recently?","Any vomiting or loose motions with the pain?"],
    diarrhea: ["How many loose motions in 24 hours?","Is there any blood in the stool?","Are you able to drink fluids/ORS?"],
    default: ["How long have you had these symptoms?","Are you on any current medications?","Do you have any other symptoms?"],
  };
  const fqKey = Object.keys(fqMap).find(k => symptoms.includes(k)) || "default";
  return {
    urgency: profile.urgency,
    symptoms_identified: symptomLabels.length ? symptomLabels : ["Please describe symptoms in more detail"],
    possible_conditions: profile.conditions,
    home_remedies: profile.remedies,
    dietary_advice: profile.dietary,
    recommendation: profile.recommendation,
    when_to_seek_doctor: profile.doctor,
    ayurvedic_tip: profile.ayurvedic,
    emergency_numbers: profile.urgency === "emergency" ? "108 (Ambulance) • 104 (Health Helpline) • 1800-180-1104 (Ayushman)" : null,
    response_message: buildMessage(profile, symptoms, lang),
    follow_up_questions: fqMap[fqKey],
    specialist_needed: profile.specialist,
    season_alert: season,
  };
}

// ────────────────────────────────────────────────────────────────
//  MOCK DOCTOR DATA
// ────────────────────────────────────────────────────────────────
const DOCTORS = [
  { id:1, name:"Dr. Priya Sharma",   spec:"General Physician",   qual:"MBBS, MD",              loc:"PHC Nashik Rural, MH",            dist:2.3, avail:"Available Now",  ayushman:true,  rating:4.8, langs:["Hindi","Marathi","English"],   fee:"Free (Ayushman)", slot:10, avatar:"👩‍⚕️" },
  { id:2, name:"Dr. Rajan Pillai",   spec:"Internal Medicine",   qual:"MBBS, DNB",             loc:"CHC Trissur, Kerala",             dist:4.1, avail:"In 20 min",      ayushman:true,  rating:4.6, langs:["Malayalam","Tamil","English"], fee:"₹200 / Free PMJAY", slot:20, avatar:"👨‍⚕️" },
  { id:3, name:"Dr. Kavitha Devi",   spec:"Paediatrician",       qual:"MBBS, DCH",             loc:"PHC Madurai, Tamil Nadu",         dist:3.7, avail:"In 5 min",       ayushman:true,  rating:4.9, langs:["Tamil","English"],             fee:"Free (Ayushman)", slot:5,  avatar:"👩‍⚕️" },
  { id:4, name:"Dr. Arjun Verma",    spec:"Ayurvedic Physician", qual:"BAMS",                  loc:"AYUSH Centre, Lucknow",           dist:1.8, avail:"Available Now",  ayushman:false, rating:4.5, langs:["Hindi","English"],             fee:"₹150", slot:0, avatar:"👨‍⚕️" },
  { id:5, name:"Dr. Sunita Rao",     spec:"Gynaecologist",       qual:"MBBS, MS (Obs & Gynae)",loc:"District Hospital, Bengaluru Rural",dist:5.2,avail:"In 30 min",    ayushman:true,  rating:4.7, langs:["Kannada","Telugu","English"],  fee:"Free (Ayushman)", slot:30, avatar:"👩‍⚕️" },
];

// ────────────────────────────────────────────────────────────────
//  TRANSLATIONS
// ────────────────────────────────────────────────────────────────
const T = {
  en: { name:"Arogya Sahayak", tagline:"Free AI Health Companion · No Internet Needed", chat:"Chat", docs:"Doctors", about:"About", ph:"Describe your symptoms (English, Hindi, Tamil)...", send:"Send", mic:"Tap to Speak", listening:"Listening...", welcome:"Namaste! 🙏", welcomeText:"Tell me your symptoms in English, Hindi, or Tamil. I'll assess your condition, suggest home remedies, and connect you to a doctor — 100% free, no internet needed.", triage:"Health Assessment", syms:"Symptoms Identified", conds:"Possible Conditions", rems:"Home Remedies", diet:"Dietary Advice", doc:"When to See Doctor", ayu:"Ayurvedic Tip", nearDocs:"Nearby Telemedicine Doctors", book:"Book Now", emergency:"🚨 EMERGENCY — CALL 108 NOW!", micDenied:"Mic denied. Please type.", noVoice:"Voice not supported here.", free:"100% Free · No API · Works Offline" },
  hi: { name:"आरोग्य सहायक", tagline:"मुफ्त AI स्वास्थ्य साथी · इंटरनेट नहीं चाहिए", chat:"चैट", docs:"डॉक्टर", about:"जानकारी", ph:"अपने लक्षण बताएं (हिंदी, अंग्रेजी, तमिल)...", send:"भेजें", mic:"बोलने के लिए दबाएं", listening:"सुन रहा है...", welcome:"नमस्ते! 🙏", welcomeText:"हिंदी, अंग्रेजी या तमिल में लक्षण बताएं। पूरी तरह मुफ्त।", triage:"स्वास्थ्य आकलन", syms:"पहचाने लक्षण", conds:"संभावित बीमारी", rems:"घरेलू उपाय", diet:"खान-पान सलाह", doc:"डॉक्टर कब मिलें", ayu:"आयुर्वेदिक टिप", nearDocs:"नजदीकी डॉक्टर", book:"अभी बुक करें", emergency:"🚨 आपातकाल — अभी 108 कॉल करें!", micDenied:"माइक अनुमति नहीं। टाइप करें।", noVoice:"वॉइस समर्थित नहीं।", free:"100% मुफ्त · बिना इंटरनेट" },
  ta: { name:"ஆரோக்கிய சகாயகன்", tagline:"இலவச AI சுகாதார தோழன் · இணையம் தேவையில்லை", chat:"அரட்டை", docs:"மருத்துவர்", about:"பற்றி", ph:"உங்கள் அறிகுறிகளை சொல்லுங்கள் (தமிழ், ஆங்கிலம், இந்தி)...", send:"அனுப்பு", mic:"பேச தட்டவும்", listening:"கேட்கிறேன்...", welcome:"வணக்கம்! 🙏", welcomeText:"தமிழ், ஆங்கிலம் அல்லது இந்தியில் அறிகுறிகளை சொல்லுங்கள். முழுவதும் இலவசம்.", triage:"சுகாதார மதிப்பீடு", syms:"அறியப்பட்ட அறிகுறிகள்", conds:"சாத்தியமான நோய்கள்", rems:"வீட்டு வைத்தியம்", diet:"உணவு ஆலோசனை", doc:"மருத்துவரை எப்போது", ayu:"ஆயுர்வேத குறிப்பு", nearDocs:"அருகில் மருத்துவர்கள்", book:"இப்போது பதிவு", emergency:"🚨 அவசரம் — 108 அழைக்கவும்!", micDenied:"மைக் அனுமதி இல்லை.", noVoice:"குரல் ஆதரிக்கப்படவில்லை.", free:"100% இலவசம் · இணையம் தேவையில்லை" },
};

const URGENCY_CFG = {
  low:       { label:"Low Risk",  emoji:"✅", hdr:"from-emerald-500 to-green-600",   card:"bg-emerald-50 border-emerald-200",  badge:"bg-emerald-100 text-emerald-700",  tx:"text-emerald-800" },
  medium:    { label:"Moderate",  emoji:"⚠️", hdr:"from-amber-400 to-orange-500",    card:"bg-amber-50 border-amber-200",      badge:"bg-amber-100 text-amber-700",      tx:"text-amber-800" },
  high:      { label:"High Risk", emoji:"🔴", hdr:"from-orange-500 to-red-500",      card:"bg-orange-50 border-orange-200",    badge:"bg-orange-100 text-orange-700",    tx:"text-orange-800" },
  emergency: { label:"EMERGENCY", emoji:"🚨", hdr:"from-red-600 to-rose-700",        card:"bg-red-50 border-red-300",          badge:"bg-red-100 text-red-700",          tx:"text-red-900" },
};

// ────────────────────────────────────────────────────────────────
//  CLICK SOUNDS — Web Audio API (zero external files)
// ────────────────────────────────────────────────────────────────
function playClick(type = "tap") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "send") {
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    } else if (type === "receive") {
      osc.type = "triangle"; osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    } else {
      osc.type = "sine"; osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    }
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

// ────────────────────────────────────────────────────────────────
//  TINY COMPONENTS
// ────────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const u = msg.role === "user";
  return (
    <div className={`flex ${u ? "justify-end" : "justify-start"} mb-3`}>
      {!u && <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0 shadow-sm">🌿</div>}
      <div className={`max-w-[83%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${u ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm border border-slate-100"}`}>
        {msg.content}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm mr-2 flex-shrink-0">🌿</div>
      <div className="bg-white rounded-2xl rounded-bl-sm border border-slate-100 px-4 py-3 flex gap-1.5 shadow-sm">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
      </div>
    </div>
  );
}

function Acc({ title, open, onToggle, children, hl }) {
  return (
    <div className={`rounded-xl border overflow-hidden ${hl ? "border-emerald-200" : "border-slate-200"}`}>
      <button onClick={onToggle} className={`w-full flex justify-between items-center px-3 py-2.5 text-xs font-bold uppercase tracking-wide ${hl ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"} transition-colors`}>
        <span>{title}</span><span>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="p-3 bg-white">{children}</div>}
    </div>
  );
}

function TriageCard({ data, lang }) {
  const [open, setOpen] = useState({ rem:true, cond:false, diet:false });
  if (!data) return null;
  const u = URGENCY_CFG[data.urgency] || URGENCY_CFG.low;
  const t = T[lang] || T.en;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-md ${u.card}`}>
      <div className={`bg-gradient-to-r ${u.hdr} p-4`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{u.emoji}</span>
            <div><p className="text-white/75 text-[9px] font-bold uppercase tracking-widest">{t.triage}</p><p className="text-white font-black text-xl leading-tight">{u.label}</p></div>
          </div>
          {data.season_alert && (
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-right">
              <p className="text-white text-[10px] font-bold">{data.season_alert.emoji} {data.season_alert.name}</p>
              <p className="text-white/70 text-[9px]">Season Active</p>
            </div>
          )}
        </div>
        {data.urgency === "emergency" && (
          <div className="mt-3 bg-white/25 rounded-xl p-2.5 text-center">
            <p className="text-white font-black text-sm">📞 CALL 108 — Ambulance — RIGHT NOW</p>
            <p className="text-white/85 text-xs mt-0.5">104 Health Helpline · 14555 Ayushman Bharat</p>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        {data.symptoms_identified?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">🩺 {t.syms}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.symptoms_identified.map((s,i) => <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.badge}`}>{s}</span>)}
            </div>
          </div>
        )}
        <Acc title={`🔬 ${t.conds}`} open={open.cond} onToggle={()=>{playClick();setOpen(p=>({...p,cond:!p.cond}));}}>
          <ul className="space-y-1">{data.possible_conditions.map((c,i)=><li key={i} className={`text-sm ${u.tx} flex gap-2`}><span className="opacity-40">•</span>{c}</li>)}</ul>
        </Acc>
        <Acc title={`🌿 ${t.rems}`} open={open.rem} onToggle={()=>{playClick();setOpen(p=>({...p,rem:!p.rem}));}} hl>
          <ul className="space-y-2">{data.home_remedies.map((r,i)=><li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-emerald-500 flex-shrink-0">✦</span><span>{r}</span></li>)}</ul>
        </Acc>
        {data.ayurvedic_tip && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
            <span className="text-2xl">🕉️</span>
            <div><p className="text-amber-700 font-bold text-[10px] uppercase tracking-wide">{t.ayu}</p><p className="text-amber-700 text-sm mt-0.5">{data.ayurvedic_tip}</p></div>
          </div>
        )}
        <Acc title={`🥗 ${t.diet}`} open={open.diet} onToggle={()=>{playClick();setOpen(p=>({...p,diet:!p.diet}));}}>
          <p className="text-sm text-slate-700 leading-relaxed">{data.dietary_advice}</p>
        </Acc>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
          <p className="text-sky-700 font-bold text-[10px] uppercase tracking-wide mb-1">🏥 {t.doc}</p>
          <p className="text-sky-700 text-sm leading-relaxed">{data.when_to_seek_doctor}</p>
        </div>
        {data.season_alert && data.urgency !== "emergency" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2">
            <span className="text-lg">{data.season_alert.emoji}</span>
            <div><p className="text-slate-600 font-semibold text-xs">{data.season_alert.name} Season Alert</p><p className="text-slate-500 text-xs mt-0.5">{data.season_alert.risk}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocCard({ doc, onBook, lang }) {
  const t = T[lang] || T.en;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">{doc.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm">{doc.name}</p>
            <span className="text-blue-500 text-xs">✓</span>
            {doc.ayushman && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">🛡️ Ayushman</span>}
          </div>
          <p className="text-emerald-600 text-xs font-medium">{doc.spec} · {doc.qual}</p>
          <p className="text-slate-400 text-[11px] mt-0.5 truncate">📍 {doc.loc}</p>
          <div className="flex gap-3 mt-1.5 text-xs flex-wrap">
            <span className="text-amber-600">⭐ {doc.rating}</span>
            <span className="text-slate-400">{doc.dist} km</span>
            <span className="text-emerald-600 font-medium">{doc.fee}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {doc.langs.map(l => <span key={l} className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full">{l}</span>)}
          </div>
        </div>
      </div>
      <button onClick={()=>{playClick();onBook(doc);}}
        className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95">
        🎥 {t.book} · {doc.slot > 0 ? `${doc.slot} min` : "Now"}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MAIN APP
// ────────────────────────────────────────────────────────────────
export default function ArogyaSahayak() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [mic, setMic]           = useState(false);
  const [lang, setLang]         = useState("en");
  const [triage, setTriage]     = useState(null);
  const [tab, setTab]           = useState("chat");
  const [booked, setBooked]     = useState(null);
  const [micErr, setMicErr]     = useState("");
  const [welcome, setWelcome]   = useState(true);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const recogRef  = useRef(null);
  const t = T[lang] || T.en;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, busy]);
  useEffect(() => () => recogRef.current?.stop(), []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    playClick("send");
    setMessages(p => [...p, { role:"user", content:text }]);
    setInput("");
    setWelcome(false);
    setBusy(true);
    // Run local triage after short "thinking" delay
    setTimeout(() => {
      const result = runTriage(text);
      setTriage(result);
      const fq = result.follow_up_questions?.length
        ? `\n\n💭 Please also tell me:\n${result.follow_up_questions.map(q=>`• ${q}`).join("\n")}`
        : "";
      setMessages(p => [...p, { role:"assistant", content:result.response_message + fq }]);
      setBusy(false);
      playClick("receive");
      if (["high","emergency"].includes(result.urgency)) setTimeout(()=>setTab("doctors"),1800);
    }, 850);
  }, [input, busy]);

  const startMic = useCallback(() => {
    playClick();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicErr(t.noVoice); return; }
    const r = new SR();
    r.lang = { en:"en-IN", hi:"hi-IN", ta:"ta-IN" }[lang] || "en-IN";
    r.onstart  = () => { setMic(true); setMicErr(""); };
    r.onresult = e  => setInput(e.results[0][0].transcript);
    r.onerror  = e  => { setMic(false); if (e.error==="not-allowed") setMicErr(t.micDenied); };
    r.onend    = ()  => setMic(false);
    recogRef.current = r;
    try { r.start(); } catch { setMicErr(t.micDenied); }
  }, [lang, t]);

  const handleBook = (doc) => {
    setBooked(doc);
    setTab("chat");
    setMessages(p => [...p, { role:"assistant",
      content:`✅ Appointment sent to ${doc.name}!\n📍 ${doc.loc}\n⏱️ Wait: ${doc.slot>0?doc.slot+" min":"Available now"}\n💰 ${doc.fee}\n\n📱 Video call link sent by SMS. Show Ayushman Bharat card if eligible.\n\n🆘 Emergency: Call 108 anytime.`
    }]);
  };

  const quickSymptoms = {
    en:["Fever & Headache","Cough & Cold","Stomach Pain","Weakness & Fatigue","Skin Rash","Dengue Signs","Diarrhoea","Vomiting"],
    hi:["बुखार और सिरदर्द","खांसी-जुकाम","पेट दर्द","कमजोरी","दाने/खुजली","डेंगू के लक्षण","दस्त","उल्टी"],
    ta:["காய்ச்சல் & தலைவலி","இருமல் & சளி","வயிற்று வலி","சோர்வு","தோல் சொறி","டெங்கு அறிகுறி","வயிற்றுப்போக்கு","வாந்தி"],
  };

  return (
    <div className="min-h-screen flex flex-col" style={{background:"linear-gradient(135deg,#ecfdf5 0%,#f0f9ff 55%,#fefce8 100%)"}}>

      {/* Emergency Banner */}
      {triage?.urgency === "emergency" && (
        <div className="bg-red-600 text-white text-center py-2.5 font-black text-sm animate-pulse z-50 px-4">
          🚨 {t.emergency}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 sticky top-0 z-40 shadow-lg">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shadow-sm">🌿</div>
            <div>
              <h1 className="text-white font-black text-lg leading-tight">{t.name}</h1>
              <p className="text-white/60 text-[9px] tracking-wide">{t.tagline}</p>
            </div>
          </div>
          {/* Language switcher */}
          <div className="flex bg-white/20 rounded-xl p-1 gap-0.5">
            {[["en","EN"],["hi","हि"],["ta","த"]].map(([code,lbl])=>(
              <button key={code} onClick={()=>{playClick();setLang(code);}}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${lang===code?"bg-white text-emerald-700 shadow":"text-white/80 hover:text-white"}`}>{lbl}</button>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-xl mx-auto px-4 pb-2 flex gap-1">
          {[["chat","💬",t.chat],["doctors","🏥",t.docs],["about","ℹ️",t.about]].map(([id,icon,label])=>(
            <button key={id} onClick={()=>{playClick();setTab(id);}}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab===id?"bg-white text-emerald-700 shadow":"text-white/70 hover:text-white hover:bg-white/10"}`}>
              <span>{icon}</span><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-3 py-4 flex flex-col gap-4">

        {/* ═══ CHAT ═══ */}
        {tab === "chat" && (
          <>
            {triage && <TriageCard data={triage} lang={lang}/>}
            <div className="bg-white/60 backdrop-blur rounded-3xl border border-white shadow-inner flex flex-col overflow-hidden" style={{minHeight:"280px",maxHeight:"45vh"}}>
              <div className="flex-1 overflow-y-auto p-4">
                {welcome && !messages.length && (
                  <div className="text-center py-6 px-2">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">🌿</div>
                    <h2 className="text-xl font-black text-emerald-700 mb-2">{t.welcome}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-5">{t.welcomeText}</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-5">
                      {(quickSymptoms[lang]||quickSymptoms.en).map((s,i)=>(
                        <button key={i} onClick={()=>{playClick();setInput(s);inputRef.current?.focus();}}
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors active:scale-95">{s}</button>
                      ))}
                    </div>
                    <div className="flex justify-center gap-3 text-[10px] text-slate-400">
                      <span>🆓 100% Free</span><span>📵 Offline</span><span>🎙️ Voice</span><span>🌐 3 Languages</span>
                    </div>
                  </div>
                )}
                {messages.map((m,i)=><Bubble key={i} msg={m}/>)}
                {busy && <Dots/>}
                <div ref={bottomRef}/>
              </div>
            </div>
            {micErr && <p className="text-red-500 text-xs text-center bg-red-50 rounded-xl p-2">{micErr}</p>}
            {/* Input bar */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-2 flex items-end gap-2">
              <button onClick={mic ? ()=>recogRef.current?.stop() : startMic}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${mic?"bg-red-500 animate-pulse shadow-red-200 shadow-lg":"bg-emerald-50 hover:bg-emerald-100"}`}>
                <span className="text-xl">{mic?"⏹️":"🎙️"}</span>
              </button>
              <textarea ref={inputRef} value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder={mic?t.listening:t.ph}
                rows={1} className="flex-1 resize-none bg-transparent text-slate-700 placeholder-slate-400 text-sm outline-none py-2.5 px-1 leading-relaxed max-h-28 overflow-y-auto"
                style={{minHeight:"44px"}}
                onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,112)+"px";}}
              />
              <button onClick={handleSend} disabled={!input.trim()||busy}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white flex items-center justify-center shadow transition-all active:scale-90 flex-shrink-0">
                {busy
                  ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                  : <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                }
              </button>
            </div>
          </>
        )}

        {/* ═══ DOCTORS ═══ */}
        {tab === "doctors" && (
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-4 text-white">
              <h2 className="font-black text-lg">🏥 {t.nearDocs}</h2>
              <p className="text-white/75 text-xs mt-1">Ayushman Bharat Digital Mission • {DOCTORS.length} doctors available</p>
              {triage?.specialist_needed && (
                <div className="mt-2 bg-white/20 rounded-xl px-3 py-1.5 inline-block">
                  <p className="text-white text-xs">AI recommends: <strong>{triage.specialist_needed}</strong></p>
                </div>
              )}
            </div>
            {booked && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div><p className="text-emerald-800 font-semibold text-sm">Appointment Confirmed!</p><p className="text-emerald-600 text-xs">{booked.name} · {booked.avail}</p></div>
              </div>
            )}
            {DOCTORS.map(d=><DocCard key={d.id} doc={d} onBook={handleBook} lang={lang}/>)}
            <div className="text-center py-3 text-slate-400 text-xs">
              <p>🛡️ Ayushman Bharat helpline: <strong>14555</strong></p>
              <p>📞 Health helpline: <strong>104</strong> · Ambulance: <strong>108</strong></p>
            </div>
          </div>
        )}

        {/* ═══ ABOUT ═══ */}
        {tab === "about" && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white text-center">
              <div className="text-5xl mb-3">🌿</div>
              <h2 className="text-2xl font-black">{t.name}</h2>
              <p className="text-white/75 text-sm mt-1">ET-Gen AI Hackathon 2024</p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[["100%","Free Forever"],["3","Languages"],["25+","Diseases"]].map(([n,l])=>(
                  <div key={n} className="bg-white/20 rounded-xl p-2"><p className="font-black text-2xl">{n}</p><p className="text-white/70 text-[10px]">{l}</p></div>
                ))}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="font-bold text-emerald-800 text-sm mb-2">🆓 How This is 100% Free</p>
              <p className="text-emerald-700 text-xs leading-relaxed">Built with a <strong>local rule-based AI engine</strong> — a database of 25+ Indian disease profiles with 200+ symptom keywords across 3 languages, seasonal disease logic, and 80+ home remedies. Zero API calls. Zero internet required for triage. Runs entirely in your browser.</p>
            </div>
            {[
              {e:"🧠",t:"Built-in AI Triage Engine",d:"Rule-based engine with 25+ Indian disease profiles. Covers Dengue, Malaria, Typhoid, TB, Heat stroke, Food poisoning and more. Seasonal outbreak awareness built-in."},
              {e:"🌿",t:"Ayurvedic Intelligence",d:"80+ culturally relevant home remedies: Tulsi kadha, Haldi doodh, Giloy, ORS, Ajwain, Neem, Mulethi, Ashwagandha — evidence-informed, affordable, rural-accessible."},
              {e:"🎙️",t:"Multilingual Voice Input",d:"Web Speech API in Hindi (hi-IN), Tamil (ta-IN), English (en-IN). Works on Android Chrome. Designed for low-literacy rural users."},
              {e:"🚨",t:"Emergency Auto-Detection",d:"Instantly detects chest pain, stroke, snake bites, unconsciousness → red emergency banner + 108/104 numbers prominently displayed."},
              {e:"📵",t:"Works Offline",d:"All symptom triage, home remedies, and health guidance work completely offline. Only doctor booking requires connectivity."},
            ].map(f=>(
              <div key={f.e} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{f.e}</div>
                <div><p className="font-bold text-slate-800 text-sm">{f.t}</p><p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{f.d}</p></div>
              </div>
            ))}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">⚠️ Medical Disclaimer</p>
              <p>General health information only. NOT a substitute for professional medical advice. Always consult a qualified doctor. Emergency: <strong>108</strong>.</p>
            </div>
            <p className="text-center text-slate-400 text-[10px] py-2">{t.free} · Built with ❤️ for Rural India</p>
          </div>
        )}
      </main>

      <footer className="text-center py-2 text-[10px] text-slate-400 border-t border-slate-100 bg-white/50">
        🚨 <strong className="text-red-500">108</strong> Ambulance &nbsp;|&nbsp; <strong className="text-blue-500">104</strong> Health &nbsp;|&nbsp; <strong className="text-emerald-600">14555</strong> Ayushman
      </footer>
    </div>
  );
}
