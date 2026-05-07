"""
app.py  -  Prakriti + Guna + Career Guidance API
Run: python app.py
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, json, sqlite3, numpy as np, pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

app = Flask(__name__)
CORS(app)

# ── Load Prakriti model ────────────────────────────────────────────────────────
with open("model.pkl",    "rb") as f: clf      = pickle.load(f)
with open("encoders.pkl", "rb") as f: encoders = pickle.load(f)
with open("model_meta.json")    as f: meta     = json.load(f)

FEATURE_COLS  = meta["feature_cols"]
DOSHA_CLASSES = meta["dosha_classes"]

# ── Load or build Guna model ───────────────────────────────────────────────────
GUNA_FEATURE_COLS = [
    "daily_routine",        # How structured is your daily routine?
    "motivation_source",    # What motivates you most?
    "reaction_to_conflict", # How do you handle conflict?
    "learning_style",       # How do you prefer to learn?
    "decision_making",      # How do you make decisions?
    "emotional_state",      # How is your usual emotional state?
    "goal_orientation",     # How do you approach goals?
    "social_interaction",   # How do you prefer to interact socially?
    "thought_pattern",      # What best describes your thought patterns?
    "work_ethic",           # How would you describe your work ethic?
]

GUNA_CLASSES = ["Sattva", "Rajas", "Tamas"]

# Guna answer → label encoding map (ordinal: Sattva=0, Rajas=1, Tamas=2)
GUNA_ANSWER_MAP = {
    "daily_routine": {
        "structured_mindful": 0,   # Sattva
        "goal_driven_busy":   1,   # Rajas
        "no_fixed_routine":   2,   # Tamas
    },
    "motivation_source": {
        "inner_peace_growth": 0,
        "achievement_status": 1,
        "comfort_security":   2,
    },
    "reaction_to_conflict": {
        "calm_compassionate": 0,
        "assertive_direct":   1,
        "avoid_withdraw":     2,
    },
    "learning_style": {
        "reflective_deep":    0,
        "active_competitive": 1,
        "passive_rote":       2,
    },
    "decision_making": {
        "thoughtful_ethical": 0,
        "fast_ambitious":     1,
        "hesitant_avoidant":  2,
    },
    "emotional_state": {
        "equanimous_joyful":  0,
        "intense_passionate": 1,
        "lethargic_dull":     2,
    },
    "goal_orientation": {
        "purposeful_balanced": 0,
        "aggressive_driven":   1,
        "unfocused_unclear":   2,
    },
    "social_interaction": {
        "harmonious_caring":  0,
        "networker_influencer": 1,
        "isolated_withdrawn": 2,
    },
    "thought_pattern": {
        "clear_pure_positive": 0,
        "restless_planning":   1,
        "clouded_confused":    2,
    },
    "work_ethic": {
        "dedicated_selfless":  0,
        "ambitious_results":   1,
        "inconsistent_lazy":   2,
    },
}

def build_guna_model():
    """
    Build a simple rule-based Guna classifier and save it.
    In production, replace with a real labelled dataset.
    """
    np.random.seed(42)
    n = 900  # 300 samples per class

    X_rows, y_rows = [], []
    for label_idx in range(3):           # 0=Sattva, 1=Rajas, 2=Tamas
        for _ in range(300):
            row = []
            for feat in GUNA_FEATURE_COLS:
                probs = [0.6 if i == label_idx else 0.2 for i in range(3)]
                row.append(np.random.choice([0, 1, 2], p=probs))
            X_rows.append(row)
            y_rows.append(label_idx)

    X = np.array(X_rows)
    y = np.array(y_rows)

    guna_clf = RandomForestClassifier(n_estimators=100, random_state=42)
    guna_clf.fit(X, y)

    guna_le = LabelEncoder()
    guna_le.fit(GUNA_CLASSES)

    with open("guna_model.pkl", "wb") as f:
        pickle.dump(guna_clf, f)
    with open("guna_label_encoder.pkl", "wb") as f:
        pickle.dump(guna_le, f)

    return guna_clf, guna_le

try:
    with open("guna_model.pkl", "rb") as f:
        guna_clf = pickle.load(f)
    with open("guna_label_encoder.pkl", "rb") as f:
        guna_le = pickle.load(f)
    print("Loaded existing Guna model.")
except FileNotFoundError:
    print("Guna model not found — building a new one...")
    guna_clf, guna_le = build_guna_model()
    print("Guna model built and saved.")

# ── Seed career database ───────────────────────────────────────────────────────
def seed_db():
    df = pd.read_csv("career.csv")
    conn = sqlite3.connect("database.db")
    df.to_sql("careers", conn, if_exists="replace", index=False)
    conn.close()
    print(f"Seeded {len(df)} careers into database.db")

seed_db()

DOSHA_MAP = {
    "vata":             "Vata",
    "pitta":            "Pitta",
    "kapha":            "Kapha",
    "vata+pitta":       "Vata-Pitta",
    "pitta+kapha":      "Pitta-Kapha",
    "vata+kapha":       "Vata-Kapha",
    "vata+pitta+kapha": "Vata-Pitta-Kapha",
}

def normalise_dosha(raw):
    return DOSHA_MAP.get(raw.lower().strip(), raw)


# ── /predict — Prakriti (Dosha) prediction ────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    body    = request.get_json(force=True)
    answers = body.get("answers", {})
    guna    = body.get("guna", "Sattva")

    encoded = []
    for col in FEATURE_COLS:
        val = answers.get(col, "")
        le  = encoders[col]
        try:
            enc_val = le.transform([str(val)])[0]
        except ValueError:
            enc_val = 0
        encoded.append(enc_val)

    X         = np.array(encoded).reshape(1, -1)
    pred_idx  = clf.predict(X)[0]
    proba     = clf.predict_proba(X)[0]
    dosha_raw = encoders["Dosha"].inverse_transform([pred_idx])[0]
    dosha_db  = normalise_dosha(dosha_raw)

    proba_dict = {cls: round(float(p)*100,1) for cls, p in zip(DOSHA_CLASSES, proba)}

    conn   = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT career, description FROM careers WHERE dosha=? AND guna=?",
        (dosha_db, guna)
    )
    rows = cursor.fetchall()
    if not rows:
        cursor.execute(
            "SELECT career, description FROM careers WHERE dosha=?",
            (dosha_db,)
        )
        rows = cursor.fetchall()
    conn.close()

    careers = [{"career": r[0], "description": r[1]} for r in rows]

    return jsonify({
        "dosha":         dosha_raw,
        "dosha_display": dosha_db,
        "guna":          guna,
        "probabilities": proba_dict,
        "careers":       careers
    })


# ── /predict-guna — Triguna prediction ────────────────────────────────────────
@app.route("/predict-guna", methods=["POST"])
def predict_guna():
    """
    Accepts a JSON body with a 'guna_answers' dict mapping each GUNA_FEATURE_COLS
    key to one of its allowed answer values.
    Returns predicted guna, probabilities for all three gunas, and description.
    """
    body         = request.get_json(force=True)
    guna_answers = body.get("guna_answers", {})

    encoded = []
    for feat in GUNA_FEATURE_COLS:
        raw_val = guna_answers.get(feat, "")
        mapping = GUNA_ANSWER_MAP.get(feat, {})
        enc_val = mapping.get(raw_val, 1)   # default: Rajas (middle ground)
        encoded.append(enc_val)

    X        = np.array(encoded).reshape(1, -1)
    pred_idx = guna_clf.predict(X)[0]
    proba    = guna_clf.predict_proba(X)[0]

    predicted_guna = GUNA_CLASSES[pred_idx]

    proba_dict = {
        cls: round(float(p) * 100, 1)
        for cls, p in zip(GUNA_CLASSES, proba)
    }

    GUNA_DESC = {
        "Sattva": "Purity, clarity and wisdom. You are calm, knowledge-seeking, ethical and purpose-driven — naturally aligned with harmony and self-improvement.",
        "Rajas":  "Action, passion and ambition. You are energetic, competitive, results-driven and goal-focused — a natural mover and shaker.",
        "Tamas":  "Stability, grounding and structure. You prefer routine, security and familiar environments — valuing comfort and consistency over novelty.",
    }

    return jsonify({
        "guna":          predicted_guna,
        "probabilities": proba_dict,
        "description":   GUNA_DESC.get(predicted_guna, ""),
    })


# ── /careers — list all careers ───────────────────────────────────────────────
@app.route("/careers")
def get_careers():
    conn = sqlite3.connect("database.db")
    df   = pd.read_sql("SELECT * FROM careers ORDER BY dosha, guna", conn)
    conn.close()
    return jsonify(df.to_dict(orient="records"))


# ── /guna-questions — serve Guna question schema to the frontend ──────────────
@app.route("/guna-questions")
def guna_questions():
    questions = [
        {
            "id": "daily_routine",
            "text": "How structured is your daily routine?",
            "options": [
                {"value": "structured_mindful",  "label": "Mindfully structured — I balance work, rest and self-care intentionally"},
                {"value": "goal_driven_busy",     "label": "Goal-driven and busy — I pack my day with tasks and targets"},
                {"value": "no_fixed_routine",     "label": "No fixed routine — I go with the flow and react as things come"},
            ]
        },
        {
            "id": "motivation_source",
            "text": "What motivates you most deeply?",
            "options": [
                {"value": "inner_peace_growth",  "label": "Inner peace, wisdom and personal growth"},
                {"value": "achievement_status",  "label": "Achievement, recognition and social status"},
                {"value": "comfort_security",    "label": "Comfort, security and avoiding discomfort"},
            ]
        },
        {
            "id": "reaction_to_conflict",
            "text": "How do you typically handle conflict?",
            "options": [
                {"value": "calm_compassionate", "label": "Stay calm, listen to both sides and seek a compassionate resolution"},
                {"value": "assertive_direct",   "label": "Address it head-on — I'm direct and assertive about my position"},
                {"value": "avoid_withdraw",     "label": "Avoid or withdraw — I prefer not to engage with tension"},
            ]
        },
        {
            "id": "learning_style",
            "text": "How do you prefer to learn new things?",
            "options": [
                {"value": "reflective_deep",    "label": "Through deep reflection, research and contemplation"},
                {"value": "active_competitive", "label": "Through active doing, competition and immediate challenges"},
                {"value": "passive_rote",       "label": "Through repetition and habit — step by step at my own pace"},
            ]
        },
        {
            "id": "decision_making",
            "text": "How do you make important decisions?",
            "options": [
                {"value": "thoughtful_ethical", "label": "Thoughtfully — weighing ethics, long-term impact and inner values"},
                {"value": "fast_ambitious",     "label": "Quickly and ambitiously — I act on instinct and drive"},
                {"value": "hesitant_avoidant",  "label": "With hesitation — I often delay or avoid deciding"},
            ]
        },
        {
            "id": "emotional_state",
            "text": "What best describes your usual emotional state?",
            "options": [
                {"value": "equanimous_joyful",  "label": "Equanimous and joyful — stable, content and rarely rattled"},
                {"value": "intense_passionate", "label": "Intense and passionate — emotions run strong and drive me"},
                {"value": "lethargic_dull",     "label": "Often dull or heavy — I struggle with low motivation or inertia"},
            ]
        },
        {
            "id": "goal_orientation",
            "text": "How do you approach your goals in life?",
            "options": [
                {"value": "purposeful_balanced", "label": "Purposefully — I set meaningful goals aligned with my values"},
                {"value": "aggressive_driven",   "label": "Aggressively — I pursue goals with intensity and competitiveness"},
                {"value": "unfocused_unclear",   "label": "Without clear direction — I often feel unsure of what I want"},
            ]
        },
        {
            "id": "social_interaction",
            "text": "How do you prefer to interact with others?",
            "options": [
                {"value": "harmonious_caring",    "label": "Harmoniously — I nurture deep, caring and peaceful connections"},
                {"value": "networker_influencer", "label": "Actively — I enjoy networking, influencing and being around energy"},
                {"value": "isolated_withdrawn",   "label": "Minimally — I prefer solitude or small, low-energy interactions"},
            ]
        },
        {
            "id": "thought_pattern",
            "text": "What best describes your typical thought patterns?",
            "options": [
                {"value": "clear_pure_positive", "label": "Clear, positive and constructive — I focus on the good"},
                {"value": "restless_planning",   "label": "Restless and always planning — my mind rarely stops"},
                {"value": "clouded_confused",    "label": "Often cloudy or confused — I find it hard to think clearly"},
            ]
        },
        {
            "id": "work_ethic",
            "text": "How would you describe your work ethic?",
            "options": [
                {"value": "dedicated_selfless",  "label": "Dedicated and selfless — I work for purpose, not just reward"},
                {"value": "ambitious_results",   "label": "Ambitious and results-focused — I push hard to excel and win"},
                {"value": "inconsistent_lazy",   "label": "Inconsistent — I find it hard to stay motivated and disciplined"},
            ]
        },
    ]
    return jsonify({"questions": questions, "guna_feature_cols": GUNA_FEATURE_COLS})


if __name__ == "__main__":
    print("Prakriti + Guna + Career API → http://localhost:5000")
    app.run(debug=True, port=5000)