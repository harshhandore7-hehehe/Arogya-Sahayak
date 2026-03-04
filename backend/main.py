"""
AROGYA SAHAYAK — FastAPI Backend (FREE VERSION)
================================================
Uses Groq free tier (Llama 3) as AI engine.
Free signup at console.groq.com — no credit card needed.
Free limits: 14,400 requests/day

Groq models available (all free tier):
  - llama-3.1-8b-instant  (fastest, recommended)
  - llama-3.3-70b-versatile (best quality)
  - mixtral-8x7b-32768 (good for multilingual)

Run:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os, json, re, logging
from datetime import datetime, date

# Groq SDK — pip install groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logging.warning("Groq SDK not installed. Run: pip install groq")

# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("arogya-sahayak")

app = FastAPI(
    title="Arogya Sahayak API (Free Edition)",
    description="GenAI-Powered Telemedicine Voice Assistant for Rural India — Powered by Groq Free Tier",
    version="2.0.0-free",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq client — reads GROQ_API_KEY from environment
groq_client = None
if GROQ_AVAILABLE:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if api_key:
        groq_client = Groq(api_key=api_key)
        logger.info("✅ Groq AI initialized")
    else:
        logger.info("ℹ️ No GROQ_API_KEY — will use rule-based fallback")

# ─────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are Arogya Sahayak, a compassionate AI health assistant for rural India under Ayushman Bharat.

CRITICAL: Respond with ONLY a valid JSON object — no markdown, no preamble.

JSON Schema:
{
  "urgency": "low"|"medium"|"high"|"emergency",
  "symptoms_identified": ["string"],
  "possible_conditions": ["condition (brief explanation)"],
  "home_remedies": ["remedy — how to use"],
  "dietary_advice": "string",
  "recommendation": "string",
  "when_to_seek_doctor": "string",
  "ayurvedic_tip": "string or null",
  "emergency_numbers": "108 (Ambulance), 104 (Health Helpline)" or null,
  "response_message": "warm 2-3 sentence reply in user's language",
  "follow_up_questions": ["question?", "question?"]
}

URGENCY: low=minor, medium=fever 100-103F/cough/diarrhea, high=fever>103F/breathlessness/severe pain, emergency=chest pain/stroke/unconscious/severe bleeding/snake bite

INDIAN DISEASE INTELLIGENCE:
- Monsoon (Jun-Sep): Dengue, Malaria, Typhoid, Cholera, Chikungunya
- Summer (Mar-Jun): Heat stroke, Food poisoning, Dehydration
- Winter: Respiratory infections, Pneumonia in elderly
- Year-round: TB (cough >2 weeks + night sweats), Iron-deficiency anemia, Waterborne diseases

CULTURALLY APPROPRIATE REMEDIES:
- ORS/Jeevan Jal → diarrhea/dehydration (PRIORITY)
- Tulsi kadha → fever, respiratory, cough
- Haldi doodh → inflammation, wounds, immunity
- Giloy kadha → dengue recovery, immunity
- Adrak-honey-lemon → cold, sore throat
- Ajwain water → gas, bloating, indigestion
- Coconut water → electrolyte replenishment
- Papaya leaf extract → dengue platelet support
- Neem → skin infections

RULES:
1. Detect user's language; respond in the SAME language in response_message
2. Never diagnose definitively — use "may indicate" or "could suggest"
3. Mention ASHA workers and PHC for serious cases
4. ALWAYS show 108/104 for emergencies
5. Be cost-sensitive — rural patients need affordable solutions"""

