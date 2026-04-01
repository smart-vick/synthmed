# SYNTHMED - AI RULES & GUIDELINES
**Version:** 1.0
**Date:** April 1, 2026
**Status:** ACTIVE
**Author:** Senior Developer + AI Integration Lead
**Audience:** AI Agents, Claude Code, LLMs, Development Team

---

## 1. PURPOSE

This document defines how AI (Claude, agents, LLMs) should interact with the SynthMed codebase, make decisions, and generate code. It ensures:
- **Consistency** across all AI-generated code
- **Quality** meeting enterprise standards
- **Safety** preventing beginner mistakes
- **Alignment** with business goals (making money)
- **Maintainability** so humans can read/modify everything

**Golden Rule:** "If it looks beginner, it's wrong. Make it enterprise-grade."

---

## 2. CODE GENERATION RULES

### 2.1 Naming Conventions (STRICT)

#### ✅ CORRECT
```javascript
// Components: PascalCase
export const PricingTable = () => { }
export const ApiKeyForm = () => { }

// Functions: camelCase
function calculateMonthlyRevenue() { }
const validateApiKey = () => { }

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.synthmed.com';
const MAX_API_CALLS = 50000;
const JWT_EXPIRY_SECONDS = 3600;

// Classes: PascalCase
class PaymentProcessor { }
class RateLimiter { }

// Files: kebab-case
auth-service.js
payment-processor.js
api-key-validator.js

// CSS Classes: BEM notation
.btn__primary--disabled
.card__header--sticky
.form__input--error
```

#### ❌ WRONG
```javascript
// No:      function data() - unclear purpose
// Yes:     function generateSyntheticData()

// No:      let d = { } - single letter vars
// Yes:     let userData = { }

// No:      const myVar = 123 - vague naming
// Yes:     const MONTHLY_QUOTA_LIMIT = 123

// No:      function get_data() - snake_case for functions
// Yes:     function getData()

// No:      <div class="btn primary disabled"> - no BEM
// Yes:     <div class="btn__primary--disabled">
```

### 2.2 No Hardcoded Values

#### ✅ CORRECT
```javascript
// 1. Define tokens first
const colors = {
  primary: '#1e56db',
  error: '#ef4444',
  success: '#10b981'
};

// 2. Use tokens everywhere
const buttonStyle = {
  backgroundColor: colors.primary,
  color: 'white'
};

// 3. Define spacing scale
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

// Use it:
const padding = SPACING.md; // 16px
```

#### ❌ WRONG
```javascript
// NO: Hardcoded color
const buttonColor = '#1e56db';

// NO: Magic number
const margin = 16;

// NO: Inline style with hex
<div style={{ backgroundColor: '#1e56db', padding: '16px' }}>

// NO: Using px directly
const buttonPadding = '8px 16px';
// YES: Use scale
const buttonPadding = `${SPACING.xs}px ${SPACING.sm}px`;
```

### 2.3 Async/Await ONLY

#### ✅ CORRECT
```javascript
// All database operations
async function getUser(userId) {
  const user = await db.getAccountById(userId);
  return user;
}

// All API calls
async function fetchPricing() {
  const response = await fetch('/api/v1/pricing');
  return response.json();
}

// All middleware
app.post('/api/generate', async (req, res) => {
  const account = await requireAuth(req);
  const data = await generateData(req.body);
  res.json(data);
});

// Route handler
async function handleDataGeneration(req, res) {
  try {
    const result = await generateSyntheticData(req.body);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
}
```

#### ❌ WRONG
```javascript
// NO: Promises without await
getUser(123).then(user => console.log(user));

// NO: Callback hell
db.query('SELECT * FROM users', (error, results) => {
  if (error) { ... }
  results.forEach((user) => {
    db.query('SELECT * FROM orders', (err, orders) => {
      // callback hell
    });
  });
});

// NO: .then() chains
fetch('/api/data')
  .then(r => r.json())
  .then(data => process(data))
  .catch(e => error(e));
// YES: Use async/await instead
```

