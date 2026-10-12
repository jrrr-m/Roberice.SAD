# Roberice POS & Inventory Management System

A web-based Point of Sale (POS) and Inventory Management System customized for **Roberice**, a wholesale and retail rice merchandising business located in Marikina, Philippines.

---

## 🗂️ Project Structure & GitHub File Navigation

Below is the directory map of repository files, frontend controllers, and backend API endpoints:

```
Roberice.SAD/
├── index.html                  # Root entry point: session check & automated role/permission redirect
├── 📁 pages/                   # User Interface Pages
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
├── 📁 js/                      # Frontend Logic & Dynamic Controllers
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
├── 📁 api/                     # Backend PHP Endpoints (PDO MySQL)
│   ├── db.php                  # Database connection configuration (roberice_db)
│   ├── login.php               # Login authentication verification & permissions loading
│   ├── users.php               # User account CRUD, password hashing & permissions matrix
│   ├── process_sale.php        # Transaction checkout & inventory deduction logic
│   ├── get_products.php        # Fetch active products catalog
│   ├── get_inventory.php       # Real-time aggregated inventory & active batch lots
│   ├── adjust_stock.php        # Restocking, open sack conversion, damage & correction
│   ├── add_product.php         # Create new rice variety
│   ├── update_product.php      # Edit rice variety details & prices
│   ├── delete_product.php      # Deactivate or remove product
│   ├── get_transactions.php    # Retrieve past sales orders
│   ├── get_sales_report.php    # Multi-period sales metrics & variety volume aggregation
│   ├── get_audit_logs.php      # Retrieve audit history entries
│   └── file_manager.php        # Upload, delete, and list store documents & filtered CSV exports
│
├── 📁 css/
│   └── styles.css              # Unified responsive design system & component styles
│
├── 📁 database/
│   └── roberice_db.sql         # Database schema dump and initial seed data
│
├── 📁 assets/                  # Brand icons and logos
├── 📁 uploads/                 # Uploaded files and receipts
└── DATABASE_SETUP_GUIDE.txt    # Setup notes
```

---

## 📑 Page Directory & Feature Breakdown

| Page | File | Default Roles | Core Features |
|---|---|---|---|
| **Login** | [`login.html`](pages/login.html) | All | Secure authentication, credential verification, and permission-aware homepage redirect. |
| **Dashboard** | [`dashboard.html`](pages/dashboard.html) | Admin | Key performance indicators (Total Varieties, Inventory Value, 7-Day Sales, Low Stock, Old Stock Alerts). |
| **Point of Sale** | [`pos.html`](pages/pos.html) | Admin, Cashier | Multi-packaging selector (`50Kg Whole`, `25Kg Half`, `20Kg`, `10Kg`, `5Kg`, `Tinatakal`), live stock limits, change computation, official sales receipt generator. |
| **View Inventory** | [`view-inventory.html`](pages/view-inventory.html) | Admin, Cashier | Live variety summary, pre-packed bag counts, total volume in Kg, single-line status badges, dynamic FIFO batch lot drill-downs. |
| **Manage Inventory** | [`inventory.html`](pages/inventory.html) | Admin | Restocking with batch codes, sack openings into loose inventory, physical inventory correction, spoilage logging. |
| **Products & Pricing** | [`products.html`](pages/products.html) | Admin | Add/Edit rice varieties, origin (`Local` / `Imported`), wholesale sack price, retail per-Kg rate, pre-packed bag pricing, low-stock threshold. |
| **Transaction History** | [`transactions.html`](pages/transactions.html) | Admin, Cashier | Searchable log of past sales with breakdown modal and printable receipt format. |
| **Sales Report** | [`sales-report.html`](pages/sales-report.html) | Admin, Cashier | Multi-period reporting (**Daily**, **Weekly**, **Monthly**, **Quarterly**, **Yearly**, Custom), variety breakdown, CSV export, print-ready official statement. |
| **File Management** | [`file-manager.html`](pages/file-manager.html) | Admin, Cashier | Upload invoices, delivery receipts, supplier documents, and store records. |
| **Audit History** | [`audit.html`](pages/audit.html) | Admin | Audit trail tracking warehouse adjustments, restocks, sack openings, batch completions, and user actions. |
| **User Management** | [`users.html`](pages/users.html) | Admin | Account creation, password hashing, role presets (`Admin`, `Cashier`, `Store Manager`, `Inventory Clerk`), and granular module permissions matrix. |