# ─────────────────────────────────────────────
# RULE-BASED FALLBACK ENGINE
# (works with zero API key)
# ─────────────────────────────────────────────
TRIAGE_RULES = {
    "emergency": {
        "keywords": ["chest pain","heart attack","can't breathe","stroke","unconscious","severe bleeding","snake bite","snakebite","paralysis","सीने में दर्द","बेहोश","साँप","மார்பு வலி","மயக்கம்"],
        "urgency": "emergency",
        "conditions": ["Possible cardiac/stroke/trauma emergency"],
        "remedies": ["Call 108 immediately — do not attempt home treatment"],
        "diet": "Nothing by mouth until emergency services arrive",
        "when_doctor": "IMMEDIATELY — call 108 right now",
        "recommendation": "🚨 EMERGENCY — Call 108 (Ambulance) immediately",
        "ayurvedic": None,
    },
    "dengue": {
        "keywords": ["bone pain","joint pain fever","rash fever","breakbone","डेंगू","dengue","டெங்கு","eye pain fever"],
        "urgency": "high",
        "conditions": ["Dengue Fever — bone/joint pain + fever strongly suggests dengue","Chikungunya — similar joint pain"],
        "remedies": ["Giloy kadha — 2 stems boiled in water, drink twice daily (boosts platelets)","Papaya leaf extract — 2 tbsp twice daily for platelet count","Coconut water — 3 glasses daily for electrolytes"],
        "diet": "Soft diet — khichdi. High fluid intake. Avoid spicy/fried food.",
        "when_doctor": "If fever exceeds 4 days, platelet count drops, or bleeding gums — visit PHC immediately",
        "recommendation": "Possible dengue. Rest completely. Monitor for 4 days. Visit PHC if symptoms worsen.",
        "ayurvedic": "Giloy (Guduchi) is Ayurvedic 'Amrita' — proven to boost platelet count in dengue.",
    },
    "malaria": {
        "keywords": ["chills fever","shivering fever","cyclic fever","rigor","ठंड लगना","कंपकंपी","मलेरिया","குளிர் காய்ச்சல்","மலேரியா"],
        "urgency": "high",
        "conditions": ["Malaria — cyclic chills + fever strongly suggests malaria"],
        "remedies": ["Chirata decoction — supports liver function during malaria","Tulsi kadha — fever management","ORS — prevents dehydration during high fever"],
        "diet": "Easy-to-digest moong dal khichdi. Plenty of fluids.",
        "when_doctor": "Malaria needs free PHC treatment TODAY. Get free RDT (rapid test) at any PHC.",
        "recommendation": "Cyclic fever with chills = possible malaria. Visit PHC immediately for free blood test and treatment.",
        "ayurvedic": "Chirata (Swertia chirata) — classical Ayurvedic antimalarial herb.",
    },
    "high_fever": {
        "keywords": ["high fever","103","104","105","tez bukhar","तेज़ बुखार","அதிக காய்ச்சல்","very high temperature","3 days fever"],
        "urgency": "high",
        "conditions": ["Severe viral fever — needs investigation if >103°F or >3 days","Possible bacterial infection"],
        "remedies": ["Tulsi-ginger-black pepper kadha — 3x daily","Lukewarm sponging — reduces temperature gently","Haldi doodh at night — anti-inflammatory","ORS — prevents dangerous dehydration"],
        "diet": "Light diet — khichdi, curd rice. Stay hydrated. No spicy food.",
        "when_doctor": "If fever >103°F or lasts >3 days or has rash/breathlessness — see doctor urgently",
        "recommendation": "High fever detected. Rest, hydrate, take remedies. If not reduced in 2 days — visit PHC.",
        "ayurvedic": "Mahasudarshan Kadha — classical Ayurvedic formulation for persistent fevers.",
    },
    "tb": {
        "keywords": ["cough 2 weeks","cough months","blood cough","night sweat","weight loss cough","2 हफ्ते खांसी","खून खांसी","टीबी","2 வார இருமல்","இரத்த இருமல்"],
        "urgency": "high",
        "conditions": ["Tuberculosis (TB) — cough >2 weeks + night sweats strongly suggests TB"],
        "remedies": ["Visit PHC for free DOTS treatment — TB is 100% free in India","Giloy + Amla kadha — supports immunity during TB treatment","High-protein diet — eggs, dal, groundnuts"],
        "diet": "High-calorie, high-protein diet. Adequate sunlight (Vitamin D). No alcohol.",
        "when_doctor": "URGENT — Visit PHC or DOTS centre TODAY. TB is FREE to treat under NIKSHAY programme.",
        "recommendation": "⚠️ Possible TB. Visit nearest PHC IMMEDIATELY. TB treatment is completely FREE in India.",
        "ayurvedic": "Vasavaleha — Ayurvedic formulation for respiratory conditions. Use as SUPPLEMENT to TB medication only.",
    },
    "diarrhea": {
        "keywords": ["diarrhea","loose motion","watery stool","vomiting diarrhea","dehydration","दस्त","उल्टी दस्त","வயிற்றுப்போக்கு","loosemotion"],
        "urgency": "medium",
        "conditions": ["Acute gastroenteritis — most common","Food poisoning — sudden onset","Cholera — if severe with rice-water stools"],
        "remedies": ["ORS (MOST IMPORTANT) — 1L water + 6 tsp sugar + 1/2 tsp salt. Drink continuously. SAVES LIVES.","Rice kanji/congee with salt — easily digestible","Coconut water — natural electrolytes","Banana + curd BRAT diet"],
        "diet": "ORS/liquids first. Then BRAT: banana, rice, curd. No solid food initially.",
        "when_doctor": "If blood in stool, child not urinating, vomiting prevents drinking, or lasts >2 days — see doctor.",
        "recommendation": "Diarrhea detected. START ORS IMMEDIATELY. Most diarrhea resolves in 1-2 days with hydration.",
        "ayurvedic": "Kutajghan Vati — Ayurvedic tablet for diarrhea. Available for ₹30 at any pharmacy.",
    },
    "fever": {
        "keywords": ["fever","bukhar","temperature","बुखार","காய்ச்சல்","slight fever","low fever","100","101"],
        "urgency": "medium",
        "conditions": ["Viral fever — most common cause","Seasonal flu/cold with fever"],
        "remedies": ["Tulsi kadha — 8-10 leaves boiled, add honey, drink twice daily","Haldi doodh at bedtime","Adrak-shahad-nimbu in warm water each morning","Mulethi tea for throat"],
        "diet": "Light foods — khichdi, curd, banana. Hot soups. Avoid cold water.",
        "when_doctor": "If above 100°F for >2 days, or child under 2 years has any fever — consult doctor.",
        "recommendation": "Fever detected. Rest well and take these remedies. Monitor — if above 102°F or >2 days, see doctor.",
        "ayurvedic": "Tulsi (Holy Basil) — most effective Ayurvedic herb for fever, contains eugenol with proven antipyretic properties.",
    },
    "cough": {
        "keywords": ["cough","cold","sore throat","runny nose","phlegm","खांसी","जुकाम","இருமல்","சளி","தொண்டை வலி"],
        "urgency": "low",
        "conditions": ["Common cold — resolves in 5-7 days","Seasonal flu","Acute bronchitis if >1 week"],
        "remedies": ["Adrak-honey-lemon — 1 tsp ginger + 1 tsp honey + half lemon, 3x daily","Steam with ajwain — 1 tbsp ajwain in hot water, inhale 10 min twice daily","Salt water gargle 3-4x daily","Mulethi tea — soothes throat"],
        "diet": "Warm soups, ginger tea throughout day. Avoid cold water, ice cream, fried food.",
        "when_doctor": "If cough >2 weeks, blood in mucus, breathlessness, or night sweats — check for TB.",
        "recommendation": "Cough/cold detected. Remedies are effective. Most colds resolve in 7 days. Persistent >2 weeks → check for TB.",
        "ayurvedic": "Sitopaladi Churna — classical Ayurvedic powder for cough/cold. Available for ₹20-30.",
    },
    "stomach": {
        "keywords": ["stomach pain","gas","bloating","indigestion","acidity","constipation","पेट दर्द","गैस","वयிற்று வலி","வாயு","அஜீரணம்"],
        "urgency": "low",
        "conditions": ["Gastritis / acid reflux — burning pain","Intestinal gas and bloating","IBS — recurring abdominal discomfort"],
        "remedies": ["Ajwain + black salt in warm water — instant gas relief","Jeera (cumin) water after meals — excellent for digestion","Hing (asafoetida) in warm water — gas relief","Ginger tea — reduces nausea","Triphala at bedtime — for constipation"],
        "diet": "Small frequent meals. Avoid spicy/fried/maida. More fiber. Regular meal times.",
        "when_doctor": "Severe pain 8/10, right lower side (appendicitis?), fever with pain — see doctor urgently.",
        "recommendation": "Digestive issue detected. Ayurvedic remedies are very effective. Dietary changes give long-term relief.",
        "ayurvedic": "Hingwashtak Churna — classical Ayurvedic powder for gas. Take 1/2 tsp with first bite of every meal.",
    },
    "weakness": {
        "keywords": ["weakness","fatigue","dizzy","pale","anemia","कमजोरी","थकान","चक्कर","பலவீனம்","சோர்வு","இரத்த சோகை"],
        "urgency": "low",
        "conditions": ["Iron-deficiency anemia — affects 50%+ women/children in rural India","General debility / malnutrition","Post-illness weakness"],
        "remedies": ["Kala chana + jaggery daily — iron-rich combination","Spinach+beetroot juice with lemon (Vit C aids iron absorption)","5-6 dates in warm milk daily","Pomegranate juice — builds hemoglobin"],
        "diet": "Iron-rich: dark leafy greens, dates, jaggery, lentils, pomegranate. Avoid tea/coffee with iron foods.",
        "when_doctor": "Get free CBC blood test at PHC. If hemoglobin <8 g/dL — needs medical treatment.",
        "recommendation": "Possible anemia detected. Iron-rich foods are very effective. Free CBC test at your PHC will confirm.",
        "ayurvedic": "Lohasava — Ayurvedic iron tonic for anemia. Widely available and very effective.",
    },
}

