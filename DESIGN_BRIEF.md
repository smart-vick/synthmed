# 🎨 SynthMed Landing Page Redesign - Design Brief

**Project:** Complete Landing Page Redesign (From Scratch)
**Goal:** Create an impressive, conversion-focused landing page that converts 8-12% of visitors
**Timeline:** Design first, then development
**Tool:** UI/UX Pro

---

## 📋 **DESIGN SYSTEM**

### **Color Palette**

```
PRIMARY COLORS:
- Teal (Trust, Healthcare): #0a7ea4
- Teal Dark (Hover, Focus): #075f7d
- Teal Light (Background): #e6f4f9

SECONDARY COLORS:
- Green (Growth, Data): #0d7b5e
- Green Light (Background): #e6f4f0
- Amber (CTA, Urgency): #b45309
- Amber Light (Background): #fef3cd

NEUTRAL COLORS:
- Ink (Text): #0f1923
- Ink Light: #3d4f5e
- Ink Lighter: #6b7f8e
- Rule (Borders): #dde4ea
- Surface (Background): #ffffff
- Surface Light: #f5f7f9
- Red (Error): #b91c1c
```

### **Typography**

```
HEADLINE FONT (DM Serif Display):
- H1 (Hero): 44-52px, bold, line-height 1.15
- H2 (Section): 32-40px, bold, line-height 1.2
- H3 (Subsection): 24-28px, medium, line-height 1.3

BODY FONT (DM Sans):
- Body Large: 17px, regular, line-height 1.75
- Body: 15px, regular, line-height 1.6
- Body Small: 14px, regular, line-height 1.5
- Label: 12px, medium, uppercase, letter-spacing 1.2px

CODE FONT (DM Mono):
- Code: 13-14px, monospace
```

### **Spacing**

```
Base Unit: 8px

Spacing Scale:
- 4px (xs)
- 8px (sm)
- 12px (md)
- 16px (lg)
- 24px (xl)
- 32px (2xl)
- 48px (3xl)
- 64px (4xl)

Container: max-width 1160px, padding 0 24px
```

### **Border Radius**

```
- sm: 6px (buttons, inputs)
- md: 10px (cards)
- lg: 16px (large sections)
- xl: 24px (hero sections)
```

### **Shadows**

```
- sm: 0 1px 3px rgba(15,25,35,.06), 0 1px 2px rgba(15,25,35,.04)
- md: 0 4px 16px rgba(15,25,35,.08), 0 1px 4px rgba(15,25,35,.04)
- lg: 0 16px 48px rgba(15,25,35,.12), 0 4px 12px rgba(15,25,35,.06)
```

---

## 🎯 **SECTION DESIGNS**

### **SECTION 1: HEADER (Fixed)**

**Layout:**
- Logo + Nav Links (left)
- CTA Buttons (right)
- Sticky on scroll

**Components:**
- Logo: "SynthMed" (teal accent)
- Nav Links: About | Pricing | Docs | Security
- Button Primary: "Try Free Demo"
- Button Secondary: "Login"

**Design:**
- Background: White with subtle shadow when scrolled
- Height: 64px
- Responsive: Hamburger menu on mobile

---

### **SECTION 2: HERO**

**Layout:** 2-column (desktop), 1-column (mobile)

**Left Side (Copy):**
```
HEADLINE:
"Realistic Canadian Patient Data.
In Seconds. Compliant By Default."

SUBHEADING:
"Generate clinically coherent synthetic patient records for
healthcare AI teams. From concept to deployment—1 day, not 6 weeks."

TRUST LINE:
✅ 100% Synthetic  |  ✅ PIPEDA Compliant  |  ✅ Instant

BUTTONS:
[Primary] "Try Free Demo (No Credit Card)"
[Secondary] "See Pricing"
```

**Right Side (Visual):**
- Animated illustration of data flowing
- Or: Large patient card with real-looking data
- Use: Gradients from teal to green

**Design Specs:**
- Height: 600-700px
- Background: White with light teal accent on right (20% opacity)
- Typography: H1 in serif, subheading in sans

**Animations:**
- Fade-in from top
- Data animation loops
- Subtle parallax on scroll

---

### **SECTION 3: PROBLEM + SOLUTION**

**Layout:** 3 columns (desktop), 1 column (mobile)

**Left Column: The Problem**
```
HEADLINE: "The Healthcare AI Data Problem"

PROBLEM CARDS (3 rows):
❌ Real Data
"6 weeks legal review, $100K+ cost, privacy risk"

❌ Fake Data
"Random values that don't correlate (glucose=2.1, HbA1c=8.1)"

❌ Generic Data
"US-focused (ICD-10-CM not ICD-10-CA, wrong codes)"
```