---

## 🔐 User Management & Granular Permissions System

The system includes a flexible Role-Based Access Control (RBAC) and **Granular Feature Permissions Matrix** managed via [`pages/users.html`](pages/users.html) and [`api/users.php`](api/users.php):

### 1. Modular Permission Tokens
Administrators can check or uncheck 10 independent module permissions for each user:
- 📊 `dashboard` — Executive sales KPIs, gross revenue, and summary charts.
- 🛒 `pos` — Point of Sale terminal and checkout register.
- 📦 `view-inventory` — Stock inspection, sack counts, and FIFO batch inspection.
- 🏷️ `inventory` — Warehouse stock restocking, sack opening conversion, physical corrections, and damage logging.
- 🌾 `products` — Rice varieties catalog, unit prices, and packaging rates.
- 🧾 `transactions` — Customer order logs and printable receipt viewing.
- 📈 `sales-report` — Daily, Weekly, Monthly, Quarterly, and Yearly sales reports.
- 📁 `file-manager` — Store receipts repository and filtered CSV downloads.
- 📋 `audit` — Warehouse adjustment logs and audit trails.
- 👥 `users` — Administrator user management and permission configuration.

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

## 📊 Sales Analytics & Multi-Period Reporting

The Sales Report module ([`pages/sales-report.html`](pages/sales-report.html)) provides dedicated multi-period reporting:

1. **📅 Daily Report**:
   - Filter by a target date (`input type="date"`), with a quick **"Today"** shortcut.
   - Generates the `OFFICIAL DAILY SALES REPORT` statement.
2. **📆 Weekly Report**:
   - Select by calendar week (`input type="week"`), with a **"This Week"** shortcut.
   - Automatically computes and displays the exact Monday-to-Sunday date range (e.g., `Oct 12, 2026 – Oct 18, 2026`).
   - Generates the `OFFICIAL WEEKLY SALES REPORT` statement.
3. **🗓️ Monthly Report**:
   - Select by target month (`input type="month"`), with a **"Demo Mo."** shortcut (September 2026).
   - Generates the `OFFICIAL MONTHLY SALES REPORT` statement.
4. **📊 Quarterly Report**:
   - Select by Quarter (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec) and Year.
   - Generates the `OFFICIAL QUARTERLY SALES REPORT` statement.
5. **📈 Yearly Report**:
   - Select by calendar Year (e.g., 2026).
   - Generates the `OFFICIAL YEARLY SALES REPORT` statement.
6. **🔍 Custom Range & All Time**:
   - Select custom Start Date and End Date or view all-time recorded history.
7. **Official Print Statement**:
   - Formatted printable sheet designed for official store audits and management sign-offs.
8. **Period-Filtered CSV Export**:
   - Exports line-item transaction CSVs filtered by the currently active report type and period.

---

## ⚙️ Installation & Setup (XAMPP)

1. **Clone or Copy Repository**:
   Place the project folder into your XAMPP web root directory:
   ```bash
   c:\xampp\htdocs\Roberice.SAD\
   ```
2. **Start Apache & MySQL**:
   Open **XAMPP Control Panel** and start both **Apache** and **MySQL**.
3. **Import Database**:
   - Navigate to [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
   - Create a database named `roberice_db` (Collation: `utf8mb4_general_ci`).
   - Click **Import** and choose [`database/roberice_db.sql`](database/roberice_db.sql).
4. **Access Application**:
   Open your browser and visit:
   ```
   http://localhost/Roberice.SAD/
   ```

### Default Credentials
- **Admin**: Username `admin` | Password `admin123`
- **Cashier**: Username `cashier1` | Password `cashier123`

---

## 🏢 Business Information
- **Business Name**: Roberice
- **Address**: 73 Farmers St. Corner Ampalaya, Marikina 1800
- **Line of Business**: Wholesale & Retail Rice Merchandising