def rule_based_triage(text: str) -> dict:
    """Simple rule-based triage for when no Groq key is available."""
    lower = text.lower()

    # Detect language
    hindi = bool(re.search(r'[\u0900-\u097F]', text))
    tamil = bool(re.search(r'[\u0B80-\u0BFF]', text))
    lang = "hi" if hindi else "ta" if tamil else "en"

    # Score each rule
    scores = {}
    for key, rule in TRIAGE_RULES.items():
        score = sum(len(kw.split()) for kw in rule["keywords"] if kw.lower() in lower)
        scores[key] = score

    best = max(scores, key=scores.get)
    rule = TRIAGE_RULES[best] if scores[best] > 0 else TRIAGE_RULES["fever"]

    resp_map = {
        "en": lambda: f"I've analyzed your symptoms. {rule['recommendation']} See the detailed guidance below.",
        "hi": lambda: f"आपके लक्षणों का विश्लेषण किया है। {rule['recommendation']}",
        "ta": lambda: f"உங்கள் அறிகுறிகளை பகுப்பாய்வு செய்தேன். {rule['recommendation']}",
    }

    return {
        "urgency": rule["urgency"],
        "symptoms_identified": [kw for kw in rule["keywords"][:3] if kw.lower() in lower] or ["general discomfort"],
        "possible_conditions": rule["conditions"],
        "home_remedies": rule["remedies"],
        "dietary_advice": rule["diet"],
        "recommendation": rule["recommendation"],
        "when_to_seek_doctor": rule["when_doctor"],
        "ayurvedic_tip": rule["ayurvedic"],
        "emergency_numbers": "108 (Ambulance), 104 (Health Helpline)" if rule["urgency"] == "emergency" else None,
        "response_message": resp_map.get(lang, resp_map["en"])(),
        "follow_up_questions": ["How long have you had these symptoms?", "Do you have a fever?", "Are symptoms getting better or worse?"],
    }

