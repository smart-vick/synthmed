# SynthMed 🏥

**Enterprise-Grade Synthetic Patient Data for Healthcare AI Training**

Generate realistic, PIPEDA-compliant Canadian patient records for training and testing healthcare AI systems. No real data. No privacy concerns. Ready to scale.

---

## 🎯 Why SynthMed?

- **Clinically Realistic**: Condition-specific medication correlations, lab values, and comorbidities
- **Canadian Focus**: All 13 provinces with realistic demographics
- **PIPEDA Compliant**: 100% synthetic data—zero privacy risk
- **Enterprise Ready**: JWT auth, API keys, tier-based rate limiting, usage tracking
- **Developer Friendly**: RESTful API, batch operations, CSV/JSON export
- **Cost Effective**: From free tier to enterprise licensing

---

## 💰 Pricing Tiers

| Tier | Monthly Records | Rate Limit | Cost/1K Records | Monthly Cost |
|------|---|---|---|---|
| **Free** | 1,000 | 100/hr | Free | $0 |
| **Starter** | 50,000 | 5,000/hr | $0.50 | $25 |
| **Pro** | 500,000 | 50,000/hr | $0.25 | $125 |
| **Enterprise** | Unlimited | Unlimited | $0.10 | Custom |

---

## 🚀 Quick Start

### 1. Register an Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "team@hospital.ai",
    "organization": "Hospital AI Lab",
    "password": "SecurePassword123"
  }'
```

### 2. Login & Get JWT Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "team@hospital.ai",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "account": {
    "id": 1,
    "email": "team@hospital.ai",
    "organization": "Hospital AI Lab",
    "tier": "free"
  }
}
```

### 3. Create an API Key

```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key"
  }'
```

### 4. Generate Synthetic Records

**Single Record:**
```bash
curl -X POST http://localhost:3000/api/v1/generate/preview \
  -H "Content-Type: application/json" \
  -d '{
    "province": "ON",
    "conditionCategory": "diabetes"
  }'
```

**Batch (100 records as CSV):**
```bash
curl -X POST http://localhost:3000/api/v1/generate/batch \
  -H "x-api-key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "province": "random",
    "conditionCategory": "random",
    "count": 100,
    "format": "csv"
  }' \
  > patient_data.csv
```

---

## 🔐 Security Features

✅ **JWT Authentication** - Token-based account access
✅ **API Key Management** - Secure key-based integrations
✅ **Rate Limiting** - Tier-based request limits with per-hour tracking
✅ **Input Validation** - Zod schema validation on all endpoints
✅ **Helmet.js** - Security headers (CSP, HSTS, etc.)
✅ **CORS Hardening** - Whitelist-based origin control
✅ **Audit Logging** - Track all API activity by account
✅ **Password Hashing** - bcryptjs with 10 rounds

---

## 📊 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|---|
| POST | `/api/v1/auth/register` | None | Create new account |
| POST | `/api/v1/auth/login` | None | Get JWT token |

### Account Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|---|
| GET | `/api/v1/account` | JWT | Get account details |
| POST | `/api/v1/api-keys` | JWT | Create API key |
| GET | `/api/v1/usage` | JWT | Get usage stats |

### Data Generation

| Method | Endpoint | Auth | Description |
|--------|----------|------|---|
| POST | `/api/v1/generate/preview` | None* | Generate 1 record |
| POST | `/api/v1/generate/batch` | API Key | Generate 1-100 records |

*Public endpoint with stricter rate limits. Use API key for authenticated access.

### Lead Capture

| Method | Endpoint | Auth | Description |
|--------|----------|------|---|
| POST | `/api/v1/leads` | None | Submit contact form |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|---|
| GET | `/api/v1/admin/leads` | Admin Key | List all leads |
| GET | `/api/v1/admin/leads/:id` | Admin Key | Get lead details |
| PATCH | `/api/v1/admin/leads/:id/status` | Admin Key | Update lead status |

---

## 📋 Data Fields

Each synthetic patient record includes:

