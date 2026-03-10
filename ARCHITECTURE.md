# MLM Admin — What Each Page Does (Client Guide)

This guide explains **each screen** in the MLM Admin app in simple terms: what you see, what you can do there, and why it’s there.

---

## What is this app?

The **MLM Admin** is the back-office website for your administrators. They use it to manage members (users), their wallets and payments, withdrawals, products, orders, earnings rules, and system settings—all from one place. After logging in, every section is available from the same sidebar and top bar; only the main content area changes from page to page.

---

## Login page

**Where you see it:** When you first open the app (or after logging out).

**What it’s for:** Only people with admin credentials can use the rest of the app. On this page they enter their **email** and **password** and click to sign in.

**What you can do:**  
- Enter email and password.  
- Submit the form (the app checks that the fields are filled and valid).  
- See a success message when login works, or an error if something is wrong.

**What happens next:** After a successful login, the app takes the admin to the **Dashboard**. In the future, login will also remember the session (e.g. with a token) so they don’t have to log in again every time.

---

## Dashboard

**Where you see it:** Right after login; also when you click **Dashboard** in the sidebar.

**What it’s for:** A single “home” screen that gives a quick overview of the business: key numbers, wallet summary, charts, things that need attention, and recent activity.

**What you see:**  
- A welcome line and the current date.  
- **System overview** — e.g. total users, active users, number of merchants, with simple trend indicators.  
- **Financial snapshot** — e.g. total earnings, total withdrawals.  
- **User metrics** — e.g. new registrations, active network size.  
- **Wallet summary** — balances for different wallet types (e.g. Cash, Product Voucher, Autoship).  
- **Charts** — e.g. overview and package distribution.  
- **Pending actions** — items that need admin attention (e.g. pending withdrawals, flagged users).  
- **Activity feed** — recent events in the system.

**What you can do:**  
- Scan the numbers and charts to understand how the network is doing.  
- Use the sidebar to jump to any other section (users, wallets, payments, etc.).  
- Use “Export Report” (when available) to download data.

**Why it’s useful:** Lets admins see the big picture without opening each section one by one.

---

## User Management (Users list)

**Where you see it:** When you click **User Management** in the sidebar.

**What it’s for:** See all members (users) in one table, filter and search them, open a quick profile, or go to a full user page. From here you can also suspend, reactivate, flag, or reset passwords.

**What you see:**  
- A **table** of users with columns such as: ID, name, email, package, status, join date.  
- **Filters** — e.g. by status (Active / Suspended / Flagged), package, role, and date range.  
- A **search** box to find users by name, email, username, or ID.  
- **Row actions** (e.g. View, Suspend, Reactivate, Flag, Reset password) per user.

**What you can do:**  
- Filter and search to find specific users.  
- Click **View** (or equivalent) to open the **full user detail page**.  
- Open a **quick profile** in a popup from the list.  
- **Suspend** or **Reactivate** a user (with a confirmation and optional reason).  
- **Flag** or **Remove flag** for review.  
- **Reset password** (sends a reset link to the user’s email).  
- Export the list (when the feature is enabled).

**Why it’s useful:** Central place to manage member accounts and take action when needed.

---

## User detail page

**Where you see it:** When you click to view a specific user from the User Management list (e.g. “View Profile” or the user row).

**What it’s for:** See everything about **one** member: personal info, package, status, wallets, network (upline/downlines), rank, and activity history. You can also perform the same kinds of actions (suspend, flag, reset password) from here.

**What you see:**  
- User identity: name, username, email, phone.  
- Package, status, role, rank.  
- Wallet balances (e.g. Cash, Product Voucher, Autoship).  
- Upline and downline info.  
- **Activity log** — who did what and when (e.g. “Account suspended”, “Password reset”).

**What you can do:**  
- Review all details for that user.  
- Suspend, reactivate, flag, or reset password (with confirmation).  
- Go back to the user list via the sidebar or a back action.

**Why it’s useful:** Full context for support or compliance before making a decision on an account.

---

## Wallets — Overview

**Where you see it:** Sidebar → **Wallets** → **Overview**.

**What it’s for:** A high-level view of all wallets in the system: total balances (e.g. by currency), how many are locked or frozen, and quick links to the full wallet list.