### 2.4 No Magic Numbers

#### ✅ CORRECT
```javascript
// Define constants for all numbers
const BCRYPT_COST = 12; // Password hashing strength
const JWT_ACCESS_EXPIRY = 3600; // 1 hour in seconds
const JWT_REFRESH_EXPIRY = 30 * 24 * 60 * 60; // 30 days
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const MAX_LOGIN_ATTEMPTS = 5;
const QUOTA_WARNING_PERCENT = 0.8; // 80%

// Use them
const passwordHash = await bcryptjs.hash(password, BCRYPT_COST);
const tokenExpiry = Date.now() + JWT_ACCESS_EXPIRY * 1000;

if (loginAttempts > MAX_LOGIN_ATTEMPTS) {
  // suspend account
}
```

#### ❌ WRONG
```javascript
// NO: Magic numbers
const passwordHash = await bcryptjs.hash(password, 12);
const expiry = Date.now() + 3600000;
if (attempts > 5) { }
if (usage / quota > 0.8) { }

// YES: Define first, then use
const BCRYPT_COST = 12;
const JWT_ACCESS_EXPIRY = 3600;
const MAX_LOGIN_ATTEMPTS = 5;
const QUOTA_WARNING_PERCENT = 0.8;
```

### 2.5 Error Handling (REQUIRED)

#### ✅ CORRECT
```javascript
// Try-catch with meaningful errors
async function generateData(req, res) {
  try {
    // Validate input
    const schema = z.object({
      records: z.number().min(1).max(10000),
      conditions: z.array(z.string())
    });
    const input = schema.parse(req.body);

    // Check quota
    const account = await db.getAccountById(req.user.id);
    if (account.monthly_usage >= account.monthly_quota) {
      return res.status(429).json({
        error: 'Quota exceeded',
        upgrade_url: 'https://synthmed.com/upgrade'
      });
    }

    // Generate data
    const data = await generateSyntheticData(input);

    // Log success
    await recordUsage(account.id, 'generate', input.records * 1);

    // Return response
    return res.json({
      ok: true,
      data,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    // Log to error tracking (Sentry, etc)
    logger.error('Data generation failed', {
      error: error.message,
      user: req.user?.id,
      timestamp: new Date()
    });

    // Return user-friendly error (NOT stack trace)
    return res.status(500).json({
      ok: false,
      error: {
        code: 'GENERATION_ERROR',
        message: 'Failed to generate data. Please try again.'
      }
    });
  }
}
```

#### ❌ WRONG
```javascript
// NO: No error handling
app.post('/generate', (req, res) => {
  const data = generateData(req.body);  // Crashes if fails
  res.json(data);
});

// NO: Exposing stack trace
res.status(500).json({
  error: error.toString(),  // Shows internals to user!
  stack: error.stack
});

// NO: Silent failures
try {
  await db.query();
} catch (e) {
  // Just ignore the error
}
```

### 2.6 Type Safety (Zod Validation)

#### ✅ CORRECT
```javascript
import { z } from 'zod';

// Define schema
const generateDataSchema = z.object({
  records: z.number()
    .min(1, 'At least 1 record required')
    .max(10000, 'Maximum 10000 records'),
  conditions: z.array(z.string()).optional(),
  age_range: z.tuple([z.number(), z.number()]).optional()
});

// Use in handler
app.post('/api/v1/data/generate', async (req, res) => {
  // Parse and validate
  const result = generateDataSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: result.error.flatten()
    });
  }

  // Now we know data is valid
  const { records, conditions } = result.data;
  // ... proceed safely
});
```

#### ❌ WRONG
```javascript
// NO: Trust user input
const { records, conditions } = req.body;
// What if records = 'ABC'? What if records = 1000000?

// NO: Manual validation
if (typeof records !== 'number') { ... }
if (records < 1 || records > 10000) { ... }
// This is tedious and error-prone

// YES: Use Zod for declarative validation
```

