# Roberice POS & Inventory Management System

A web-based Point of Sale (POS) and Inventory Management System customized for **Roberice**, a wholesale and retail rice merchandising business located in Marikina, Philippines.

---

## Project Structure & GitHub File Navigation

Below is the directory map of repository files, frontend controllers, and backend API endpoints:

```
Roberice.SAD/
├── index.html                  # Root entry point: session check & automated role/permission redirect
├── pages/                   # User Interface Pages
│   ├── login.html              # User authentication (Admin / Cashier / Staff)
│   ├── dashboard.html          # Executive store dashboard & revenue analytics
│   ├── pos.html                # Point of Sale terminal with packaging & stock limits
│   ├── view-inventory.html     # Dynamic stock table with FIFO batch lot drill-downs
│   ├── inventory.html          # Stock management (Restock, repacking, physical count)
│   ├── products.html           # Rice varieties catalog & pricing configuration
│   ├── transactions.html       # Historical customer receipts & transaction log
│   ├── sales-report.html       # Multi-period analytics (Daily, Weekly, Monthly, Quarterly, Yearly)
│   ├── file-manager.html       # Document & invoice management repository
│   ├── audit.html              # System audit trail (adjustments, sack openings, depletions)
│   └── users.html              # User management & granular module permissions matrix
│
├── js/                      # Frontend Logic & Dynamic Controllers
│   ├── auth.js                 # Authentication, route guards, role & permission verification
│   ├── pos.js                  # POS cart, multi-packaging calculation, stock limit validation
│   ├── view-inventory.js       # Inventory table, batch drawer accordion, live depletion
│   ├── inventory.js            # Stock adjustments, sack opening modal, restocking
│   ├── dashboard.js            # KPI metrics, revenue cards, and overview summaries
│   ├── sales-report.js         # Multi-period filtering (Daily to Yearly), CSV export, print layout
│   ├── products.js             # Product catalog CRUD modal handling
│   ├── transactions.js         # Receipt viewing, transaction filtering
│   ├── file-manager.js         # Document upload, categorization, preview, download
│   ├── audit.js                # Chronological audit log rendering & filtering
│   ├── users.js                # User accounts CRUD, role presets & permissions matrix
│   ├── charts.js               # Canvas/SVG chart drawing routines
│   ├── utils.js                # Currency, dates, toasts, modal controllers, FIFO helpers
│   └── data.js                 # Shared lookup tokens & fallback test data
│
├── api/                     # Backend PHP Endpoints (PDO MySQL)
│   ├── db.php                  # Database connection configuration (roberice_db)
│   ├── login.php               # Login authentication verification & permissions loading
│   ├── users.php               # User account CRUD, password hashing & permissions matrix
│   ├── process_sale.php        # Transaction checkout & inventory deduction logic
│   ├── get_products.php        # Fetch active products catalog
│   ├── get_inventory.php       # Real-time aggregated inventory & active batch lots
│   ├── adjust_stock.php        # Restocking, open sack conversion, damage & correction
│   ├── get_adjustments.php     # Historical stock adjustments log & audit records
│   ├── add_product.php         # Create new rice variety
│   ├── update_product.php      # Edit rice variety details & prices
│   ├── delete_product.php      # Deactivate or remove product
│   ├── get_transactions.php    # Optimized batch retrieval of past sales orders & line items
│   ├── get_sales_report.php    # Multi-period sales metrics & variety volume aggregation
│   ├── get_audit_logs.php      # Retrieve audit history entries
│   └── file_manager.php        # Upload, delete, and list store documents & filtered CSV exports
│
├── css/
│   └── styles.css              # Unified responsive design system & component styles
│
├── database/
│   ├── roberice_db.sql         # Comprehensive database schema & 1-year operational dataset (3,727 transactions)
│   └── init_db.php             # Automated database installer & instant login router
│
├── assets/                  # Brand icons and logos
├── uploads/                 # Uploaded files and receipts
└── DATABASE_SETUP_GUIDE.txt    # Setup notes
```

---

## Page Directory & Feature Breakdown

