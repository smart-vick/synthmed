import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { insertLead, getAllLeads, getLeadById, updateLeadStatus, insertPreviewEvent, getPreviewCount, insertPsychSession, insertPsychMessage } from "./db.js";
import { sendLeadNotification } from "./mailer.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PSYCHIATRIST_SYSTEM = `You are Dr. Marina Chen, an AI psychiatry specialist operating within the OceanMind framework — a conceptual approach that maps the human psyche to the ocean depths.

THE OCEANMIND DEPTH FRAMEWORK:
🌊 SURFACE (0-10m): Presenting complaints, current mood, today's state
🐠 SHALLOWS (10-50m): Recent emotional patterns, sleep, appetite, energy, past weeks
🐙 MID-WATER (50-200m): Behavioral patterns, relationships, work and social functioning
🦈 DEEP SEA (200-1000m): Core beliefs, self-concept, attachment patterns, identity
🌑 ABYSS (1000m+): Early experiences, foundational patterns, deep unconscious material

CLINICAL KNOWLEDGE:
- DSM-5-TR and ICD-11 diagnostic frameworks
- Evidence-based psychotherapies: CBT, DBT, ACT, EMDR, psychodynamic therapy, somatic therapies
- Psychopharmacology education (never recommend specific medications or doses)
- Validated scales: PHQ-9, GAD-7, PSS-10, PCL-5, Columbia Suicide Severity Rating
- Neuroscience: HPA axis, limbic system, polyvagal theory, neuroplasticity
- Developmental psychology, attachment theory, trauma-informed care

APPROACH:
- Begin at the SURFACE — follow the person's lead
- Validate and reflect before exploring deeper
- Ask one focused question at a time — never a barrage of questions
- Use ocean metaphors organically when they illuminate (tides of emotion, currents of thought, storms that pass, depths that hold wisdom)
- Be warm, direct, and non-pathologizing
- Name patterns gently, without judgment
- When appropriate, mention that professional in-person care is available and valuable

SAFETY PROTOCOL — HIGHEST PRIORITY:
If there is ANY indication of suicidal ideation, self-harm, or harm to others:
1. Express genuine care and concern directly
2. Ask clearly about safety
3. Provide crisis resources: 988 Suicide & Crisis Lifeline (call/text 988), Crisis Text Line (text HOME to 741741), Emergency: 911
4. Strongly encourage immediate professional or emergency contact
Never diagnose definitively or prescribe. You are an AI support tool, not a replacement for professional psychiatric care.`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PROVINCES = {
  ON:"Ontario", BC:"British Columbia", AB:"Alberta", QC:"Quebec",
  NS:"Nova Scotia", MB:"Manitoba", SK:"Saskatchewan", NB:"New Brunswick",
  NL:"Newfoundland and Labrador", PE:"Prince Edward Island",
  YT:"Yukon", NT:"Northwest Territories", NU:"Nunavut"
};

const CONDITIONS = {
  cardiovascular: [
    { icd:"I10",   diagnosis_label:"Essential Hypertension",          medication:"Lisinopril 10mg",        bp_mmhg:"148/92", glucose_mmol:5.2,  hba1c_pct:5.4 },
    { icd:"I25",   diagnosis_label:"Chronic Ischaemic Heart Disease",  medication:"Metoprolol 50mg",        bp_mmhg:"136/84", glucose_mmol:5.8,  hba1c_pct:5.6 },
    { icd:"I48",   diagnosis_label:"Atrial Fibrillation",              medication:"Apixaban 5mg",           bp_mmhg:"132/80", glucose_mmol:5.1,  hba1c_pct:5.3 },
  ],
  diabetes: [
    { icd:"E11",   diagnosis_label:"Type 2 Diabetes Mellitus",         medication:"Metformin 500mg",        bp_mmhg:"138/86", glucose_mmol:9.4,  hba1c_pct:8.1 },
    { icd:"E11.6", diagnosis_label:"T2DM with Complications",          medication:"Empagliflozin 10mg",     bp_mmhg:"144/90", glucose_mmol:11.2, hba1c_pct:9.3 },
  ],
  respiratory: [
    { icd:"J44",   diagnosis_label:"COPD",                             medication:"Tiotropium Inhaler",     bp_mmhg:"158/94", glucose_mmol:5.9,  hba1c_pct:5.7 },
    { icd:"J45",   diagnosis_label:"Asthma",                           medication:"Salbutamol Inhaler PRN", bp_mmhg:"122/76", glucose_mmol:5.0,  hba1c_pct:5.2 },
  ],
  "mental-health": [
    { icd:"F32",   diagnosis_label:"Depressive Episode",               medication:"Sertraline 50mg",        bp_mmhg:"118/74", glucose_mmol:4.8,  hba1c_pct:5.1 },
    { icd:"F41",   diagnosis_label:"Anxiety Disorder",                 medication:"Escitalopram 10mg",      bp_mmhg:"124/78", glucose_mmol:5.0,  hba1c_pct:5.2 },
  ],
};

const ALL_CONDITIONS = Object.values(CONDITIONS).flat();
const randomFrom  = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randomFloat = (a, b, d=1) => Number((Math.random() * (b - a) + a).toFixed(d));
const makeId      = () => `SYN-CA-${String(randomInt(1000,9999)).padStart(4,"0")}`;

function generateRecord({ province, conditionCategory }) {
  const pvCode = (province && province !== "random")
    ? province : randomFrom(Object.keys(PROVINCES));
  const pool = (conditionCategory && conditionCategory !== "random")
    ? (CONDITIONS[conditionCategory] || ALL_CONDITIONS) : ALL_CONDITIONS;
  const cond = randomFrom(pool);
  return {
    patient_id:      makeId(),
    age:             randomInt(28, 84),
    sex:             Math.random() > 0.48 ? "Female" : "Male",
    province_code:   pvCode,
    province:        PROVINCES[pvCode],
    icd10_primary:   cond.icd,
    diagnosis_label: cond.diagnosis_label,
    medication:      cond.medication,
    bmi:             randomFloat(18, 36),
    bp_mmhg:         cond.bp_mmhg,
    glucose_mmol:    cond.glucose_mmol,
    hba1c_pct:       cond.hba1c_pct,
    los_days:        randomInt(2, 12),
    readmit_30d:     Math.random() > 0.72,
    synthetic:       true,
  };
}

app.get("/api/health", (_req, res) => {
  const count = getPreviewCount().count;
  res.json({ ok:true, service:"synthmed-api",
             uptime_seconds:Math.floor(process.uptime()),
             previews_generated:count });
});

app.post("/api/sample-request", async (req, res) => {
  const { name, email, organization, role, message } = req.body ?? {};
  if (!name || !email || !organization)
    return res.status(400).json({ ok:false, error:"name, email, and organization are required" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ ok:false, error:"Invalid email address" });
  const lead = {
    name:         String(name).trim(),
    email:        String(email).trim().toLowerCase(),
    organization: String(organization).trim(),
    role:         role    ? String(role).trim()    : "",
    message:      message ? String(message).trim() : "",
    created_at:   new Date().toISOString(),
  };
  const result = insertLead.run(lead);
  lead.id = result.lastInsertRowid;
  console.log(`[lead] #${lead.id} — ${lead.name} <${lead.email}> @ ${lead.organization}`);
  sendLeadNotification(lead).catch(err =>
    console.error("[mailer] Failed:", err.message)
  );
  return res.json({
    ok: true,
    message: "Sample request received. We will be in touch within 24 hours.",
    lead_id: lead.id,
  });
});

