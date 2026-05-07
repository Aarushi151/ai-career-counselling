/* ═══════════════════════════════════════════════════════
   app.js — Prakriti + Guna Prediction + Career Guidance
   ═══════════════════════════════════════════════════════ */

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_PRAKRITI_Q = 30;
const TOTAL_GUNA_Q     = 10;

const FEATURE_COLS = [
  "Body Size","Body Weight","Height","Bone Structure","Complexion",
  "General feel of skin","Texture of Skin","Hair Color","Appearance of Hair",
  "Shape of face","Eyes","Eyelashes","Blinking of Eyes","Cheeks","Nose",
  "Teeth and gums","Lips","Nails","Appetite","Liking tastes",
  "Metabolism Type","Climate Preference","Stress Levels","Sleep Patterns",
  "Dietary Habits","Physical Activity Level","Water Intake",
  "Digestion Quality","Skin Sensitivity"
];

// ── State ──────────────────────────────────────────────────────────────────────
let answered       = 0;
let gunaSelected   = null;
let gunaAnswered   = 0;
let predictedGuna  = null;   // result from /predict-guna
let gunaMethod     = null;   // "predicted" | "manual"
let userProfile    = { name:'', age:'', email:'', education:'', hobbies:[] };

// Guna quiz questions (mirrors /guna-questions endpoint; loaded dynamically too)
const GUNA_QUESTIONS = [
  {
    id: "daily_routine",
    text: "How structured is your daily routine?",
    options: [
      { value:"structured_mindful",  label:"Mindfully structured — I balance work, rest and self-care intentionally" },
      { value:"goal_driven_busy",    label:"Goal-driven and busy — I pack my day with tasks and targets" },
      { value:"no_fixed_routine",    label:"No fixed routine — I go with the flow and react as things come" },
    ]
  },
  {
    id: "motivation_source",
    text: "What motivates you most deeply?",
    options: [
      { value:"inner_peace_growth",  label:"Inner peace, wisdom and personal growth" },
      { value:"achievement_status",  label:"Achievement, recognition and social status" },
      { value:"comfort_security",    label:"Comfort, security and avoiding discomfort" },
    ]
  },
  {
    id: "reaction_to_conflict",
    text: "How do you typically handle conflict?",
    options: [
      { value:"calm_compassionate", label:"Stay calm, listen to both sides and seek a compassionate resolution" },
      { value:"assertive_direct",   label:"Address it head-on — I'm direct and assertive about my position" },
      { value:"avoid_withdraw",     label:"Avoid or withdraw — I prefer not to engage with tension" },
    ]
  },
  {
    id: "learning_style",
    text: "How do you prefer to learn new things?",
    options: [
      { value:"reflective_deep",    label:"Through deep reflection, research and contemplation" },
      { value:"active_competitive", label:"Through active doing, competition and immediate challenges" },
      { value:"passive_rote",       label:"Through repetition and habit — step by step at my own pace" },
    ]
  },
  {
    id: "decision_making",
    text: "How do you make important decisions?",
    options: [
      { value:"thoughtful_ethical", label:"Thoughtfully — weighing ethics, long-term impact and inner values" },
      { value:"fast_ambitious",     label:"Quickly and ambitiously — I act on instinct and drive" },
      { value:"hesitant_avoidant",  label:"With hesitation — I often delay or avoid deciding" },
    ]
  },
  {
    id: "emotional_state",
    text: "What best describes your usual emotional state?",
    options: [
      { value:"equanimous_joyful",  label:"Equanimous and joyful — stable, content and rarely rattled" },
      { value:"intense_passionate", label:"Intense and passionate — emotions run strong and drive me" },
      { value:"lethargic_dull",     label:"Often dull or heavy — I struggle with low motivation or inertia" },
    ]
  },
  {
    id: "goal_orientation",
    text: "How do you approach your goals in life?",
    options: [
      { value:"purposeful_balanced", label:"Purposefully — I set meaningful goals aligned with my values" },
      { value:"aggressive_driven",   label:"Aggressively — I pursue goals with intensity and competitiveness" },
      { value:"unfocused_unclear",   label:"Without clear direction — I often feel unsure of what I want" },
    ]
  },
  {
    id: "social_interaction",
    text: "How do you prefer to interact with others?",
    options: [
      { value:"harmonious_caring",    label:"Harmoniously — I nurture deep, caring and peaceful connections" },
      { value:"networker_influencer", label:"Actively — I enjoy networking, influencing and being around energy" },
      { value:"isolated_withdrawn",   label:"Minimally — I prefer solitude or small, low-energy interactions" },
    ]
  },
  {
    id: "thought_pattern",
    text: "What best describes your typical thought patterns?",
    options: [
      { value:"clear_pure_positive", label:"Clear, positive and constructive — I focus on the good" },
      { value:"restless_planning",   label:"Restless and always planning — my mind rarely stops" },
      { value:"clouded_confused",    label:"Often cloudy or confused — I find it hard to think clearly" },
    ]
  },
  {
    id: "work_ethic",
    text: "How would you describe your work ethic?",
    options: [
      { value:"dedicated_selfless",  label:"Dedicated and selfless — I work for purpose, not just reward" },
      { value:"ambitious_results",   label:"Ambitious and results-focused — I push hard to excel and win" },
      { value:"inconsistent_lazy",   label:"Inconsistent — I find it hard to stay motivated and disciplined" },
    ]
  },
];