### 2.7 Security Rules (NON-NEGOTIABLE)

#### ✅ CORRECT
```javascript
// 1. Hash passwords
const passwordHash = await bcryptjs.hash(password, BCRYPT_COST);
// Never store plain password

// 2. Hash API keys
const apiKeyHash = await bcryptjs.hash(apiKey, 10);
// Never log or expose API keys

// 3. Use parameterized queries (Supabase does this)
const { data } = await supabase
  .from('accounts')
  .select()
  .eq('email', userEmail);  // Parameterized, not SQL injection risk

// 4. Never log sensitive data
logger.info('User logged in', { userId: user.id, email: user.email });
// NO: logger.info('User logged in', { password, apiKey, token });

// 5. Validate input on server (don't trust client)
const schema = z.object({ email: z.string().email() });
const validEmail = schema.parse(req.body.email);

// 6. Rate limit auth endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'Too many login attempts'
});
app.post('/auth/login', limiter, async (req, res) => { });

// 7. Set secure headers
app.use(helmet());  // HSTS, CSP, etc

// 8. HTTPS only
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(307, `https://${req.header('host')}${req.url}`);
  }
  next();
});
```

#### ❌ WRONG
```javascript
// NO: Store plain passwords
db.insert({ email, password });  // WRONG!

// NO: Log API keys
console.log('User API key:', apiKey);  // WRONG!

// NO: SQL injection risk
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// NO: Trust client validation only
if (req.body.role === 'admin') {  // Client can lie!
  // Grant admin access
}
// YES: Verify on server from database

// NO: Expose error details
catch (e) {
  res.json({ error: e.message });  // "Unknown column 'xyz'"
}
// YES: Return generic message
catch (e) {
  res.json({ error: 'Something went wrong' });
}
```

---

## 3. ARCHITECTURAL RULES

### 3.1 No Prop Drilling

#### ✅ CORRECT
```javascript
// Use Context API for global state
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use hook in any component
export const useAuth = () => useContext(AuthContext);