# ─────────────────────────────────────────────
# MOCK DOCTORS DB
# ─────────────────────────────────────────────
DOCTORS = [
    {"id":"DOC001","name":"Dr. Priya Sharma","specialty":"General Physician","location":"PHC Nashik Rural, MH","distance_km":2.3,"availability":"Available Now","ayushman_registered":True,"rating":4.8,"languages":["Hindi","Marathi","English"],"fee_display":"Free (Ayushman)","next_slot_minutes":10,"avatar_emoji":"👩‍⚕️"},
    {"id":"DOC002","name":"Dr. Rajan Pillai","specialty":"Internal Medicine","location":"CHC Trissur, Kerala","distance_km":4.1,"availability":"Available in 20 min","ayushman_registered":True,"rating":4.6,"languages":["Malayalam","Tamil","English"],"fee_display":"₹200 / Free PMJAY","next_slot_minutes":20,"avatar_emoji":"👨‍⚕️"},
    {"id":"DOC003","name":"Dr. Kavitha Devi","specialty":"Pediatrician","location":"PHC Madurai, Tamil Nadu","distance_km":3.7,"availability":"Available in 5 min","ayushman_registered":True,"rating":4.9,"languages":["Tamil","English"],"fee_display":"Free (Ayushman)","next_slot_minutes":5,"avatar_emoji":"👩‍⚕️"},
    {"id":"DOC004","name":"Dr. Arjun Verma","specialty":"Ayurvedic Physician","location":"AYUSH Centre, Lucknow","distance_km":1.8,"availability":"Available Now","ayushman_registered":False,"rating":4.5,"languages":["Hindi","English"],"fee_display":"₹150","next_slot_minutes":0,"avatar_emoji":"👨‍⚕️"},
    {"id":"DOC005","name":"Dr. Sunita Rao","specialty":"Gynaecologist","location":"Dist. Hospital, Bengaluru Rural","distance_km":5.2,"availability":"Available in 30 min","ayushman_registered":True,"rating":4.7,"languages":["Kannada","Telugu","English"],"fee_display":"Free (Ayushman)","next_slot_minutes":30,"avatar_emoji":"👩‍⚕️"},
]

# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    language: Optional[str] = "en"

class BookingRequest(BaseModel):
    doctor_id: str
    patient_name: str
    symptoms: Optional[str] = ""

# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "Arogya Sahayak API (Free Edition)",
        "version": "2.0.0-free",
        "ai_mode": "groq" if groq_client else "rule-based",
        "groq_model": "llama-3.1-8b-instant" if groq_client else None,
        "cost": "100% Free",
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ai_mode": "groq" if groq_client else "rule-based",
        "groq_available": bool(groq_client),
    }

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """AI triage — uses Groq free API or falls back to rule engine."""
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    last_user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), "")

    try:
        if groq_client:
            # ── Groq Free Tier (Llama 3)
            completion = groq_client.chat.completions.create(
                model=os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    *[{"role": m.role, "content": m.content} for m in req.messages],
                ],
                max_tokens=900,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            raw = completion.choices[0].message.content
            triage = json.loads(raw)
            ai_mode = "groq-llama3"
        else:
            # ── Rule-based fallback
            triage = rule_based_triage(last_user_msg)
            ai_mode = "rule-based"

        return {
            "success": True,
            "triage": triage,
            "display_message": triage.get("response_message", "See health assessment above."),
            "urgency": triage.get("urgency", "low"),
            "ai_mode": ai_mode,
        }

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e}, falling back to rule engine")
        triage = rule_based_triage(last_user_msg)
        return {"success": True, "triage": triage, "display_message": triage.get("response_message"), "urgency": triage.get("urgency","low"), "ai_mode": "rule-based-fallback"}

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        # Always fall back to rule engine — never fail the user
        triage = rule_based_triage(last_user_msg)
        return {"success": True, "triage": triage, "display_message": triage.get("response_message"), "urgency": triage.get("urgency","low"), "ai_mode": "rule-based-emergency-fallback"}

@app.get("/api/doctors")
async def list_doctors(specialty: Optional[str]=None, ayushman_only: bool=False, urgency: Optional[str]="low"):
    """Mock Ayushman Bharat ABDM Doctor Registry."""
    docs = DOCTORS.copy()
    if specialty: docs = [d for d in docs if specialty.lower() in d["specialty"].lower()]
    if ayushman_only: docs = [d for d in docs if d["ayushman_registered"]]
    docs.sort(key=lambda d: d["next_slot_minutes"] if urgency in ["high","emergency"] else (d["next_slot_minutes"], -d["rating"]))
    return {"success": True, "count": len(docs), "doctors": docs, "source": "Ayushman Bharat ABDM (Simulated)", "emergency": "108", "health_helpline": "104"}

@app.post("/api/doctors/book")
async def book(req: BookingRequest):
    """Simulated telemedicine booking."""
    doc = next((d for d in DOCTORS if d["id"] == req.doctor_id), None)
    if not doc: raise HTTPException(status_code=404, detail="Doctor not found")
    booking_id = f"AS{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    return {
        "success": True, "booking_id": booking_id,
        "doctor": doc["name"], "patient": req.patient_name,
        "wait": f"{doc['next_slot_minutes']} minutes" if doc["next_slot_minutes"] > 0 else "Now",
        "video_link": f"https://meet.arogya.in/{booking_id}",
        "message": f"Confirmed with {doc['name']}. Video link sent by SMS. Show Ayushman Bharat card if applicable.",
    }

@app.get("/api/health-alerts")
async def alerts():
    """Seasonal disease alerts — IDSP India simulation."""
    m = date.today().month
    season = "Monsoon" if 6<=m<=9 else "Summer" if 3<=m<=5 else "Winter"
    a = {
        "Monsoon": ["⚠️ Dengue Alert — remove stagnant water","⚠️ Malaria — sleep under mosquito nets","💧 Boil all drinking water"],
        "Summer":  ["🌡️ Heat stroke risk — stay indoors 12-4 PM","⚠️ Food poisoning risk high","💧 Drink ORS if feeling unwell"],
        "Winter":  ["🤧 Respiratory season — keep warm","👴 Elderly risk — pneumonia/flu","🌬️ Asthma patients — keep inhaler ready"],
    }
    return {"season": season, "alerts": a.get(season,[]), "source": "IDSP India (Simulated)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT",8000)), reload=True)