// ── Dosha knowledge base ───────────────────────────────────────────────────────
const DOSHA_INFO = {
  "Vata":{"cls":"vata","icon":"🌬","desc":"Governed by Air & Space — creative, enthusiastic, quick-thinking and adaptable. You thrive in dynamic, imaginative environments.","traits":["Creative & imaginative","Quick learner","Flexible and adaptable","Energetic in bursts","Sensitive to cold","Vivid dreamer","Loves change & travel","Artistic tendencies","Intuitive thinker","Light sleeper"]},
  "Pitta":{"cls":"pitta","icon":"🔥","desc":"Governed by Fire & Water — sharp, focused, goal-driven and a natural leader. You are ambitious, precise and highly motivated.","traits":["Sharp intellect","Natural leader","Highly focused","Competitive drive","Strong willpower","Excellent communicator","Organised planner","Courageous decision-maker","Detail-oriented","High achiever"]},
  "Kapha":{"cls":"kapha","icon":"🌿","desc":"Governed by Earth & Water — calm, nurturing, steady and deeply loyal. You have a natural gift for supporting and caring for others.","traits":["Calm & patient","Compassionate listener","Strong memory","Steady & reliable","Deeply nurturing","Team player","Methodical approach","Long-lasting stamina","Empathetic","Resistant to change"]},
  "vata+pitta":{"cls":"vata","icon":"🌬🔥","desc":"Your dual Vata-Pitta constitution balances creativity with ambition — ideal for roles that require both innovation and execution.","traits":["Creatively ambitious","Quick & decisive","Entrepreneurial spirit","Visionary thinker","Strategic planner","Expressive & articulate","Emotionally intense","Multitasker","Passionate","Excellent communicator"]},
  "vata+kapha":{"cls":"kapha","icon":"🌬🌿","desc":"Your dual Vata-Kapha constitution blends artistic flair with calm nurturing energy. You bring steady creativity and gentle leadership.","traits":["Creatively nurturing","Gentle communicator","Empathetic artist","Consistent creativity","Calm under pressure","Natural storyteller","Thoughtful decisions","Supportive leader","Loves beauty","Patient teacher"]},
  "pitta+kapha":{"cls":"pitta","icon":"🔥🌿","desc":"Your dual Pitta-Kapha constitution combines leadership with endurance. You are a capable, steady achiever who leads with both ambition and compassion.","traits":["Determined & patient","Strong work ethic","Natural organiser","Empathetic leader","Physically strong","Strategic thinker","Reliable team player","Goal-focused","Methodical executer","Emotionally grounded"]},
};