**What you see:**  
- Summary numbers (e.g. total balance in USD, total in NGN, counts of locked/frozen wallets).  
- Shortcuts or charts that help you see wallet health at a glance.

**What you can do:**  
- Understand overall wallet status.  
- Navigate to the **All Wallets** list or a specific wallet from there (depending on design).

**Why it’s useful:** Quick check on money in the system without opening each wallet.

---

## Wallets — All Wallets (list)

**Where you see it:** Sidebar → **Wallets** → **All Wallets**.

**What it’s for:** See every wallet in a table: who it belongs to, type, balance, currency, status, last update. From here you open a single wallet to see its ledger and make adjustments.

**What you see:**  
- A **table** of wallets (e.g. wallet ID, user name, type, balance, currency, status).  
- Search or filters to find specific wallets.

**What you can do:**  
- Search and filter to find a wallet.  
- Click a wallet to open the **wallet detail page**.  
- (When available) Export the list.

**Why it’s useful:** One place to find any wallet and drill into it.

---

## Wallet detail page

**Where you see it:** When you click a wallet from the “All Wallets” list.

**What it’s for:** See one wallet in full: balance, status, and a **ledger** of all credits and debits (with reason, amount, date). From here you can adjust funds or perform other wallet actions (e.g. lock/unlock) with a clear audit trail.

**What you see:**  
- Wallet info: owner, type, balance, currency, status.  
- A **ledger table**: each row is a credit or debit with amount, reason, and timestamp.

**What you can do:**  
- **Adjust funds** — add or deduct money and give a reason (e.g. “Manual correction”, “Refund”).  
- **Other actions** — e.g. lock, freeze, or unlock the wallet (via the action modal).  
- Go back to the wallet list.

**Why it’s useful:** Correct errors, handle disputes, or apply policy (e.g. freezing) with full visibility of history.

---

## Payments (list)

**Where you see it:** Sidebar → **Payments**.

**What it’s for:** See all payment transactions in one list so you can find a specific payment, check its status, and open the full payment detail to approve, reject, or investigate.

**What you see:**  
- A **table** of payments (e.g. ID, user, amount, method, status, date).  
- Filters and search to narrow down by status, date, user, etc.

**What you can do:**  
- Filter and search.  
- Click a payment to open the **payment detail page**.  
- Export (when available).

**Why it’s useful:** Central view of all money coming in and their status.

---

## Payment detail page

**Where you see it:** When you click a payment from the Payments list.

**What it’s for:** See full details of **one** payment (who, how much, when, method, status) and take action: e.g. approve, reject, or mark for review.

**What you see:**  
- All payment fields (amount, currency, method, status, reference, dates, related user, etc.).  
- Buttons or menu to **approve**, **reject**, or perform other actions.

**What you can do:**  
- Review the payment.  
- **Approve** or **Reject** (usually with a confirmation and optional note).  
- Go back to the payments list.

**Why it’s useful:** Make sure each payment is correct before approving, and keep a clear record of decisions.

---

## Withdrawals — All requests / Pending

**Where you see it:** Sidebar → **Withdrawals** → **All Requests** or **Pending**.

**What it’s for:** See withdrawal requests from members. “All Requests” shows every withdrawal; “Pending” shows only those waiting for approval so admins can process them quickly.

**What you see:**  
- A **table** of withdrawals (e.g. ID, user, amount, status, date).  
- Filters and search.  
- “Pending” view pre-filtered to requests that need action.

**What you can do:**  
- Filter and search.  
- Click a withdrawal to open the **withdrawal detail page**.  
- Export (when available).

**Why it’s useful:** Ensures withdrawal requests are not missed and can be reviewed in one place.

---

## Withdrawal detail page

**Where you see it:** When you click a withdrawal from the Withdrawals list.

**What it’s for:** See full details of **one** withdrawal request (user, amount, bank/payout details, status) and **approve** or **reject** it, often with a reason or note.

**What you see:**  
- Withdrawal info: user, amount, currency, payout method, status, dates.  
- Buttons or menu for **Approve** and **Reject**.

**What you can do:**  
- **Approve** — release the payout (with confirmation).  
- **Reject** — decline with an optional reason (with confirmation).  
- Go back to the withdrawals list.

**Why it’s useful:** Control over payouts and a clear record of why a withdrawal was approved or rejected.

---

## Earnings & Compensation

