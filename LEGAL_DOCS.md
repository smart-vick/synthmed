# SynthMed Legal Documentation

**Last Updated:** April 2, 2026
**Jurisdiction:** Canada (Ontario)
**Compliance:** PIPEDA, PHIPA (Ontario)

---

## PRIVACY POLICY

### 1. Introduction

SynthMed ("we," "us," "our") operates the SynthMed API service ("Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our Service.

**Service URL:** https://synthmed.onrender.com
**Contact:** privacy@synthmed.com

### 2. Information We Collect

#### 2.1 Account Registration
When you register for SynthMed, we collect:
- Email address (required)
- Organization name (required)
- Password hash (bcryptjs, cost 12)
- Billing address (if upgrading to paid tier)
- Payment information (processed by Stripe, not stored by us)

#### 2.2 API Usage Data
We automatically collect:
- API endpoints accessed
- Number of records generated per request
- Timestamps of all API calls
- IP addresses making requests
- Response codes and error rates
- Usage aggregated by hour/day/month

**Purpose:** Usage tracking for billing, abuse detection, service optimization

**Retention:** 90 days of granular data, 2 years of aggregated statistics

#### 2.3 Communication
When you contact support:
- Email address and content
- Support tickets and responses
- Any diagnostic information you provide

**Purpose:** Providing customer support and resolving issues

**Retention:** Until support case is closed + 1 year for reference

#### 2.4 Service Logs
We maintain server logs including:
- Request/response metadata (not payload content)
- Error messages and stack traces
- Authentication attempts
- Rate limiting events

**Purpose:** Security, debugging, compliance

**Retention:** 30 days

### 3. Synthetic Data Generation

#### 3.1 Your Synthetic Data
**IMPORTANT:** Synthetic data generated through SynthMed is NOT real patient data. It is algorithmically generated to be statistically similar to real data while containing no actual patient information.

- We do NOT store generated data on our servers after the API response is sent
- You are responsible for storing, securing, and using generated data in compliance with your local regulations
- Generated data is your property to use as you see fit for your AI/ML projects

#### 3.2 Data Quality Metadata
We may collect:
- User feedback on data quality (optional surveys)
- Data quality scores for our internal improvement
- Statistical characteristics of generated datasets (to improve algorithms)

**These do NOT include actual generated records**, only metadata about generation quality.

#### 3.3 Data Residency
- All servers and databases are located in Canada (Supabase PostgreSQL)
- No data is transferred outside Canada without explicit consent
- Stripe (US-based) processes payments only; no medical data is shared with Stripe

### 4. Legal Basis for Processing

We process your personal information on these bases:

1. **Contractual Necessity** - Information needed to provide the Service
2. **Legitimate Interests** - Improving security, detecting fraud, service optimization
3. **Legal Obligation** - Compliance with Canadian laws
4. **Consent** - For optional communications and analytics

### 5. Data Sharing & Disclosure

#### 5.1 We DO NOT Share
- ❌ Personal information with third parties for marketing
- ❌ Account information with competitors
- ❌ Usage data with external analytics platforms (all tracking is first-party)

#### 5.2 We DO Share With (Limited)
- **Stripe**: Payment processing only (name, email, billing address)
- **Law Enforcement**: Only with legal process (warrant, court order)
- **Regulators**: If required by PIPEDA/PHIPA investigations
- **Service Providers**: Database host (Supabase), email provider (Gmail)

All third parties are subject to data processing agreements (DPAs) that comply with PIPEDA.

### 6. Your Data Rights (PIPEDA)

Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to:

#### 6.1 Access
Request a copy of all personal information we hold about you
- **Request method:** privacy@synthmed.com
- **Response time:** 30 days
- **Cost:** Free (except for reproduction costs for large requests)

#### 6.2 Correction
Correct inaccurate or incomplete information about you
- **How:** Update account information in dashboard, or submit correction request to privacy@synthmed.com

#### 6.3 Deletion ("Right to be Forgotten")
Request deletion of your account and personal data
- **Scope:** Email, password hash, account metadata
- **NOT deleted:** API usage logs (anonymized after 90 days), billing records (required by tax law for 7 years)
- **Request method:** privacy@synthmed.com with "DELETE MY ACCOUNT"
- **Timeline:** 30 days
- **Impact:** Cannot restore account; API keys become invalid immediately

#### 6.4 Portability
Export your data in machine-readable format (JSON, CSV)
- **Available:** Account info, API keys list, usage history
- **Request method:** Available in dashboard under Settings → Export Data

#### 6.5 Objection
Object to certain types of data processing
- Contact privacy@synthmed.com with your objection

### 7. Data Security

#### 7.1 Encryption
- **In Transit:** TLS 1.2+ (HTTPS only)
- **At Rest:** AES-256 encryption for sensitive fields
  - Passwords: bcryptjs (cost 12, ~290ms hash time)
  - API keys: Hashed in database (SHA-256), plain text shown only at creation
  - Stripe customer ID: Encrypted
- **Database:** Supabase PostgreSQL with encryption at rest

#### 7.2 Access Controls
- Authentication required for all endpoints
- Rate limiting to prevent abuse (tier-based)
- IP whitelisting available for Enterprise tier
- No hardcoded secrets in code or documentation
- API keys rotatable without service interruption

#### 7.3 Security Audit
- Last security audit: [Date to be updated]
- Penetration testing: Annual (Enterprise tier) or upon request
- Vulnerability disclosure: security@synthmed.com

#### 7.4 Incident Response
In case of unauthorized access to personal data:
1. We will investigate within 24 hours
2. Affected users notified within 7 days (per PIPEDA)
3. Details logged and made available on privacy page
4. Regulators notified if required

### 8. PIPEDA Accountability Principles

#### 8.1 Accountability
- Designated Privacy Officer: [Name] (privacy@synthmed.com)
- Privacy impact assessment conducted for all features
- Data handling procedures documented and trained

#### 8.2 Identifying Purposes
Purposes for data collection disclosed at point of collection:
- Service delivery
- Billing and payment processing
- Security and fraud prevention
- Service improvement and analytics
- Legal compliance

#### 8.3 Consent
- Registration = consent to privacy policy
- Consent is explicit for optional communications
- Consent can be withdrawn at any time (privacy@synthmed.com)

#### 8.4 Openness
- This privacy policy is publicly available
- Data handling practices transparent
- Privacy impact assessments available upon request

### 9. Children's Privacy

SynthMed is NOT intended for individuals under 18. We do not knowingly collect information from minors. If we become aware that a minor has provided personal information, we will delete it immediately and notify the responsible party.

### 10. Third-Party Links

Our website may contain links to third-party sites (Stripe, Supabase, etc.). We are not responsible for their privacy practices. Review their privacy policies before providing information.

### 11. Policy Changes

We may update this policy to reflect changes in practice, technology, or regulation. Material changes will be announced via email to registered users. Continued use of the Service after changes constitutes acceptance.

---

## TERMS OF SERVICE

### 1. Agreement to Terms

By accessing and using SynthMed, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

**Service Provider:** SynthMed Inc.
**Service URL:** https://synthmed.onrender.com
**Effective Date:** April 1, 2026

### 2. Use License

#### 2.1 Limited License
We grant you a limited, non-exclusive, non-transferable license to use the Service for:
- Developing and testing your AI/ML applications
- Training models using synthetic data
- Integrating with your systems via our API

#### 2.2 Restrictions
You agree NOT to:
- ❌ Reverse-engineer or decompile our Service
- ❌ Resell access or credentials to third parties
- ❌ Attempt to gain unauthorized access
- ❌ Use Service for illegal purposes
- ❌ Violate any laws (HIPAA, PIPEDA, PHIPA, etc.)
- ❌ Automate access without explicit permission (abuse of API)
- ❌ Scrape or collect data about other users
- ❌ Use synthetic data to create fake identities for fraud

### 3. Account Responsibility

#### 3.1 Your Obligations
- You are responsible for maintaining password confidentiality
- You are responsible for all activity under your account
- You must immediately notify us of unauthorized access (security@synthmed.com)
- You are responsible for compliance with all applicable laws using synthetic data

#### 3.2 Account Suspension
We may suspend or terminate your account if:
- You violate these Terms of Service
- You engage in fraudulent or illegal activity
- Your payment is declined or invalid
- You exceed rate limits repeatedly
- You're inactive for 12+ months (free tier only)

### 4. Intellectual Property Rights

#### 4.1 Our IP
- Service software, documentation, and algorithms are our property
- OpenAPI specification is provided for integration purposes only
- You may not use our trademarks, logos, or brand without permission

#### 4.2 Your IP
- Synthetic data generated by our API is your property
- You retain all rights to your code, applications, and models
- You grant us the right to use anonymized usage data for service improvement

#### 4.3 License Attribution
If you use SynthMed in a published work (paper, product, etc.):
- Attribution appreciated but not required
- You may use "Powered by SynthMed" in documentation

### 5. Pricing & Payment

#### 5.1 Pricing Tiers

| Tier | Monthly Cost | API Calls/Month | Trial |
|------|-------------|-----------------|-------|
| Free | $0 | 100 | N/A |
| Growth | $29 | 5,000 | 14 days |
| Pro | $149 | 50,000 | 14 days |
| Enterprise | Custom | Unlimited | Upon request |

#### 5.2 Billing
- Charges billed monthly on your subscription renewal date
- Free tier may be upgraded to Growth/Pro at any time
- Paid tiers auto-renew; cancel anytime before renewal to avoid charges
- All prices in USD

#### 5.3 Payment Processing
- Payments processed by Stripe
- Your payment information is not stored by us
- Failed payments may result in account suspension

#### 5.4 Refunds
- Monthly subscriptions: No refunds (you can cancel anytime)
- 14-day trial: Automatically converts to paid unless cancelled before expiry
- Billing errors: Contact billing@synthmed.com within 30 days

### 6. Service Availability & Performance

#### 6.1 Uptime Guarantees
- **Free/Growth:** 99% uptime (no SLA)
- **Pro:** 99.9% uptime SLA (credit for excess downtime)
- **Enterprise:** 99.95% uptime SLA with service credits

#### 6.2 Scheduled Maintenance
- Maintenance window: Tuesdays 2-4am UTC
- Advance notice of 7 days for major maintenance
- Maintenance included in downtime calculations

#### 6.3 No Guarantee of Results
We make NO guarantees that:
- Generated data will perfectly match your use case
- Generated data will improve your model performance
- Service will be uninterrupted
- Service will meet your specific requirements

You are responsible for validating data quality for your purposes.

### 7. Rate Limiting & Fair Use

#### 7.1 Rate Limits
Rate limits are enforced per tier per calendar month:
- Burst limit (per minute) enforced to prevent abuse
- Monthly limit resets at midnight UTC on 1st of each month
- Exceeding limits returns HTTP 429 with retry-after header

#### 7.2 Fair Use
You agree to use the Service fairly and not:
- Make more requests than your tier allows
- Use bots or automated tools to bypass rate limits
- Test DDoS protection or vulnerability scanning
- Create hundreds of test accounts to access free tier

Abuse may result in permanent account termination.

### 8. Warranties & Disclaimers

#### 8.1 AS-IS Service
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED:
- ❌ No warranty that Service will be error-free
- ❌ No warranty that data is fit for a particular purpose
- ❌ No warranty that data is accurate or complete
- ❌ No warranty that Service will meet your requirements

#### 8.2 Data Quality Disclaimer
**IMPORTANT:** Synthetic data is algorithmically generated for statistical similarity. It:
- Is NOT real patient data and contains no actual patient information
- May not perfectly replicate clinical patterns or rare conditions
- Should be validated by medical professionals before use in clinical decision support
- Is suitable for algorithm development, training, and testing ONLY

If you intend to use synthetic data in clinical practice, you must:
1. Conduct appropriate validation studies
2. Perform regulatory review (FDA if applicable in US)
3. Consult with medical/legal advisors
4. Document your validation methodology

**You are solely responsible for compliance with healthcare regulations (HIPAA, PIPEDA, PHIPA, FDA).**

### 9. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

WE ARE NOT LIABLE FOR:
- ❌ Loss of revenue or data
- ❌ Indirect, incidental, or consequential damages
- ❌ Business interruption or loss of profits
- ❌ Damages from your use of synthetic data
- ❌ Damages from third-party actions

**LIABILITY CAP:** Our total liability to you shall not exceed the amount you paid us in the 12 months preceding the claim, or $100 USD, whichever is greater.

**NO LIABILITY FOR:** Free tier users (who have paid $0).

These limitations apply even if we have been advised of the possibility of such damages.

### 10. Indemnification

You agree to indemnify and hold harmless SynthMed from any claims, damages, or costs (including legal fees) arising from:
- Your violation of these Terms
- Your use of synthetic data
- Your infringement of third-party rights
- Your violation of applicable laws
- Your violation of another user's rights

### 11. Third-Party Services

#### 11.1 Third-Party Integration
SynthMed integrates with:
- **Stripe** for payment processing
- **Supabase** for database hosting
- **Email service** for transactional emails

Your use of these services is subject to their terms and privacy policies.

#### 11.2 No Endorsement
We do not endorse or guarantee the products/services of third parties. Use at your own risk.

### 12. Data Retention & Deletion

#### 12.1 Account Deletion
When you delete your account:
- ✅ Email and password hash deleted within 30 days
- ✅ API keys revoked immediately
- ❌ API usage logs retained (anonymized) for 2 years per tax law
- ❌ Billing records retained for 7 years per CRA requirements
- ❌ Support tickets retained for 1 year

#### 12.2 Inactive Accounts
Free-tier accounts inactive for 12+ months may be deleted with 30 days notice.

#### 12.3 Your Responsibility
- Synthetic data generated is YOUR responsibility to manage
- We do not back up or retain your generated datasets
- Download and store your data before deletion

### 13. Dispute Resolution

#### 13.1 Governing Law
These Terms are governed by the laws of Ontario, Canada, without regard to conflict-of-law principles.

#### 13.2 Informal Resolution
Before legal action, contact us at support@synthmed.com to attempt resolution within 30 days.

#### 13.3 Arbitration
- Any dispute shall be resolved through binding arbitration in Ontario
- Arbitration shall follow the rules of the Canadian Arbitration Association
- Each party bears its own costs unless arbitrator orders otherwise
- CLASS ACTION WAIVER: You waive the right to participate in class actions

#### 13.4 Jurisdiction
By using the Service, you consent to the exclusive jurisdiction of Ontario courts.

### 14. Acceptable Use Policy

You agree NOT to use the Service for:

#### 14.1 Illegal Activities
- Creating fraudulent identities for scams
- Developing tools for financial fraud
- Training models for surveillance without consent
- Any activity violating Canadian law

#### 14.2 Unethical Use
- Training models to discriminate based on protected characteristics
- Circumventing privacy protections or security measures
- Harassment or harm to individuals
- Creating synthetic data impersonating real people for harmful purposes

#### 14.3 Commercial Misuse
- Reselling access or data without permission
- Creating competitive services from our algorithms
- Using data to identify patterns in our product
- Mass account creation to abuse free tier

**Violations may result in permanent termination without refund.**

### 15. Modification of Terms

We may modify these Terms at any time. Material changes will be announced via email. Continued use constitutes acceptance.

### 16. Severability

If any provision is found unenforceable, it will be modified to the minimum extent necessary, and other provisions remain in effect.

### 17. Contact Information

For questions about these Terms:
- **Privacy:** privacy@synthmed.com
- **Support:** support@synthmed.com
- **Billing:** billing@synthmed.com
- **Security:** security@synthmed.com
- **Legal:** legal@synthmed.com

---

**Version:** 1.0
**Last Updated:** April 2, 2026
**Effective Date:** April 1, 2026

Co-Authored-By: Claude <claude@anthropic.com>