const DOSHA_CARD_MAP = {
  "Vata":"vata","Pitta":"pitta","Kapha":"kapha",
  "vata+pitta":"vata","vata+kapha":"kapha","pitta+kapha":"pitta",
  "Vata-Pitta":"vata","Vata-Kapha":"kapha","Pitta-Kapha":"pitta",
  "Vata-Pitta-Kapha":"vata",
};

const GUNA_DESC = {
  "Sattva": "Purity, clarity and wisdom. You are calm, knowledge-seeking, ethical and purpose-driven — naturally aligned with harmony and self-improvement.",
  "Rajas":  "Action, passion and ambition. You are energetic, competitive, results-driven and goal-focused — a natural mover and shaker.",
  "Tamas":  "Stability, grounding and structure. You prefer routine, security and familiar environments — valuing comfort and consistency over novelty.",
};

// ── Navigation ─────────────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.sect').forEach(s => s.classList.remove('show'));
  document.getElementById(id).classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goProfile() {
  document.getElementById('s-hero').style.display = 'none';
  show('s-profile');
  document.querySelectorAll('.hchip').forEach(chip => {
    chip.addEventListener('click', function(e) {
      e.preventDefault();
      const cb = this.querySelector('input');
      cb.checked = !cb.checked;
      this.classList.toggle('on', cb.checked);
      chkProfile();
    });
  });
}

// ── Profile validation ─────────────────────────────────────────────────────────
function chkProfile() {
  const name    = document.getElementById('i-name').value.trim();
  const age     = parseInt(document.getElementById('i-age').value);
  const email   = document.getElementById('i-email').value.trim();
  const edu     = document.getElementById('i-edu').value;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  document.getElementById('profileBtn').disabled = !(name && age >= 10 && age <= 80 && emailOk && edu);
}

function goQuiz() {
  const name    = document.getElementById('i-name').value.trim();
  const age     = parseInt(document.getElementById('i-age').value);
  const email   = document.getElementById('i-email').value.trim();
  const edu     = document.getElementById('i-edu').value;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  document.getElementById('f-name').classList.toggle('err', !name);
  document.getElementById('f-age').classList.toggle('err', !(age >= 10 && age <= 80));
  document.getElementById('f-email').classList.toggle('err', !emailOk);
  document.getElementById('f-edu').classList.toggle('err', !edu);
  if (!name || !(age >= 10 && age <= 80) || !emailOk || !edu) return;
  userProfile = {
    name, age, email, education: edu,
    hobbies: [...document.querySelectorAll('.hchip input:checked')].map(c => c.value)
  };
  show('s-quiz');
  document.getElementById('progBar').classList.add('show');
}

// ── Quiz (Prakriti) answer logic ───────────────────────────────────────────────
function ans(radio) {
  const card = radio.closest('.qcard');
  if (!card.classList.contains('done')) {
    card.classList.add('done');
    answered++;
    updProg();
  }
}

function pickGuna(g, el) {
  gunaSelected = g;
  gunaMethod   = 'manual';
  document.querySelectorAll('.guna-card').forEach(c => c.classList.remove('picked'));
  el.classList.add('picked');
  updProg();
}

function updProg() {
  const total = TOTAL_PRAKRITI_Q;
  const pct   = (answered / total) * 100;
  document.getElementById('progFill').style.width  = pct + '%';
  document.getElementById('progTxt').textContent   = answered + ' / ' + total;
  const allDone = answered >= total && gunaSelected;
  const btn  = document.getElementById('subBtn');
  const note = document.getElementById('subNote');
  btn.classList.toggle('ready', !!allDone);
  if (allDone) {
    note.textContent = "Everything's answered — you're ready!";
  } else {
    const parts = [];
    const left  = total - answered;
    if (left > 0) parts.push(left + ' question' + (left > 1 ? 's' : '') + ' remaining');
    if (!gunaSelected) parts.push('select your Guna');
    note.textContent = parts.join(' · ');
  }
}