app.post("/api/generate-preview", (req, res) => {
  const { province="random", conditionCategory="random" } = req.body ?? {};
  const record = generateRecord({ province, conditionCategory });
  insertPreviewEvent.run({
    province:           province,
    condition_category: conditionCategory,
    format:             req.body.format || "json",
    generated_at:       new Date().toISOString(),
  });
  res.json({ ok:true, record,
    metadata:{ generator_version:"v1", validated:true,
               generated_at:new Date().toISOString() }
  });
});

app.post("/api/generate-batch", (req, res) => {
  const { province="random", conditionCategory="random", count=10 } = req.body ?? {};
  const n = Math.min(Math.max(parseInt(count)||10, 1), 50);
  const records = Array.from({ length:n }, () => generateRecord({ province, conditionCategory }));
  const headers = Object.keys(records[0]).join(",");
  const rows    = records.map(r => Object.values(r).join(",")).join("\n");
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="synthmed_preview_${n}records.csv"`);
  res.send(`${headers}\n${rows}`);
});

function adminOnly(req, res, next) {
  if (req.headers["x-admin-key"] !== (process.env.ADMIN_KEY || "dev-only"))
    return res.status(403).json({ ok:false, error:"Forbidden" });
  next();
}

app.get("/api/leads", adminOnly, (_req, res) => {
  const leads = getAllLeads.all();
  res.json({ ok:true, count:leads.length, leads });
});

app.get("/api/leads/:id", adminOnly, (req, res) => {
  const lead = getLeadById.get(req.params.id);
  if (!lead) return res.status(404).json({ ok:false, error:"Lead not found" });
  res.json({ ok:true, lead });
});

app.patch("/api/leads/:id/status", adminOnly, (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ["new", "contacted", "closed"];
  if (!allowed.includes(status))
    return res.status(400).json({ ok:false, error:"Invalid status" });
  updateLeadStatus.run(status, req.params.id);
  res.json({ ok:true, message:`Lead updated to ${status}` });
});

app.post("/api/psychiatrist/chat", async (req, res) => {
  const { messages, sessionId } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ ok: false, error: "messages array required" });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY not configured" });

  const history = messages.slice(-20).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.content).slice(0, 4000),
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";
  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: PSYCHIATRIST_SYSTEM,
      messages: history,
    });

    stream.on("text", text => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    });

    await stream.finalMessage();

    if (sessionId && fullText) {
      const now = new Date().toISOString();
      insertPsychSession.run(sessionId, now);
      const lastUser = history[history.length - 1];
      if (lastUser.role === "user")
        insertPsychMessage.run(sessionId, "user", lastUser.content, now);
      insertPsychMessage.run(sessionId, "assistant", fullText, now);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[psychiatrist]", err.message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "The connection to the depths was lost. Please try again." })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n  SynthMed API  →  http://localhost:${PORT}`);
  console.log(`  Health check  →  http://localhost:${PORT}/api/health`);
  console.log(`  Leads (admin) →  http://localhost:${PORT}/api/leads`);
  console.log(`  Site          →  http://localhost:${PORT}/index.html\n`);
});