```json
{
  "patient_id": "SYN-CA-1234",
  "age": 52,
  "sex": "Female",
  "province_code": "ON",
  "province": "Ontario",
  "icd10_primary": "E11",
  "diagnosis_label": "Type 2 Diabetes Mellitus",
  "medication": "Metformin 500mg",
  "bmi": 28.4,
  "bp_mmhg": "138/86",
  "glucose_mmol": 9.4,
  "hba1c_pct": 8.1,
  "los_days": 5,
  "readmit_30d": false,
  "synthetic": true
}
```

---

## 🏥 Supported Conditions

- **Cardiovascular**: Hypertension, Ischemic Heart Disease, Atrial Fibrillation
- **Diabetes**: Type 2 Diabetes, T2DM with Complications
- **Respiratory**: COPD, Asthma
- **Mental Health**: Depression, Anxiety

---

## 🌍 Supported Provinces

All 13 Canadian provinces and territories:
- Alberta (AB), British Columbia (BC), Manitoba (MB), New Brunswick (NB)
- Newfoundland and Labrador (NL), Northwest Territories (NT), Nova Scotia (NS)
- Nunavut (NU), Ontario (ON), Prince Edward Island (PE), Quebec (QC)
- Saskatchewan (SK), Yukon (YT)

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/smart-vick/synthmed.git
cd synthmed

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your configuration
nano .env

# Start server
npm start
```

---

## 🔧 Configuration

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Email (optional)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# Admin
ADMIN_KEY=your-secure-admin-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## 📈 Usage Statistics

Track your API usage:

```bash
curl -X GET http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "ok": true,
  "usage": {
    "totalRequests": 2543,
    "totalRecords": 125430,
    "totalCostCents": 3135,
    "totalCostDollars": "31.35"
  }
}
```

---

## 🧪 Testing the API

### 1. Generate a preview record

```bash
curl -X POST http://localhost:3000/api/v1/generate/preview \
  -H "Content-Type: application/json"
```

### 2. Submit a lead

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Johnson",
    "email": "sarah@hospital.ca",
    "organization": "Toronto General Hospital",
    "role": "AI Research Lead",
    "message": "Interested in bulk dataset for ML training"
  }'
```

---

## 🔄 Workflow

### For Healthcare Organizations

1. **Register** → Create account
2. **Evaluate** → Generate preview records
3. **Request** → Submit sample request form
4. **Upgrade** → Purchase API key for tier
5. **Integrate** → Start generating batches
6. **Track** → Monitor usage and costs

### For Developers

1. **Generate Single** → Test with preview endpoint
2. **Get API Key** → Create via authenticated endpoint
3. **Batch Generate** → Fetch 1-100 records as CSV/JSON
4. **Rate Limit Aware** → Implement backoff logic
5. **Track Usage** → Monitor API consumption

---

## 💼 Enterprise Features

- **Custom Tier Support**: Tailored limits and pricing
- **Webhook Notifications**: Real-time usage alerts
- **Dedicated Support**: Priority email/Slack support
- **Data Export**: Annual bulk export capability
- **Audit Reporting**: Compliance and usage reports
- **SLA Guarantee**: 99.9% uptime commitment

---

## 📄 Compliance

✅ **PIPEDA Compliant** - No real patient data, 100% synthetic
✅ **HIPAA Consideration** - De-identified synthetic records
✅ **ISO 27001** - Security best practices implemented
✅ **No Data Residency** - Data stored locally, never exported

---

## 🆘 Support

- **Email**: hello@synthmed.ca
- **Docs**: https://docs.synthmed.ca
- **Status Page**: https://status.synthmed.ca
- **GitHub Issues**: https://github.com/smart-vick/synthmed/issues

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🎓 Use Cases

- **ML Training**: Train classification models on diverse conditions
- **System Testing**: Load test healthcare software with realistic data
- **Dashboard Demo**: Populate dashboards for client presentations
- **Algorithm Development**: Test algorithm performance at scale
- **Educational**: Teach healthcare data science without privacy concerns

---

**Made with ❤️ for healthcare innovators**