// ── Guna Quiz rendering ────────────────────────────────────────────────────────
function renderGunaQuiz() {
  const container = document.getElementById('gunaQuizContainer');
  container.innerHTML = '';
  GUNA_QUESTIONS.forEach((q, idx) => {
    const opts = q.options.map(o => `
      <label class="opt">
        <input type="radio" name="gq_${q.id}" value="${o.value}"
               onchange="onGunaAns(this,'${q.id}')">
        <div class="dot"></div>
        <span>${o.label}</span>
      </label>
    `).join('');
    container.innerHTML += `
      <div class="qcard" id="gqc_${q.id}">
        <div class="qhead">
          <div class="qnum">${String(idx + 1).padStart(2,'0')}</div>
          <div class="qtext">${q.text}</div>
        </div>
        <div class="opts">${opts}</div>
      </div>
    `;
  });
}

function onGunaAns(radio, questionId) {
  const card = document.getElementById('gqc_' + questionId);
  if (!card.classList.contains('done')) {
    card.classList.add('done');
    gunaAnswered++;
    updGunaProgress();
  }
}

function updGunaProgress() {
  const pct = (gunaAnswered / TOTAL_GUNA_Q) * 100;
  document.getElementById('gunaProgFill').style.width  = pct + '%';
  document.getElementById('gunaProgTxt').textContent   = gunaAnswered + ' / ' + TOTAL_GUNA_Q;
  const btn = document.getElementById('predictGunaBtn');
  btn.classList.toggle('ready', gunaAnswered >= TOTAL_GUNA_Q);
}

function goGunaQuiz() {
  show('s-guna-quiz');
  renderGunaQuiz();
}

// ── Predict Guna from answers ──────────────────────────────────────────────────
function predictGuna() {
  const guna_answers = {};
  GUNA_QUESTIONS.forEach(q => {
    const el = document.querySelector(`[name="gq_${q.id}"]:checked`);
    if (el) guna_answers[q.id] = el.value;
  });

  document.getElementById('predictGunaBtn').disabled    = true;
  document.getElementById('predictGunaBtn').textContent = 'Analysing…';

  fetch('http://localhost:5000/predict-guna', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guna_answers })
  })
  .then(r => r.json())
  .then(d => showGunaPrediction(d))
  .catch(() => {
    // Fallback: client-side Guna scoring
    const result = clientPredictGuna(guna_answers);
    showGunaPrediction(result);
  })
  .finally(() => {
    document.getElementById('predictGunaBtn').disabled    = false;
    document.getElementById('predictGunaBtn').textContent = 'Predict My Guna ✦';
  });
}