| Page | File | Default Roles | Core Features |
|---|---|---|---|
| **Login** | [`login.html`](pages/login.html) | All | Secure authentication, credential verification, and permission-aware homepage redirect. |
| **Dashboard** | [`dashboard.html`](pages/dashboard.html) | Admin | Key performance indicators (Total Varieties, Inventory Value, 7-Day Sales, Low Stock, Old Stock Alerts), 7-day sales trend bar chart, and **centered, sizable variety sales donut chart**. |
| **Point of Sale** | [`pos.html`](pages/pos.html) | Admin, Cashier | Multi-packaging selector (`50Kg Whole`, `25Kg Half`, `20Kg`, `10Kg`, `5Kg`, `Tinatakal`), live stock limits, change computation, official sales receipt generator. |
| **View Inventory** | [`view-inventory.html`](pages/view-inventory.html) | Admin, Cashier | Live variety summary, pre-packed bag counts, total volume in Kg, single-line status badges, dynamic FIFO batch lot drill-downs, and direct row-level sack opening. |
| **Manage Inventory** | [`inventory.html`](pages/inventory.html) | Admin | Streamlined per-variety inventory management: contextual row buttons for restocking, sack openings into loose inventory, physical inventory correction, and spoilage logging. |
| **Products & Pricing** | [`products.html`](pages/products.html) | Admin | Add/Edit rice varieties, origin (`Local` / `Imported`), wholesale sack price, retail per-Kg rate, pre-packed bag pricing, low-stock threshold. Includes **top-navbar `+ Add New Rice Variety` action**. |
| **Transaction History** | [`transactions.html`](pages/transactions.html) | Admin, Cashier | Searchable log of past sales with breakdown modal and printable receipt format. |
| **Sales Report** | [`sales-report.html`](pages/sales-report.html) | Admin, Cashier | Multi-period reporting (**Daily**, **Weekly**, **Monthly**, **Quarterly**, **Yearly**, Custom), variety breakdown, with **top-navbar `Export CSV` and `Print Sales Report` actions**. |
| **File Management** | [`file-manager.html`](pages/file-manager.html) | Admin, Cashier | Store document repository with **top-navbar `One-Click Database Backup` and `Upload New Document` actions**. |
| **Audit History** | [`audit.html`](pages/audit.html) | Admin | Audit trail tracking warehouse adjustments, restocks, sack openings, and user actions with **top-navbar `Export CSV` and `Refresh Log` actions**. |
| **User Management** | [`users.html`](pages/users.html) | Admin | Account creation, password hashing, role presets (`Admin`, `Cashier`, `Store Manager`, `Inventory Clerk`), and granular module permissions matrix. |

---

## UI Architecture & Navigation Design

The frontend user interface features an optimized, distraction-free workflow with standardized layout alignment and intuitive contextual actions:

### 1. Unified Top Navigation Header (`top-nav`)
- **Synchronized Header Height**: Standardized across the application (`min-height: 81px`, padding `24px 28px 16px`) to ensure pixel-perfect border line continuity with the sidebar brand header across all screens.
- **Dynamic Header Action Center (`#headerActions`)**: Contextual primary and secondary actions are seamlessly injected into the top-right corner of the persistent navigation bar via [`js/auth.js`](js/auth.js):
  - **Products & Pricing**: `+ Add New Rice Variety`
  - **Sales Report**: `Export CSV` and `Print Sales Report`
  - **File Management**: `One-Click Database Backup` and `Upload New Document`
  - **Audit History**: `Export CSV` and `Refresh Log`
- **Clear Information Hierarchy**: The left side retains dynamic page titles and descriptive subtitles, keeping main views clean and uncluttered.

### 2. Relocated Sidebar User Profile & Session Controls
- **Dedicated Profile Card (`sidebar-user-card`)**: The user profile widget (User Full Name, Role Description, and `Logout` button) is situated in the lower section of the persistent sidebar directly above the copyright footer.
- **Uncluttered Top Bar**: Moving account management to the sidebar footer maximizes horizontal space on the top navbar for page-specific operations and navigation breadcrumbs.

### 3. Contextual Row-Level Inventory Actions
- **Elimination of Ambiguous Top Buttons**: Redundant top-level action buttons ("Open a Sack", "Restock", "Adjust / Repack") were removed from [`pages/inventory.html`](pages/inventory.html) and [`pages/view-inventory.html`](pages/view-inventory.html).
- **Direct Row Triggers**: Operators trigger sack openings, restocks, and repack adjustments directly on the specific rice variety's table row, ensuring every warehouse action is accurately bound to the targeted product without risk of mistaken product selection.

### 4. Modern Centered Dashboard Analytics Chart
- **Centered Layout**: The **Product Categories / Variety Sales** donut chart is centered horizontally and vertically inside its card container (`gap: 36px`), resolving previous left-aligned imbalances.
- **Sizable & Responsive SVG**: Built with a 1:1 aspect ratio (`viewBox="0 0 220 220"`, outer radius `98`, outer diameter `~196px`), utilizing the full vertical height of the 240px card.
- **Crisp Visuals & Legend**: Styled with `#ffffff` slice border dividers, interactive hover scaling (`.pie-chart-slice`), and an adjacent vertically scrollable percentage legend.

