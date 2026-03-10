# Segulah Compensation, Earnings & Business Rules
## Canonical Business Specification (Source of Truth)

---

## 1. Purpose of This Document

This document is the **single source of truth** for:
- Compensation logic
- Earnings calculation
- Matrix behavior
- Wallet and withdrawal rules
- CPV, ranking, and bonuses

All backend and frontend features **must align** with this document.

If a rule is not written here, it is **not assumed**.

---

## 2. Business Model Overview

- Business Type: **E-commerce + Network Marketing (MLM)**
- Compensation Structure: **Team Forced Matrix**
- Matrix Types: **3×1 and 3×2**
- Matrix Principle: **Follow Your Leader (forced spillover)**
- One matrix only (no multiple matrices)

---

## 3. Registration Packages

| Package | Registration Fee (₦) |
|---|---|
| Silver | 30,000 |
| Gold | 120,000 |
| Platinum | 600,000 |
| Ruby | 1,800,000 |
| Diamond | 6,000,000 |

### Package Rules
- All packages fill **the same matrix**
- Any package can register any other package
- Users may **upgrade** packages
- Registration package affects **earnings rates**, not matrix size

---

## 4. Matrix Rules (Critical)

### Structure
- Width: 3
- Depth: Operates as 3×1 and 3×2 (forced)
- Spillover: Left → Right, Top → Bottom
- Infinite referrals allowed, excess spills automatically

### Levels & Stages
- Total Levels: **13**
- Levels grouped into **6 stages**
- Stage 1–6 (each stage has 2 levels, except entry)

Matrix placement is **system-controlled only**.

---

## 5. Point Value (PV / CPV) System

### Registration PV (Instant)
| Package | PV |
|---|---|
| Silver | 5 |
| Gold | 20 |
| Platinum | 100 |
| Ruby | 300 |
| Diamond | 1,000 |

### Community Registration PV
| Package | CPV |
|---|---|
| Silver | 0.4 |
| Gold | 1.7 |
| Platinum | 8 |
| Ruby | 25 |
| Diamond | 83 |

### Product Purchase PV
- Personal Product Purchase PV (PPPPV)
- Community Product Purchase PV (CPPPV)

All PVs and CPVs are **admin-adjustable**.

---

## 6. Earnings Gateways (17 Total)

Members earn through the following channels:

1. Personal Daily Proceeds Allocation (PDPA)
2. Community Daily Proceeds Allocation (CDPA)
3. Direct Referral Bonus
4. Community Referral Bonus
5. Personal Product Purchase Bonus
6. Direct Referral Product Purchase Bonus
7. Community Product Purchase Bonus
8. Repeat Product Purchase Bonus
9. Matching Bonus (3 direct referrals)
10. Ranking / Stage Completion Bonus
11. CPV Cash Bonus
12. CPV Milestone Incentives
13. Leadership / Team Building Bonus
14. Merchant Personal Product Purchase Bonus
15. Merchant Direct Referral Product Purchase Bonus
16. Merchant Community Product Purchase Bonus
17. Merchant Product Delivery Bonus

Each earning must be:
- Typed
- Auditable
- Ledger-backed

---

## 7. Direct & Community Bonuses

### Direct Referral Bonus (%)

| Package | % |
|---|---|
| Silver | 8% |
| Gold | 10% |
| Platinum | 13% |
| Ruby | 15% |
| Diamond | 18% |

### Community Referral Bonus
- Flat **24%**
- Distributed across matrix levels

---

## 8. Matching Bonus (3 Direct Referrals)

| Package | Bonus |
|---|---|
| Silver | ₦5,000 |
| Gold | ₦50,000 |
| Platinum | ₦150,000 |
| Ruby | ₦350,000 |
| Diamond | ₦1,000,000 |

Rule:
- Matching bonus applies **only when referrals are same or higher package**

---

## 9. Leadership / Team Building Bonus

- ₦1,000 per **active leg**
- Applies across all packages
- Requires activity qualification

---

## 10. Ranking & Stage Completion Bonuses

Ranks are tied to **matrix level completion**.

Examples:
- Mentor
- Manager
- Senior Manager
- Director
- Senior Director
- Consultant

Stage completion bonuses range from:
- ₦65,000
- ₦650,000
- ₦6 million
- ₦50 million
- ₦500 million
- ₦4 billion

---

## 11. CPV Milestone Awards

Milestones are triggered by **cumulative CPVs**.

Includes:
- Cash rewards
- Material rewards (phones, cars, properties, estates)

Milestones are **one-time per threshold**.

---

## 12. Wallet & Currency Rules (Non-Negotiable)

### Currency Handling
- System base currency: **USD**
- Dashboard displays USD with NGN equivalent
- Users may fund wallet via:
  - Local currency
  - Company NGN account
  - USD domiciliary account
  - USDT (crypto)

### Registration Currency Lock
- Users who register in **NGN cash out in NGN**
- Users who register in **USD cash out in USD**
- Currency choice is **locked at registration**

---

## 13. Wallet Types

| Wallet Type | Withdrawable |
|---|---|
| Cash Wallet | Yes |
| Product Voucher Wallet | No |
| Autoship Wallet | No |

### Cashout Split
- Cashout earnings: 60–70% (package-based)
- Autoship voucher: 30–40%

---

## 14. Withdrawals Rules

- Withdrawals only from **Cash Wallet**
- Currency must match registration currency
- Voucher and autoship balances cannot be withdrawn
- Admin approval required
- Wallet locked during processing

---

## 15. Merchant System

### Merchant Types
- Regional Merchant
- National Merchant
- Global Merchant

Merchants:
- Earn as users
- Earn as merchants
- Earn delivery and product commissions

Merchant commissions are **separate earning types**.

---

## 16. Admin Configuration Rules

Admin can adjust:
- PV and CPV values
- Percentages
- Bonus amounts
- Thresholds
- Fees

Admin **cannot alter historical earnings**.

---

## 17. Compliance & Audit Rules

- All earnings → ledger-backed
- No deletion of financial records
- Reversals via compensating entries only
- Full audit trail required

---

## 18. Change Management Rule

Any future business change must:
1. Update this document
2. Reference affected sections
3. Trigger feature updates

No implicit changes allowed.

---

## 19. Final Statement

This document is the **authoritative business contract** between:
- Product
- Engineering
- Finance
- Admin operations

All system behavior must align with it.