function showGunaPrediction(data) {
  predictedGuna = data.guna;
  const banner  = document.getElementById('gunaPredictResult');
  const proba   = data.probabilities || {};

  document.getElementById('gunaPredictName').textContent = predictedGuna;
  document.getElementById('gunaPredictDesc').textContent = data.description || GUNA_DESC[predictedGuna] || '';

  // Probability pills
  const row = document.getElementById('gunaProbRow');
  row.innerHTML = '';
  Object.entries(proba)
    .sort((a,b) => b[1] - a[1])
    .forEach(([g, pct]) => {
      const pill = document.createElement('span');
      pill.className = 'guna-proba-pill' + (g === predictedGuna ? ' highlight' : '');
      pill.textContent = g + '  ' + pct.toFixed(1) + '%';
      row.appendChild(pill);
    });

  banner.classList.add('show');

  // Show "Use this Guna" prompt
  document.getElementById('useGunaPrompt').style.display = 'block';
  document.getElementById('usePredictedGunaBtn').textContent =
    `Use Predicted Guna: ${predictedGuna} →`;
  banner.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function usePredictedGuna() {
  if (!predictedGuna) return;
  gunaSelected = predictedGuna;
  gunaMethod   = 'predicted';
  // Show confirmation and navigate to Prakriti quiz
  show('s-quiz');
  document.getElementById('progBar').classList.add('show');
  // Mark Guna as selected in the manual selector too (visual feedback)
  document.querySelectorAll('.guna-card').forEach(c => {
    const val = c.querySelector('input')?.value;
    c.classList.toggle('picked', val === predictedGuna);
  });
  // Display a banner at the top of the quiz noting predicted guna
  const notice = document.getElementById('gunaNotice');
  if (notice) {
    notice.textContent = `✦ Your Guna has been set to ${predictedGuna} (AI Predicted)`;
    notice.style.display = 'block';
  }
  updProg();
}

// ── Client-side Guna fallback ──────────────────────────────────────────────────
function clientPredictGuna(answers) {
  let s = 0, r = 0, t = 0;
  const gunaMap = {
    "structured_mindful": [2,0,0], "goal_driven_busy": [0,2,0], "no_fixed_routine": [0,0,2],
    "inner_peace_growth": [2,0,0], "achievement_status": [0,2,0], "comfort_security": [0,0,2],
    "calm_compassionate": [2,0,0], "assertive_direct": [0,2,0], "avoid_withdraw": [0,0,2],
    "reflective_deep": [2,0,0],    "active_competitive": [0,2,0], "passive_rote": [0,0,2],
    "thoughtful_ethical": [2,0,0], "fast_ambitious": [0,2,0],    "hesitant_avoidant": [0,0,2],
    "equanimous_joyful": [2,0,0],  "intense_passionate": [0,2,0], "lethargic_dull": [0,0,2],
    "purposeful_balanced": [2,0,0],"aggressive_driven": [0,2,0],  "unfocused_unclear": [0,0,2],
    "harmonious_caring": [2,0,0],  "networker_influencer": [0,2,0],"isolated_withdrawn": [0,0,2],
    "clear_pure_positive": [2,0,0],"restless_planning": [0,2,0],  "clouded_confused": [0,0,2],
    "dedicated_selfless": [2,0,0], "ambitious_results": [0,2,0],  "inconsistent_lazy": [0,0,2],
  };
  for (const val of Object.values(answers)) {
    const scores = gunaMap[val] || [0,0,0];
    s += scores[0]; r += scores[1]; t += scores[2];
  }
  const total = s + r + t || 1;
  const guna  = s >= r && s >= t ? "Sattva" : r >= t ? "Rajas" : "Tamas";
  return {
    guna,
    description: GUNA_DESC[guna],
    probabilities: {
      Sattva: parseFloat(((s/total)*100).toFixed(1)),
      Rajas:  parseFloat(((r/total)*100).toFixed(1)),
      Tamas:  parseFloat(((t/total)*100).toFixed(1)),
    }
  };
}

// ── Submit Prakriti quiz ───────────────────────────────────────────────────────
function submitQuiz() {
  const form    = document.getElementById('qForm');
  const answers = {};
  for (const col of FEATURE_COLS) {
    const el = form.querySelector(`[name="${col}"]:checked`);
    if (el) answers[col] = el.value;
  }
  show('load-sect');
  document.getElementById('progBar').classList.remove('show');

  fetch('http://localhost:5000/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, guna: gunaSelected })
  })
  .then(r => r.json())
  .then(d => showResult(d))
  .catch(() => {
    const dosha = clientPredict(answers);
    showResult({
      dosha,
      dosha_display:  toDB(dosha),
      guna:           gunaSelected,
      probabilities:  fakeProbabilities(dosha),
      careers:        fallbackCareers(dosha, gunaSelected),
    });
  });
}