**Right Column: The Solution**
```
HEADLINE: "SynthMed Solution"

SOLUTION CARDS (3 rows):
✅ Instant
"<100ms generation (seconds not weeks)"

✅ Smart
"Clinically coherent data (correlations matter)"

✅ Canadian
"ICD-10-CA codes, 13 provinces, realistic"
```

**Design Specs:**
- White background with light surface
- Problem cards: Red/amber tint
- Solution cards: Green/teal tint
- Cards have icons + copy
- Padding: 80px vertical

---

### **SECTION 4: INTERACTIVE DEMO**

**Layout:** Center, full-width

**Component Structure:**
```
┌─────────────────────────────────────────────┐
│  🧬 GENERATE SYNTHETIC PATIENT RIGHT NOW    │
├─────────────────────────────────────────────┤
│                                              │
│  [Condition ▼] [Gender ▼] [Age ▼] [Generate]│
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Patient Record (Loading animation)  │   │
│  │  ID: P-2847392                       │   │
│  │  Age: 52 | Gender: Female            │   │
│  │  Diagnosis: Type 2 Diabetes (E11.00) │   │
│  │  BP: 138/86 | Glucose: 9.4 mmol/L   │   │
│  │  HbA1c: 8.1% | BMI: 28.4             │   │
│  │                                      │   │
│  │  [Copy] [Download CSV] [Download JSON]│   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ✅ 100% Synthetic  ✅ Instant Generated    │
└─────────────────────────────────────────────┘
```

