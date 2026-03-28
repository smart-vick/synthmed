# ⚡ UI/UX Pro Quick Reference Guide

## **Using This Guide with UI/UX Pro**

### **Step 1: Set Up Your Design System**

In UI/UX Pro:
1. Create a new project: "SynthMed Landing Page"
2. Set canvas size: 1440x900 (desktop)
3. Create color styles:
   - Teal: #0a7ea4
   - Teal Dark: #075f7d
   - Green: #0d7b5e
   - Amber: #b45309
   - Ink: #0f1923
   - Neutral: #f5f7f9

4. Create text styles:
   - H1: DM Serif Display, 44px, bold
   - H2: DM Serif Display, 32px, bold
   - Body: DM Sans, 15px, regular
   - Small: DM Sans, 12px, regular

---

### **Step 2: Create Component Library**

**Create these reusable components:**

1. **Button Primary**
   - Bg: Teal (#0a7ea4)
   - Text: White
   - Padding: 12px 24px
   - Border Radius: 6px
   - Hover: Dark Teal

2. **Button Secondary**
   - Bg: Transparent
   - Border: 1.5px Rule color
   - Text: Ink
   - Hover: Light gray bg

3. **Card**
   - Bg: White
   - Border: 1px Rule color
   - Radius: 10px
   - Shadow: sm

4. **Input Field**
   - Border: 1.5px Rule
   - Focus: Teal border
   - Radius: 8px

5. **Badge**
   - Radius: 999px
   - Padding: 4px 12px
   - Font: 12px, bold

---

### **Step 3: Design in Order**

**RECOMMENDED DESIGN SEQUENCE:**

**Day 1: Core Sections**
- [ ] Header (navigation, logo, CTAs)
- [ ] Hero section (headline + visual)
- [ ] Problem/Solution (3 cards each side)

**Day 2: Interactive Elements**
- [ ] Demo section (dropdowns + patient card)
- [ ] Testimonials carousel
- [ ] Comparison table

**Day 3: Bottom Funnel**
- [ ] Pricing calculator
- [ ] Pricing tiers (4 cards)
- [ ] FAQ accordion

**Day 4: Polish**
- [ ] Footer
- [ ] Mobile responsive versions
- [ ] Hover/active states
- [ ] Final tweaks

---

### **Step 4: Specific Section Guidance**

#### **HERO SECTION**
```
Width: Full
Height: 600-700px
Background: White + light teal accent (20% opacity on right)
Layout: 2 columns (left copy, right visual)

Left Column:
- H1: "Realistic Canadian Patient Data..." (teal)
- P: Subheading (body text)
- Trust line: "✅ 100% Synthetic..."
- 2 buttons stacked vertically

Right Column:
- Large gradient box (teal to green)
- Animated data visualization or patient card
- Use subtle gradient background
```

**Design Tips:**
- Make headline POP with teal color
- Use lots of whitespace
- Button should be large and clickable
- Right visual should be engaging (consider gradient or animation)

---

#### **DEMO SECTION**
```
Background: Light teal (#e6f4f9)
Max-width: 800px, centered
Padding: 60px

Top: Headline + instructions
Middle: 3 dropdowns in a row
Bottom: Patient record card + buttons

Patient Record Style:
- White bg with teal left border (4px)
- Monospace font for data
- Clear visual hierarchy (labels + values)
- Icons for each field (optional but nice)
```

**Interactive States:**
- Hover on Generate: Button darkens
- Click Generate: Show loading spinner
- Data loads: Fade in animation
- Hover on Copy: Change to checkmark

---

#### **TESTIMONIALS SECTION**
```
Background: White
Layout: 3-column carousel
Card size: ~350px wide

Card Design:
- White bg with shadow
- 5-star rating at top (amber ⭐)
- Quote text (italic, teal accent)
- Author photo (60x60, circular, teal border)
- Name (bold) + title (light gray)
- Add carousel dots at bottom
```

**Make it Feel Real:**
- Use diverse photo styles
- Real names and titles
- Specific dollar amounts ("$20K", "6 months")
- Include metrics where possible

---

#### **COMPARISON TABLE**
```
Background: White
Border: 1px rule color
Font: Body small (14px)

Header Row:
- Bg: Teal (#0a7ea4)
- Text: White, bold
- Padding: 16px

Data Rows:
- Alternating bg (white / light surface #f5f7f9)
- Checkmarks: Green color
- X marks: Red color
- SynthMed column: Bold or light green tint

Make it scannable—use consistent spacing and alignment
```

---

#### **PRICING CALCULATOR**
```
Background: Amber light (#fef3cd)
Padding: 60px
Max-width: 600px, centered

Layout:
1. Headline: "See Your Savings"
2. Instructions: "How many records/month?"
3. Button group (1K, 10K, 50K, etc.)
4. Result box (white, shadow)

Result Box Contents:
- Tier name (bold)
- SynthMed price (large, bold, teal)
- Annual cost
- Competitor price (gray)
- Savings (large, green, bold)
- "You save: $X/year" (emphasis)
- CTA button
```

---

#### **PRICING TIERS**
```
Background: White
Layout: 4 columns (desktop), stack mobile
Card spacing: 24px gap

Card Design:
- Free: Light surface bg
- Starter: White
- Pro: White + teal border (highlight)
- Enterprise: White + amber border

Card Structure:
- Tier name (H3, bold)
- Price (very large, bold, teal)
- Description (small, gray)
- Features list (checkmarks, body small)
- Button (primary for Pro/Starter, outline for Free)

Pro Tier Tips:
- Add "⭐ Most Popular" badge
- Make border thicker (3px)
- Make button stand out
- Slight shadow elevation
```

---

### **Step 5: Mobile Responsive Design**

**Create alternate versions:**

1. **Mobile Hero:**
   - Stack into 1 column
   - Image moved below text
   - Larger button (full width)

2. **Mobile Demo:**
   - Dropdown labels on top
   - Simplified (maybe just 1-2 fields)
   - Patient card same layout

3. **Mobile Testimonials:**
   - Single column carousel
   - Cards adjusted for narrower width

4. **Mobile Pricing:**
   - 1 column stack
   - Buttons full width
   - Pro tier still highlighted

**Breakpoint sizes:**
- Desktop: 1440px (design here first)
- Tablet: 768px
- Mobile: 375px

---

### **Step 6: Interaction States**

**For each interactive element, design:**

1. **Default state** (normal)
2. **Hover state** (mouse over)
3. **Active state** (clicked)
4. **Disabled state** (if applicable)
5. **Loading state** (if applicable)
6. **Error state** (if applicable)

**Example - Button:**
```
Default: Teal bg, white text
Hover: Dark teal bg, slight shadow
Active: Even darker teal
Disabled: Gray bg, gray text, 50% opacity
```

---

### **Step 7: Animations (Document for Developer)**

Create a notes section describing animations:

```
ANIMATIONS TO IMPLEMENT:

1. Hero Fade-In
   - Duration: 0.6s
   - Type: Fade in + slight slide down
   - Trigger: Page load

2. Sections Scroll Reveal
   - Duration: 0.6s
   - Type: Fade in
   - Trigger: When section scrolls into view

3. Demo Generation
   - Duration: 1s
   - Type: Spinner loading, then fade in
   - Trigger: Click "Generate" button

4. Accordion Toggle
   - Duration: 0.3s
   - Type: Smooth expand/collapse
   - Trigger: Click question

5. Carousel Auto-Scroll
   - Duration: 5s
   - Type: Smooth scroll to next
   - Trigger: Timer or button click
```

---

### **Step 8: Color Application Guide**

**Where to use each color:**

```
TEAL (#0a7ea4):
- Primary buttons
- Headlines (H1)
- Links
- Borders on important elements
- Hover states

GREEN (#0d7b5e):
- Checkmarks (✅)
- Success states
- Solution cards
- Accents

AMBER (#b45309):
- CTA buttons (especially in sections)
- "Save $X" messages
- Urgency elements
- Star ratings

INK (#0f1923):
- Body text
- Labels
- Important info

RULE (#dde4ea):
- Borders
- Dividers
- Subtle separators

SURFACE (#f5f7f9):
- Alternate row backgrounds
- Light section backgrounds
- Cards
```

---

### **Step 9: Export & Handoff**

When design is complete:

1. **Export assets:**
   - All icons/illustrations (SVG preferred)
   - Logo files
   - Product images

2. **Document:**
   - Specify all colors with hex codes
   - List all text styles with exact specs
   - Note any special animations
   - Include spacing/padding measurements

3. **Create design system file:**
   - Reusable components
   - Color library
   - Typography styles

4. **Share with developer:**
   - Screenshot or Figma link
   - Design specs document
   - Animation requirements

---

### **QUICK CHECKLIST**

Before you start, have these ready:

- [ ] Fonts downloaded (DM Sans, DM Serif Display, DM Mono)
- [ ] Color hex codes copied
- [ ] Content/copy finalized
- [ ] Device sizes decided (1440px desktop start)
- [ ] Component library planned
- [ ] Timeline set (4 days suggested)

---

## **COMMON MISTAKES TO AVOID**

1. ❌ **Too much text** → Use short, scannable copy
2. ❌ **Weak hierarchy** → Make CTAs obvious (size/color)
3. ❌ **Too many colors** → Stick to palette
4. ❌ **Poor mobile design** → Design mobile-first mindset
5. ❌ **Inconsistent spacing** → Use 8px grid
6. ❌ **Tiny buttons** → Buttons minimum 44px height
7. ❌ **Poor contrast** → Text should be readable

---

## **DESIGN INSPIRATION SOURCES**

Reference these while designing:
- Gretel.ai (competitor - check their design)
- Stripe.com (SaaS best practices)
- Notion.so (clear hierarchy)
- Figma.com (clean design)

---

## **NEXT STEPS AFTER DESIGN**

1. Design complete → Screenshot/export
2. Send to me → I review & provide feedback
3. Any revisions → You update in UI/UX Pro
4. Approved → I build HTML/CSS/JS from your design
5. Testing → Cross-browser & mobile testing
6. Deploy → Live on production

---

**Let's make SynthMed look AMAZING! 🚀**

Questions while designing? Let me know!