**Where you see it:** Sidebar → **Earnings**. This section has **tabs** at the top: Overview, Bonuses, Ranking & Stages, CPV Config, Monitoring.

**What it’s for:** Configure and monitor how members earn: bonuses, ranks, CPV (product value), and system-wide rules. Each tab focuses on one area so admins can manage the compensation plan without mixing everything on one screen.

**What you see (by tab):**  
- **Overview** — summary of earning rules and key metrics.  
- **Bonuses** — how bonuses are calculated and paid (e.g. referral, rank).  
- **Ranking & Stages** — rank levels and what is required to move up.  
- **CPV Config** — product value (PV/CPV) and how it’s used in calculations.  
- **Monitoring** — current earning runs, payouts, or alerts.

**What you can do:**  
- Read and edit rules per tab (forms and tables).  
- Save changes (with confirmation where needed).  
- Switch between tabs without leaving the Earnings section.

**Why it’s useful:** Keeps all earning logic in one place and makes it easier to tune the plan and fix issues.

---

## Products (list)

**Where you see it:** Sidebar → **Products**.

**What it’s for:** See all products in the catalog: name, SKU, category, price, status. From here you add new products, edit existing ones (in a slide-out panel or full page), and filter by category or status.

**What you see:**  
- A **table** of products (e.g. name, SKU, category, price, PV, status).  
- Search and filters (e.g. by category, status).  
- A button to **add** a new product (opens a form in a drawer or new page).

**What you can do:**  
- Search and filter.  
- **Add** a new product (drawer or dedicated page).  
- **Edit** a product (open drawer or go to the product edit page).  
- Export (when available).

**Why it’s useful:** Single place to manage what members can buy and how it’s categorized and priced.

---

## Product edit page

**Where you see it:** When you click “Edit” on a product and go to the full edit screen (or open a product from the list for editing).

**What it’s for:** Change all details of **one** product: name, description, price, PV/CPV, images, category, status, which wallets can be used, which merchants/locations, etc.

**What you see:**  
- A **form** with all product fields (basic info, pricing, inventory, visibility, merchants, etc.).  
- Save and Cancel (or Back) buttons.

**What you can do:**  
- Update any field and **save**.  
- **Cancel** or go back to the product list without saving.

**Why it’s useful:** Full control over each product for pricing, compliance, and catalog accuracy.

---

## Orders (list)

**Where you see it:** Sidebar → **Orders**.

**What it’s for:** See all orders placed by members: order ID, user, items, total, status, date. From here you open an order to see full details and handle fulfillment or issues.

**What you see:**  
- A **table** of orders (e.g. ID, customer, total, status, date).  
- Filters and search.

**What you can do:**  
- Filter and search.  
- Click an order to open the **order detail page**.  
- Export (when available).

**Why it’s useful:** Track what was sold and what still needs to be shipped or resolved.

---

## Order detail page

**Where you see it:** When you click an order from the Orders list.

**What it’s for:** See **one** order in full: customer, items, quantities, prices, shipping address, status, payment info. Use this to resolve disputes, update status, or coordinate with logistics.

**What you see:**  
- Order header (ID, date, status, customer).  
- Line items (product, quantity, price).  
- Totals, payment method, shipping address.  
- Status and history (e.g. “Shipped”, “Delivered”).

**What you can do:**  
- Update order status (e.g. Processing, Shipped, Delivered).  
- Add notes or resolve issues.  
- Go back to the orders list.

**Why it’s useful:** Full context to support customers and manage fulfillment.

---

## Logistics

**Where you see it:** Sidebar → **Logistics**.

**What it’s for:** Configure how orders are fulfilled: shipping options, zones, carriers, pickup points, or similar logistics rules. This is **configuration**, not a list of orders.

**What you see:**  
- A **form** or set of sections for logistics settings (e.g. default carrier, zones, delivery rules).  
- Save / Cancel.

**What you can do:**  
- Change logistics rules and **save**.  
- **Cancel** to discard changes.

**Why it’s useful:** Central place to control how orders get to customers without editing each order by hand.

---

## Merchants (list)

**Where you see it:** Sidebar → **Merchants**.

**What it’s for:** See all merchants (e.g. warehouses, pickup points, partners) that can fulfill orders or hold inventory. From here you open a merchant to see details and settings.

**What you see:**  
- A **table** of merchants (e.g. name, type, region, status).  
- Search and filters.