// ── Client-side Prakriti fallback ──────────────────────────────────────────────
function clientPredict(a) {
  let v=0, p=0, k=0;
  const r = {
    "Body Size":        { Slim:2, Medium:0, Large:-2 },
    "Body Weight":      { "Low - difficulties in gaining weight":2, "Moderate - no difficulties in gaining or losing weight":0, "Heavy - difficulties in losing weight":-2 },
    "Appetite":         { "Irregular, Scanty":2, "Strong, Unbearable":0, "Slow but steady":-2 },
    "Metabolism Type":  { fast:2, moderate:0, slow:-2 },
    "Stress Levels":    { high:2, moderate:0, low:-2 },
    "Sleep Patterns":   { short:2, moderate:0, long:-2 },
    "Climate Preference":{ warm:2, moderate:0, cool:-2 },
  };
  for (const [col, sm] of Object.entries(r)) {
    const val = a[col];
    if (val !== undefined) { const s = sm[val] || 0; v += s; if (s === 0) p += 1; k -= s; }
  }
  if (v > p && v > k) return "Vata";
  if (p > v && p > k) return "Pitta";
  return "Kapha";
}

function toDB(raw) {
  const m = { "vata":"Vata","pitta":"Pitta","kapha":"Kapha","vata+pitta":"Vata-Pitta","pitta+kapha":"Pitta-Kapha","vata+kapha":"Vata-Kapha" };
  return m[raw.toLowerCase()] || raw;
}

function fakeProbabilities(dosha) {
  const all = ["Vata","Pitta","Kapha","vata+pitta","vata+kapha","pitta+kapha"];
  const p   = {};
  all.forEach(d => p[d] = d === dosha ? 74.5 : Math.random() * 8);
  return p;
}