---

## User Management & Granular Permissions System

The system includes a flexible Role-Based Access Control (RBAC) and **Granular Feature Permissions Matrix** managed via [`pages/users.html`](pages/users.html) and [`api/users.php`](api/users.php):

### 1. Modular Permission Tokens
Administrators can check or uncheck 10 independent module permissions for each user:
- `dashboard` — Executive sales KPIs, gross revenue, and summary charts.
- `pos` — Point of Sale terminal and checkout register.
- `view-inventory` — Stock inspection, sack counts, and FIFO batch inspection.
- `inventory` — Warehouse stock restocking, sack opening conversion, physical corrections, and damage logging.
- `products` — Rice varieties catalog, unit prices, and packaging rates.
- `transactions` — Customer order logs and printable receipt viewing.
- `sales-report` — Daily, Weekly, Monthly, Quarterly, and Yearly sales reports.
- `file-manager` — Store receipts repository and filtered CSV downloads.
- `audit` — Warehouse adjustment logs and audit trails.
- `users` — Administrator user management and permission configuration.

### 2. Role Presets
- **Administrator (Full Access)**: Grants all 10 module permissions.
- **Cashier**: Defaults to Point of Sale, View Inventory, Transactions, and Sales Report.
- **Inventory Clerk**: Defaults to View Inventory, Manage Inventory, and Products & Pricing.
- **Store Manager**: Defaults to Dashboard, POS, View Inventory, Products, Transactions, Sales Report, Files, and Audit.
- **Custom Staff**: Allows administrators to check any customized combination of module permissions.

### 3. Route Guard & Dynamic Layout
- **Dynamic Sidebar Navigation**: The sidebar ([`js/auth.js`](js/auth.js)) only displays modules that the logged-in user is granted access to.
- **Strict Route Enforcement**: If a user attempts to directly access an unauthorized URL (e.g. entering `users.html` or `inventory.html` manually), the client-side route guard intercepts the request, displays a warning toast, and redirects the user to their authorized home screen.
- **Account Status**: Accounts can be toggled between `Active` and `Inactive` to instantly revoke access without breaking foreign keys.
- **Data Protection Guard**: Accounts with recorded sales transactions cannot be deleted, preserving audit and historical accounting records.

---

## Sales Analytics & Multi-Period Reporting

The Sales Report module ([`pages/sales-report.html`](pages/sales-report.html)) provides dedicated multi-period reporting:

1. **Daily Report**:
   - Filter by a target date (`input type="date"`), with a quick **"Today"** shortcut.
   - Generates the `OFFICIAL DAILY SALES REPORT` statement.
2. **Weekly Report**:
   - Select by calendar week (`input type="week"`), with a **"This Week"** shortcut.
   - Automatically computes and displays the exact Monday-to-Sunday date range (e.g., `Oct 12, 2026 – Oct 18, 2026`).
   - Generates the `OFFICIAL WEEKLY SALES REPORT` statement.
3. **Monthly Report**:
   - Select by target month (`input type="month"`), with a **"Prev Mo."** shortcut (September 2026).
   - Generates the `OFFICIAL MONTHLY SALES REPORT` statement.
4. **Quarterly Report**:
   - Select by Quarter (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec) and Year.
   - Generates the `OFFICIAL QUARTERLY SALES REPORT` statement.
5. **Yearly Report**:
   - Select by calendar Year (e.g., 2026).
   - Generates the `OFFICIAL YEARLY SALES REPORT` statement.
6. **Custom Range & All Time**:
   - Select custom Start Date and End Date or view all-time recorded history.
7. **Official Print Statement**:
   - Formatted printable sheet designed for official store audits and management sign-offs.
8. **Period-Filtered CSV Export**:
   - Exports line-item transaction CSVs filtered by the currently active report type and period.

---

## Recent Updates & Performance Enhancements