**Design Specs:**
- Background: Light teal (#e6f4f9)
- Card: White with teal border (2px)
- Dropdowns: Teal border, white background
- Button: Amber background on hover
- Patient card: Monospace font for data
- Loading state: Skeleton loading animation

**Interactions:**
- Hover on Generate button: Color change to dark teal
- Click Generate: Loading spinner
- Data appears: Fade-in animation
- Copy button: Visual feedback (checkmark on copy)

---

### **SECTION 5: CUSTOMER TESTIMONIALS**

**Layout:** 3-column carousel (desktop), 1-column (mobile)

**Card Design (per testimonial):**
```
┌─────────────────────────┐
│  ⭐⭐⭐⭐⭐              │
│                          │
│  "We needed Canadian     │
│   patient data for our   │
│   ML model. SynthMed     │
│   saved us 6 months      │
│   and $20K."             │
│                          │
│  — Dr. Sarah Chen        │
│    CTO, Healthcare       │
│    Startup               │
│    [Photo]               │
└─────────────────────────┘
```

**Design Specs:**
- Card: White with shadow
- Quote: Italic, teal accent
- Star rating: Amber color
- Photo: 60x60px circular, teal border
- Name: Bold, ink color
- Title: Light ink, smaller

**Carousel:**
- 3 visible cards
- Auto-scroll or manual controls
- Dots at bottom for pagination

---

### **SECTION 6: COMPARISON TABLE**

**Layout:** Full-width, scrollable on mobile

**Design:**
```
╔═══════════════════════════════════════════════╗
║ Feature          │ SynthMed │ Competitor │ Real│
╠═══════════════════════════════════════════════╣
║ Canadian Codes   │   ✅     │    ❌     │ ✅ │
║ Speed (<100ms)   │   ✅     │    ❌     │ ❌ │
║ Price/Month      │   $25    │   $2K     │ $8K│
║ Legal Review     │   ❌     │    ⚠️     │ ✅ │
╚═══════════════════════════════════════════════╝
```

**Design Specs:**
- Header row: Teal background, white text
- SynthMed column: Green tint or bold
- Competitor columns: Neutral
- Checkmarks: Green
- X marks: Red
- Alternating row colors for readability

---

### **SECTION 7: PRICING CALCULATOR**

**Layout:** Center, interactive widget

**Component:**
```
HEADLINE: "Pricing Calculator"

SLIDER or BUTTONS:
"How many records/month?"
[1K] [10K] [50K] [100K] [500K] [Custom]

RESULT DISPLAY:
┌─────────────────────────────────┐
│ You need: PRO TIER              │
│ Cost: $125/month (500K records) │
│ Per 1000 records: $0.25         │
│                                  │
│ Competitor cost: $2,000/month   │
│ 💰 You save: $22,500/year       │
│                                  │
│ [Get Started with Pro]           │
└─────────────────────────────────┘
```

**Design Specs:**
- Background: Light amber (#fef3cd)
- Slider: Teal color
- Result box: White with shadow
- Savings amount: Green, large font
- Button: Amber background

**Interactions:**
- Slider updates result in real-time
- Button text changes based on selection

---

### **SECTION 8: PRICING TIERS**

**Layout:** 4 columns (desktop), 1 column (mobile)

**Card Design (per tier):**
```
┌──────────────────┐
│ FREE             │
├──────────────────┤
│ $0/month         │
│                  │
│ 1,000 records    │
│ Public API       │
│ No login needed  │
│                  │
│ [Try for Free]   │
└──────────────────┘
```

**Design Specs:**
- Free tier: Light surface
- Starter: White card
- Pro: White with teal border (highlight)
- Enterprise: White with amber accent
- Button colors match tier
- Popular badge on Pro tier

---

### **SECTION 9: FAQ**

**Layout:** 2 columns (desktop), 1 column (mobile)

**Accordion Design:**
```
Q: Is this real patient data?
▼ A: No—100% synthetic. Completely private, no real PII.

Q: Can I use this in production?
▶ A: [Click to expand]
```

**Design Specs:**
- Question: Bold, teal color
- Answer: Regular, ink color
- Arrow icon: Rotates on expand
- Background: Subtle border or light tint
- Smooth expand/collapse animation

---

### **SECTION 10: FOOTER**

**Layout:** 4 columns

**Columns:**
1. **Quick Links:** API Docs | Pricing | Demo | Examples
2. **Company:** About | Blog | Careers | Contact
3. **Legal:** Privacy | Terms | PIPEDA | Security
4. **Social:** Twitter | GitHub | Slack | Email

**Design Specs:**
- Background: Dark ink (#0f1923)
- Text: White
- Links: Teal on hover
- Copyright: Small, light ink
- Divider: Subtle rule color

---

## 📱 **RESPONSIVE DESIGN**

### **Breakpoints:**
- Desktop: 1160px (max-width container)
- Tablet: 768px (adjust spacing, 2-column → 1-column)
- Mobile: 375px (full width, adjust font sizes)

### **Mobile-Specific:**
- Header: Hamburger menu
- Hero: Stack vertically
- Demo: Simplified (1 dropdown)
- Testimonials: Single column carousel
- Comparison: Horizontal scroll
- Pricing: Cards stack
- Buttons: Full width below form

---

## 🎬 **ANIMATIONS & INTERACTIONS**

### **On Page Load:**
- Header: Slide down
- Hero: Fade in, staggered
- Sections: Fade in on scroll
- Numbers: Count up (if using stats)

### **On Hover:**
- Links: Color change to teal
- Buttons: Background darker, slight shadow
- Cards: Lift up (shadow increase)

### **On Click:**
- Generate button: Loading spinner
- Accordion: Smooth expand/collapse
- Copy button: Checkmark animation

### **Scroll Interactions:**
- Parallax on hero image
- Fade in sections on scroll
- Sticky header shadow appears

---

## 📐 **LAYOUT GRID**

```
Desktop (1160px max):
- Container padding: 24px
- Section padding: 80px vertical
- Column gap: 32px

Tablet (768px):
- Container padding: 20px
- Section padding: 60px vertical
- Column gap: 24px

Mobile (375px):
- Container padding: 16px
- Section padding: 40px vertical
- Full width, stacked
```

---

## 🎨 **DESIGN CHECKLIST**

- [ ] Design all 10 sections in UI/UX Pro
- [ ] Create components library (buttons, cards, etc.)
- [ ] Design dark mode variant (optional)
- [ ] Test responsive layouts (mobile, tablet, desktop)
- [ ] Create interactive states (hover, active, disabled)
- [ ] Add loading/success states
- [ ] Create animations/transitions specs
- [ ] Export as Figma design system
- [ ] Create design handoff documentation

---

## 💻 **HANDOFF TO DEVELOPMENT**

Once design is ready:
1. Export all assets (SVG, PNG)
2. Provide color/typography specs
3. Document all interactions
4. Create component library specs
5. I'll build HTML/CSS/JS from your designs

---

## 🚀 **NEXT STEPS**

**You:**
1. Open UI/UX Pro
2. Create new design project
3. Use this brief as reference
4. Design all sections
5. Share designs (screenshot/export)

**Me:**
1. Review designs
2. Provide feedback
3. Build HTML/CSS/JS
4. Implement animations
5. Deploy to production

---

**Ready to start designing? Let me know when you have the design ready, and I'll build it immediately! 🎨**
