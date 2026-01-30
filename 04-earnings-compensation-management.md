# 04-earnings-compensation-management

<a id="04-earnings-compensation-managementmd"></a>

# 04-earnings-compensation-management.md

**Admin Interface Specification – Earnings & Compensation Management**

* * *

<a id="1-purpose"></a>

## 1\. Purpose

This document defines the **Earnings & Compensation Management UI**, enabling administrators to:

- View and configure earning rules
- Manage bonuses, stages, and ranks
- Monitor system-wide earnings performance

> ⚠️ UI-only specification  
> No calculations executed, no historical data modification.

* * *

<a id="2-entry-points"></a>

## 2\. Entry Points

| Trigger | Route |
| --- | --- |
| Admin Sidebar → Earnings | `/admin/earnings` |
| Dashboard → Earnings Metrics | `/admin/earnings/overview` |

* * *

<a id="3-earnings-management-layout"></a>

## 3\. Earnings Management Layout

<a id="tabs-sections"></a>

### Tabs / Sections

1. Overview
2. Bonus Configuration
3. Ranking & Stages
4. CPV Configuration
5. Earnings Monitoring

* * *

<a id="4-earnings-overview"></a>

## 4\. Earnings Overview

<a id="route"></a>

### Route

```
/admin/earnings/overview

```

<a id="ui-components"></a>

### UI Components

- Total earnings (system-wide)
- Earnings by type
- Active compensation rules summary
- Last configuration update timestamp

* * *

<a id="5-bonus-configuration"></a>

## 5\. Bonus Configuration

<a id="route"></a>

### Route

```
/admin/earnings/bonuses

```

<a id="ui-components"></a>

### UI Components

- Bonus types list
- Percentage / flat value inputs
- Package-based breakdown
- Save button

<a id="bonus-types-ui"></a>

### Bonus Types (UI)

- Direct Referral Bonus
- Community Bonus
- Matching Bonus
- Leadership Bonus
- Merchant Bonuses

> ⚠️ Changes affect future earnings only (informational)

* * *

<a id="6-ranking-stages"></a>

## 6\. Ranking & Stages

<a id="route"></a>

### Route

```
/admin/earnings/ranking

```

<a id="ui-components"></a>

### UI Components

- Rank list
- Stage definitions
- Completion thresholds
- Edit buttons

* * *

<a id="7-cpv-configuration"></a>

## 7\. CPV Configuration

<a id="route"></a>

### Route

```
/admin/earnings/cpv

```

<a id="ui-components"></a>

### UI Components

- Registration CPV per package
- Product CPV values
- Milestone thresholds
- Save button

* * *

<a id="8-earnings-monitoring"></a>

## 8\. Earnings Monitoring

<a id="route"></a>

### Route

```
/admin/earnings/monitoring

```

<a id="ui-components"></a>

### UI Components

- Earnings activity feed
- High-value alerts
- Trend charts

* * *

<a id="9-safeguards-ui"></a>

## 9\. Safeguards (UI)

- No editing of historical earnings
- Confirmation modals on config changes
- Change summary before save

* * *

<a id="10-reusable-components"></a>

## 10\. Reusable Components

- `ConfigTable`
- `ThresholdEditor`
- `AdminChart`
- `ConfirmationModal`
- `InfoBanner`

* * *

<a id="11-state-management-mock"></a>

## 11\. State Management (Mock)

```
adminEarnings: {
  bonuses: []
  ranks: []
  cpvRules: {}
  activity: []
}

```

* * *

<a id="12-ux-accessibility-rules"></a>

## 12\. UX & Accessibility Rules

- Clear warning banners
- Inline validation
- Disabled save when no changes
- Version info display

* * *

<a id="13-ui-flow-summary"></a>

## 13\. UI Flow Summary

```
Admin Dashboard
   → Earnings
       → Bonuses
       → Ranking
       → CPV
       → Monitoring

```

* * *

<a id="14-future-backend-integration-notes"></a>

## 14\. Future Backend Integration Notes

When backend is introduced:

- Versioned configs
- Change approval workflows
- Audit logging
- Rollback capability

* * *

<a id="15-status"></a>

## 15\. Status

✅ Earnings admin UI defined  
✅ Change-safe  
✅ Backend-independent