// ── Fallback career data ───────────────────────────────────────────────────────
const CAREER_FALLBACK = {
  "Vata":{"Sattva":[{career:"Creative Director",description:"Leads creative vision in media, branding, advertising and storytelling with innovative thinking"},{career:"Writer/Author",description:"Expresses deep ideas through writing, storytelling and philosophical content creation"},{career:"UX Researcher",description:"Studies user behavior to design meaningful and intuitive digital experiences"}],"Rajas":[{career:"Digital Marketer",description:"Handles fast paced campaigns, SEO, social media and performance marketing strategies"},{career:"Content Creator",description:"Produces engaging videos, blogs and social content with trend awareness"},{career:"Advertising Specialist",description:"Designs high impact campaigns to influence consumer behavior"}],"Tamas":[{career:"Freelancer",description:"Works independently in flexible roles but may lack consistency and discipline"},{career:"Data Entry Operator",description:"Performs repetitive digital tasks with low creativity and structure"},{career:"Junior Assistant",description:"Supports tasks without much initiative or strategic involvement"}]},
  "Pitta":{"Sattva":[{career:"Doctor",description:"Uses knowledge, discipline and leadership to heal patients and serve society"},{career:"Scientist",description:"Conducts research and innovation in fields like physics, chemistry or biology"},{career:"Judge",description:"Applies logic, fairness and strong ethics in legal decision making"}],"Rajas":[{career:"Entrepreneur",description:"Builds startups, takes risks and leads teams with ambition and competitive mindset"},{career:"Investment Banker",description:"Handles finance deals, high pressure markets and strategic investments"},{career:"Corporate Lawyer",description:"Works in legal advisory, contracts and business law with strong analytical skills"}],"Tamas":[{career:"Manager",description:"Controls team operations but may focus more on authority than innovation"},{career:"Police Officer",description:"Maintains order and discipline with authority driven approach"},{career:"Military Officer",description:"Executes structured tasks with control but limited flexibility"}]},
  "Kapha":{"Sattva":[{career:"Teacher",description:"Guides students patiently with calm, supportive and nurturing nature"},{career:"Psychologist",description:"Understands human emotions deeply and helps others mentally and emotionally"},{career:"Social Worker",description:"Works for community welfare helping people with compassion and stability"}],"Rajas":[{career:"HR Manager",description:"Manages hiring, employee relations and organizational culture"},{career:"Operations Manager",description:"Handles processes, logistics and team coordination in organizations"},{career:"Administrator",description:"Maintains systems, policies and workflow efficiency in institutions"}],"Tamas":[{career:"Clerk",description:"Performs routine administrative work with stability and minimal change"},{career:"Receptionist",description:"Handles front desk tasks with repetitive interactions"},{career:"Store Keeper",description:"Manages inventory with routine and predictable workflow"}]},
  "Vata-Pitta":{"Sattva":[{career:"Product Manager",description:"Combines creativity and strategy to manage tech products and teams"},{career:"Startup Strategist",description:"Designs innovative business models with execution focus"},{career:"AI Researcher",description:"Builds intelligent systems combining creativity and analytical thinking"}],"Rajas":[{career:"Startup Founder",description:"Highly driven innovator building scalable ventures in dynamic environments"},{career:"Growth Hacker",description:"Focuses on rapid business growth using creative marketing strategies"},{career:"Tech Consultant",description:"Advises companies on technology solutions and scaling strategies"}],"Tamas":[{career:"Sales Executive",description:"Works in sales with energy but lacks long term consistency"},{career:"Field Agent",description:"Handles on ground work without structured planning"},{career:"Support Executive",description:"Provides assistance but limited strategic thinking"}]},
  "Pitta-Kapha":{"Sattva":[{career:"Civil Servant",description:"Balances leadership, discipline and service mindset in governance roles"},{career:"Professor",description:"Combines knowledge, authority and stability in teaching higher education"},{career:"Doctor (Specialist)",description:"Provides expert medical care with deep focus and responsibility"}],"Rajas":[{career:"Operations Head",description:"Leads execution heavy processes with authority and consistency"},{career:"Project Manager",description:"Manages deadlines, teams and resources efficiently"},{career:"Business Analyst",description:"Analyzes systems and improves processes in organizations"}],"Tamas":[{career:"Supervisor",description:"Oversees work but avoids innovation or risk taking"},{career:"Security Officer",description:"Maintains safety systems with routine monitoring"},{career:"Factory Manager",description:"Handles operations with rigid structure"}]},
  "Vata-Kapha":{"Sattva":[{career:"Psychologist",description:"Combines empathy and creativity to understand human behavior deeply"},{career:"Writer",description:"Creates thoughtful and emotional content with depth and imagination"},{career:"Research Analyst",description:"Studies patterns and insights with patience and creativity"}],"Rajas":[{career:"Content Strategist",description:"Plans content marketing with creative and structured approach"},{career:"Digital Planner",description:"Designs campaigns and workflows for online platforms"},{career:"Media Manager",description:"Handles brand presence and communication strategies"}],"Tamas":[{career:"Support Staff",description:"Provides assistance without proactive growth mindset"},{career:"Clerical Assistant",description:"Handles basic office tasks with low initiative"},{career:"Back Office Worker",description:"Performs routine backend operations"}]},
};

function fallbackCareers(dosha, guna) {
  const dbDosha = toDB(dosha);
  const bucket  = CAREER_FALLBACK[dbDosha] || CAREER_FALLBACK["Vata"];
  return bucket[guna] || bucket["Sattva"] || [];
}