### 1. Full 1-Year Operational Store Dataset
The database now contains **365 days of continuous operations** (spanning **October 14, 2025 to October 21, 2026**):
- **3,727 Completed Sales Transactions**: Totals **₱3,409,087.00** in gross store revenue across all 12 operational months.
- **4,806 Itemized Order Lines**: Reflects realistic retail basket compositions across all package tiers (`50Kg Whole Sack`, `25Kg Half`, `20Kg`, `10Kg`, `5Kg`, and per-Kg `Tinatakal` loose sales).
- **Realistic Sales Seasonality**: Incorporates holiday surges (December peak with 400 transactions & ₱362,710.50 revenue), weekend volume increases (Saturdays & Sundays), and mid-month / month-end payday spikes.
- **12 Authentic Philippine Rice Varieties**: All active with realistic wholesale sack and retail per-kg pricing, calibrated reorder thresholds, and active warehouse lots:
  1. *Sinandomeng Special* (Premium White, Local)
  2. *Dinorado Fancy Special* (Aromatic, Local)
  3. *Jasmine Fragrant Premium* (Fragrant Import, Imported)
  4. *Angelika White Rice* (Regular Milled, Local)
  5. *Malagkit Glutinous Rice* (Specialty Rice, Local)
  6. *IR-64 Well-Milled Rice* (Standard Local, Local)
  7. *Milagrosa Super Fragrant* (Aromatic, Local)
  8. *Coco Pandan Premium Aromatic* (Fragrant Import, Imported)
  9. *Brown Rice Organic Whole Grain* (Healthy Specialty, Local)
  10. *Japanese Calrose Rice* (Specialty Rice, Imported)
  11. *Maharlika Premium Long Grain* (Premium White, Local)
  12. *Super Angelica Supreme* (Premium White, Local)
- **156 Inventory Delivery Batches**: 132 completed and archived historical batches alongside 24 active in-stock lots totaling **215 whole sacks** and **501 loose Kg**, perfectly synchronized with the live inventory balances.
- **304 Warehouse Audit & Adjustment Logs**: Detailed logs covering regular mill deliveries (from Central Luzon, Isabela, and Mindoro suppliers), retail sack openings, repacking into smaller consumer bags, and routine inventory count reconciliations.
- **Registered Management & Backup Records**: Live SQL snapshots and annual financial audit PDF references populated in the File Manager.

### 2. Transactions API Query Optimization (`api/get_transactions.php`)
- **Elimination of N+1 Query Loop**: Previously, fetching transactions executed an individual `SELECT` query for items per transaction (causing over 3,700 queries on a 1-year dataset).
- **Batched Single-Query Item Indexing**: Refactored to fetch all items in a single indexed query joined with the product catalog and mapped in memory.
- **Performance Benchmark**: Reduced API response time from **1,165ms down to ~100ms** (~11x speedup), delivering instantaneous load times on the Transactions and Dashboard pages.

### 3. Seamless Database Setup & Router (`database/init_db.php`)
- Integrated multi-statement SQL execution directly importing [`database/roberice_db.sql`](database/roberice_db.sql) if tables are uninitialized or when performing a clean wipe via `?fresh=1`.
- Skips re-execution and routes immediately to the login page when the database is already primed.

---

## ⚙️ Installation & Setup (XAMPP)

1. **Clone or Copy Repository**:
   Place the project folder into your XAMPP web root directory:
   ```bash
   c:\xampp\htdocs\Roberice.SAD\
   ```
2. **Start Apache & MySQL**:
   Open **XAMPP Control Panel** and click **Start** on both **Apache** and **MySQL**.

3. **Initialize Database (Choose Either Option)**:

   ### Option A: Automatic Web Setup (Fastest — Recommended)
   Simply open your browser and navigate to:
   ```
   http://localhost/Roberice.SAD/database/init_db.php
   ```
   *(Or replace `Roberice.SAD` with your local folder name if different).*
   This web script will automatically:
   - Create the `roberice_db` database
   - Build all 8 tables (`users`, `product`, `inventory`, `inventory_batch`, `inventory_adjustment`, `sales_transaction`, `transaction_item`, `file_records`)
   - Seed default admin & cashier accounts
   - Automatically redirect and load the login page immediately upon completion!

   ### Option B: Manual phpMyAdmin Import
   - Navigate to [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
   - Create a database named `roberice_db` (Collation: `utf8mb4_general_ci`).
   - Click **Import** and choose [`database/roberice_db.sql`](database/roberice_db.sql).

4. **Access Application**:
   Open your browser and visit:
   ```
   http://localhost/Roberice.SAD/
   ```

### Default Credentials
- **Admin**: Username `admin` | Password `admin123` (Full system access)
- **Cashier**: Username `cashier1` | Password `cashier123` (POS & inventory lookup)

---

## 🏢 Business Information
- **Business Name**: Roberice
- **Address**: 73 Farmers St. Corner Ampalaya, Marikina 1800
- **Line of Business**: Wholesale & Retail Rice Merchandising