**What you can do:**  
- Filter and search.  
- Click a merchant to open the **merchant detail page**.  
- Export (when available).

**Why it’s useful:** Manage who can fulfill orders and where products are available.

---

## Merchant detail page

**Where you see it:** When you click a merchant from the Merchants list.

**What it’s for:** See and edit **one** merchant: name, address, contact, operating hours, which products or areas they serve, and status (active/inactive).

**What you see:**  
- Merchant info (name, address, contact, status).  
- Settings or links to products/locations.  
- Edit / Save if editing is supported.

**What you can do:**  
- View or **edit** merchant details and **save**.  
- Go back to the merchants list.

**Why it’s useful:** Keep partner and location data correct for orders and logistics.

---

## Reports

**Where you see it:** Sidebar → **Reports**.

**What it’s for:** A **reports hub**: access to different report types (e.g. sales, commissions, withdrawals, user growth). Right now it may show an overview or links to each report; more report types can be added over time.

**What you see:**  
- An overview of available reports or cards/links for each report type.  
- Optional filters (e.g. date range) and an export or “Generate” button per report.

**What you can do:**  
- Choose a report type.  
- Set date range or filters (when available).  
- **Generate** or **export** the report.

**Why it’s useful:** One place for management and compliance reporting without digging through each section.

---

## Audit logs

**Where you see it:** Sidebar → **Audit Logs**.

**What it’s for:** See a **log of important actions** in the system: who did what and when (e.g. “Admin X suspended user Y”, “Admin Z approved withdrawal W”). Clicking a row opens more detail in a side panel or drawer.

**What you see:**  
- A **table** of log entries (e.g. date, user, action, target, result).  
- Filters (e.g. by date, user, action type).  
- A **detail drawer** when you click a row — full details of that event.

**What you can do:**  
- Filter by date, user, or action.  
- Click a row to open the **detail drawer** and see the full record.  
- Export the log (when available).

**Why it’s useful:** Transparency and compliance: you can always see who changed what and when.

---

## System Settings

**Where you see it:** Sidebar → **System Settings**. This section has **tabs**: Overview, General Settings, Financial Rules, Currency & Localization, Feature Toggles, Thresholds & Limits.

**What it’s for:** Configure the **global** behavior of the platform: company name, currencies, business rules, which features are on or off, and limits (e.g. min withdrawal, max bonus). Each tab groups related settings so admins don’t get lost.

**What you see (by tab):**  
- **Overview** — summary of main system settings and health.  
- **General Settings** — e.g. company name, support email, time zone.  
- **Financial Rules** — e.g. when commissions are paid, wallet rules.  
- **Currency & Localization** — supported currencies, default currency, date/number formats.  
- **Feature Toggles** — turn features on or off (e.g. “Allow withdrawals”, “Enable CPV”).  
- **Thresholds & Limits** — min/max amounts (e.g. withdrawal limits, bonus caps).

**What you can do:**  
- Change any setting in the relevant tab.  
- **Save** (often with a short summary of what changed and a confirmation).  
- **Cancel** to discard.  
- Switch between tabs to manage different areas.

**Why it’s useful:** One place to control how the whole platform behaves without touching code.

---

## How you move through the app

1. **Start** — Open the app → you see the **Login** page.  
2. **Sign in** — Enter email and password → you’re taken to the **Dashboard**.  
3. **Navigate** — Use the **sidebar** to open any section: User Management, Wallets, Payments, Withdrawals, Earnings, Products, Orders, Logistics, Merchants, Reports, Audit, System Settings. The **top bar** stays the same (e.g. search, notifications, your name).  
4. **Lists and details** — Most sections have a **list** page (table with filters) and a **detail** page (one user, one wallet, one order, etc.). You click a row or “View” to open the detail page; from there you can perform actions (approve, suspend, adjust, etc.) or go back to the list.  
5. **Tabs** — **Earnings** and **System Settings** use **tabs** at the top so you can switch between sub-pages (e.g. Bonuses, Ranking, Feature Toggles) without leaving the section.  
6. **Log out** — Use **Log out** in the sidebar → confirm → you’re back at the **Login** page.

---

*This guide describes each page from the user’s point of view. Technical details (e.g. APIs, routing) are handled inside the app; what matters for the client is what each screen is for and what can be done there.*