// In component
function Dashboard() {
  const { user } = useAuth();  // Direct access, no prop drilling
  return <div>Hi {user.name}</div>;
}
```

#### ❌ WRONG
```javascript
// NO: Passing through 5+ levels
function App() {
  return <Level1 user={user} />;
}
function Level1({ user }) {
  return <Level2 user={user} />;
}
function Level2({ user }) {
  return <Level3 user={user} />;
}
function Level3({ user }) {
  return <Level4 user={user} />;
}
function Level4({ user }) {
  return <div>{user.name}</div>;
}
```

### 3.2 File Organization

#### ✅ CORRECT
```
src/
├── components/           # Reusable UI components
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Card.jsx
│   └── index.js          # Export all
├── pages/                # Page-level components
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   └── PricingPage.jsx
├── services/             # API calls, external services
│   ├── auth.js
│   ├── billing.js
│   └── api.js
├── hooks/                # Custom React hooks
│   ├── useAuth.js
│   ├── useBilling.js
│   └── useForm.js
├── context/              # Context providers
│   ├── AuthContext.js
│   └── BillingContext.js
├── utils/                # Helpers, formatters
│   ├── validators.js
│   ├── formatters.js
│   └── constants.js
├── styles/               # Global CSS, design tokens
│   ├── tokens.css
│   ├── base.css
│   └── components.css
└── App.jsx
```

### 3.3 Database Access Pattern

#### ✅ CORRECT
```javascript
// 1. Define abstraction in db.js
export const getAccountById = {
  get: async (id) => {
    const { data, error } = await supabase
      .from('accounts')
      .select()
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

// 2. Use in service
async function getUserAccount(userId) {
  try {
    const account = await getAccountById.get(userId);
    return account;
  } catch (error) {
    throw new Error(`Account not found: ${userId}`);
  }
}

// 3. Use in endpoint
app.get('/api/v1/account', async (req, res) => {
  const account = await getUserAccount(req.user.id);
  res.json(account);
});
```

#### ❌ WRONG
```javascript
// NO: Direct database calls in routes
app.get('/account', (req, res) => {
  supabase
    .from('accounts')
    .select()
    .eq('id', req.user.id)
    .then(data => res.json(data));
});

// NO: Raw SQL queries
db.query(`SELECT * FROM accounts WHERE id = $1`, [userId]);

// NO: Mixed business logic in routes
app.get('/account', (req, res) => {
  // Validate, fetch, calculate, format all in one place
});
```

---

## 4. DECISION-MAKING RULES FOR AI

### 4.1 When to Suggest Refactoring

#### DO REFACTOR IF:
- [ ] Code violates any rule in this document
- [ ] Function is >50 lines (break it into smaller functions)
- [ ] Function has >3 responsibilities (separation of concerns)
- [ ] Same code appears 3+ times (extract to function/component)
- [ ] Tests are hard to write (sign of poor design)
- [ ] Variable names are unclear (needs renaming)

#### DON'T REFACTOR IF:
- [ ] It's working and not blocking progress
- [ ] You don't understand why current approach exists
- [ ] It would require >2 hours of work
- [ ] It's not in the critical path to revenue

**Rule:** Refactoring is free only if it enables speed. Otherwise, move on.

### 4.2 When to Suggest New Features

#### ONLY add features if:
- [ ] It directly enables revenue (user can pay for it)
- [ ] Blocking 2+ paying customers
- [ ] Takes <4 hours to implement
- [ ] Founder explicitly requested it
- [ ] Increases conversion rate by >5%

#### DON'T add features if:
- [ ] "Nice to have" without business justification
- [ ] Takes >8 hours to implement
- [ ] Increases technical debt
- [ ] Only 1 customer wants it
- [ ] Detracts from money-making features

**Rule:** "Is this feature making us money?" If answer is "not yet", don't build it.

### 4.3 When to Suggest Testing

#### DO add tests if:
- [ ] Testing payment flow (critical business logic)
- [ ] Testing authentication (security critical)
- [ ] Testing data generation (core product)
- [ ] Endpoint has 3+ code paths (edge cases)
- [ ] Bug reported twice (prevent regression)

#### DON'T add tests if:
- [ ] UI component with no logic
- [ ] One-off script that runs once
- [ ] Already manually tested by founder
- [ ] Slows down development velocity

**Rule:** Test the critical path. Everything else is optional.

---

## 5. CODE REVIEW CHECKLIST (FOR AI)

Before suggesting any code changes, verify:

### Security
- [ ] No hardcoded secrets in code
- [ ] No SQL injection vectors
- [ ] No XSS vulnerabilities
- [ ] Passwords hashed (bcryptjs cost 12)
- [ ] API keys not logged
- [ ] HTTPS enforced in production
- [ ] CORS whitelist configured
- [ ] Rate limiting on auth endpoints

### Performance
- [ ] No N+1 queries
- [ ] Queries use indexes
- [ ] No synchronous blocking operations
- [ ] Large loops avoid database calls
- [ ] Images optimized (WebP, lazy load)
- [ ] No unnecessary re-renders

### Code Quality
- [ ] Follows naming conventions in this document
- [ ] No magic numbers (use constants)
- [ ] No hardcoded values (use tokens)
- [ ] Functions <50 lines
- [ ] Error handling present
- [ ] Input validation (Zod)
- [ ] Comments explain "why", not "what"

### Maintainability
- [ ] Clear function/variable names
- [ ] No copy-paste code (DRY principle)
- [ ] Uses design system (colors, spacing)
- [ ] Accessible (WCAG AA minimum)
- [ ] Mobile-responsive
- [ ] Keyboard navigable

### Business Value
- [ ] Contributes to revenue goal
- [ ] Solves customer problem
- [ ] Adds to MVP features
- [ ] Doesn't block shipping

---

## 6. AI AGENT BEHAVIOR RULES

### 6.1 When Reading Files
- [ ] Read CLAUDE.md first (context)
- [ ] Read PRD.md for requirements
- [ ] Read ARCHITECTURE.md for tech decisions
- [ ] Understand before suggesting changes
- [ ] Ask clarifying questions if confused

### 6.2 When Writing Code
- [ ] Always follow rules in Section 2 (Code Generation)
- [ ] No beginner patterns (see Section 2.4-2.5 for examples)
- [ ] Match existing code style
- [ ] Document non-obvious logic
- [ ] Test changes mentally before writing

### 6.3 When Suggesting Architecture
- [ ] Align with existing patterns
- [ ] Consider deployment constraints (Render)
- [ ] Consider cost implications
- [ ] Explain trade-offs (speed vs complexity)
- [ ] Recommend simplest solution that works

### 6.4 When Making Business Decisions
- [ ] Prioritize revenue impact
- [ ] Consider founder's time (what saves hours?)
- [ ] Recommend 80/20 solutions
- [ ] Say "no" to scope creep
- [ ] Focus on critical path to first revenue

---

## 7. PROHIBITED PATTERNS

### ❌ NEVER DO THESE

```javascript
// 1. No console.log in production
console.log('User ID:', userId);  // Use logger instead

// 2. No async without await
function getData() {
  fetch('/api/data');  // Fire and forget - wrong!
}

// 3. No try-catch without handling
try {
  await db.query();
} catch (e) {
  // Ignore error
}

// 4. No mixing responsibilities
async function handleLogin(req, res) {
  // Validation
  // Auth
  // Logging
  // Email sending
  // All in one function - too many responsibilities!
}

// 5. No hardcoded API URLs
const url = 'http://localhost:3000/api/users';
// Use: const url = `${API_BASE_URL}/users`;

// 6. No exposing secrets
const STRIPE_SECRET = 'sk_test_123456';
// Use: const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

// 7. No boolean trap functions
function deleteUser(userId, soft, cascade, sendEmail) {
  // What does deleteUser(123, true, false, true) mean?
}
// Use: deleteUser(userId, { soft: true, cascade: false, sendEmail: true })

// 8. No silent failures
const data = optionallyGetData();  // What if it fails?

// 9. No duplicate state
const [userData, setUserData] = useState();
const [userEmail, setUserEmail] = useState();
const [userName, setUserName] = useState();
// Use: const [user, setUser] = useState({ email: '', name: '' })

// 10. No magic values without explanation
if (user.plan === 3) {  // What is 3? Pro? Enterprise?
}
// Use: const PLAN_PRO = 'pro'; if (user.plan === PLAN_PRO)
```

---

## 8. WHEN IN DOUBT

If you're unsure about implementation:

1. **Check this document** - Is the answer here?
2. **Check ARCHITECTURE.md** - How is it already implemented?
3. **Check existing code** - How did they solve similar problem?
4. **Ask the team** - Slack message asking for clarification
5. **Be conservative** - Choose simpler solution over complex

**Default:** When in doubt, do what makes the code easier to understand and maintain. Complexity for complexity's sake = bad.

---

## 9. CONTINUOUS IMPROVEMENT

This document evolves. AI agents should:
- [ ] Suggest improvements to this document
- [ ] Flag patterns that aren't covered
- [ ] Update rules after successful patterns
- [ ] Deprecate rules that aren't working
- [ ] Share learnings with team

**Monthly Review:** Founder reviews with team monthly to update this document based on what works.

---

**Document Status:** ACTIVE & ENFORCED
**Last Updated:** April 1, 2026
**Enforcer:** All AI agents, Claude Code, development team
**Violation:** If code violates these rules, it goes back to AI for revision (before human review)