// ── Show results ───────────────────────────────────────────────────────────────
function showResult(data) {
  show('s-result');
  const dosha        = data.dosha;
  const doshaDisplay = data.dosha_display || toDB(dosha);
  const guna         = data.guna || gunaSelected;
  const info         = DOSHA_INFO[dosha] || DOSHA_INFO[dosha.toLowerCase()] || DOSHA_INFO["Vata"];

  // Greeting
  const firstName = userProfile.name.split(' ')[0];
  document.getElementById('resGreet').textContent  = '✦  Welcome, ' + firstName + '  ✦';
  document.getElementById('resDosha').textContent  = doshaDisplay;
  document.getElementById('resGunaBadge').innerHTML =
    ({ Sattva:'🌟', Rajas:'🔥', Tamas:'🌑' }[guna] || '◈') + ' &nbsp;' + guna + ' Guna';
  document.getElementById('resDesc').textContent = info.desc || '';

  // Meta pills
  const hobbyStr = userProfile.hobbies.length
    ? userProfile.hobbies.slice(0,3).join(', ') + (userProfile.hobbies.length > 3 ? ' +' + (userProfile.hobbies.length-3) + ' more' : '')
    : 'Not specified';
  document.getElementById('resMeta').innerHTML =
    `<span class="meta-pill">Age: <span>${userProfile.age}</span></span>
     <span class="meta-pill">Education: <span>${userProfile.education.split('(')[0].trim()}</span></span>
     <span class="meta-pill">Hobbies: <span>${hobbyStr}</span></span>`;

  // Probability cards
  const proba  = data.probabilities || {};
  const sorted = Object.entries(proba).sort((a,b) => b[1] - a[1]).slice(0,3);
  const dg     = document.getElementById('doshaGrid');
  dg.innerHTML = '';
  const shortDesc = {
    Vata:'Air & Space', Pitta:'Fire & Water', Kapha:'Earth & Water',
    'vata+pitta':'Air + Fire','vata+kapha':'Air + Earth','pitta+kapha':'Fire + Earth',
    'Vata-Pitta':'Air + Fire','Vata-Kapha':'Air + Earth','Pitta-Kapha':'Fire + Earth',
    'Vata-Pitta-Kapha':'All Three',
  };
  sorted.forEach(([d, pct]) => {
    const cls = DOSHA_CARD_MAP[d] || 'vata';
    const inf = DOSHA_INFO[d] || DOSHA_INFO[d.toLowerCase()] || { icon:'◈' };
    dg.innerHTML += `<div class="dcard ${cls}"><div class="di">${inf.icon||'◈'}</div><div class="dn">${d}</div><div class="dp">${pct.toFixed(1)}%</div><div class="dd">${shortDesc[d]||''}</div></div>`;
  });

  // Guna section on result page
  const gunaFinalSection = document.getElementById('gunaFinalSection');
  if (gunaFinalSection) {
    const methodLabel = gunaMethod === 'predicted' ? 'AI Predicted' : 'Self Selected';
    gunaFinalSection.innerHTML = `
      <div class="guna-method-tag">${methodLabel}</div>
      <div class="guna-final-title">Your Triguna</div>
      <div class="guna-final-sub">The mental quality that shapes how you think, feel and act</div>
      <div class="guna-final-row">
        <div class="guna-final-name">${({ Sattva:'🌟', Rajas:'🔥', Tamas:'🌑' }[guna] || '◈')} ${guna}</div>
        <div class="guna-final-desc">${GUNA_DESC[guna] || ''}</div>
      </div>
    `;
  }

  // Career cards
  const careers = data.careers || [];
  document.getElementById('careerSubtitle').textContent =
    `Based on your ${doshaDisplay} Prakriti and ${guna} Guna, here are your ideal career paths from our Ayurvedic career database.`;
  const cc = document.getElementById('careerCards');
  cc.innerHTML = '';
  if (careers.length) {
    careers.forEach((c, i) => {
      const rankIcons = ['🥇','🥈','🥉'];
      cc.innerHTML += `
        <div class="career-card" style="animation-delay:${i*0.1}s">
          <div class="career-rank">${rankIcons[i] || i+1}</div>
          <div class="career-info">
            <div class="career-title-txt">${c.career}</div>
            <div class="career-desc">${c.description}</div>
            <div class="career-tags">
              <span class="ctag gold">${doshaDisplay}</span>
              <span class="ctag gold">${guna}</span>
              <span class="ctag">Ayurvedic Match</span>
            </div>
          </div>
        </div>`;
    });
  } else {
    cc.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center">No careers found in database for this combination. Try a different Guna.</div>';
  }

  // Traits
  const tg = document.getElementById('traitsGrid');
  tg.innerHTML = (info.traits || []).map(t => `<div class="trait">${t}</div>`).join('');
}