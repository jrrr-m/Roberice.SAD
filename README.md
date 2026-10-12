# Roberice POS & Inventory Management System

A web-based Point of Sale (POS) and Inventory Management System customized for **Roberice**, a rice retailing and wholesaling business located in Marikina, Philippines.

---

## 🗂️ Project Structure & GitHub File Navigation

Below is a map of the repository files, their roles, and linked scripts:

```
Roberice.SAD/
├── 📄 HTML Pages (User Interface)
│   ├── index.html              # Entry point: redirects based on login session & role
│   ├── login.html              # User authentication (Admin / Cashier)
│   ├── dashboard.html          # Executive store dashboard & sales analytics
│   ├── pos.html                # Point of Sale terminal with packaging & stock limits
│   ├── view-inventory.html     # Dynamic stock table with FIFO batch drill-downs
│   ├── inventory.html          # Stock management (Restock, repacking, physical count)
│   ├── products.html           # Rice varieties catalog & pricing configuration
│   ├── transactions.html       # Historical customer receipts & transaction log
│   ├── sales-report.html       # Analytics, variety breakdown & print-ready statements
│   ├── file-manager.html       # Document & invoice management repository
│   └── audit.html              # System audit trail (adjustments, sack openings, depletions)
│
├── 📁 js/                      # Frontend Logic & Dynamic Rendering
│   ├── auth.js                 # Authentication, role permissions & dynamic top/side navigation
│   ├── pos.js                  # POS cart, multi-packaging calculation, stock limit validation
│   ├── view-inventory.js       # Inventory table, batch drawer accordion, live depletion
│   ├── inventory.js            # Stock adjustments, sack opening modal, restocking
│   ├── dashboard.js            # KPI metrics, revenue cards, and overview summaries
│   ├── sales-report.js         # CSV export, date range filtering, print layout
│   ├── products.js             # Product catalog CRUD modal handling
│   ├── transactions.js         # Receipt viewing, transaction filtering
│   ├── file-manager.js         # Document upload, categorization, preview, download
│   ├── audit.js                # Chronological audit log rendering & filtering
│   ├── charts.js               # Canvas/SVG chart drawing routines
│   ├── utils.js                # Currency, dates, toasts, modal controllers, FIFO helpers
│   └── data.js                 # Shared lookup tokens & fallback test data
│
├── 📁 api/                     # Backend PHP Endpoints (PDO MySQL)
│   ├── db.php                  # Database connection configuration (roberice_db)
│   ├── login.php               # Login authentication verification
│   ├── process_sale.php        # Transaction checkout & inventory deduction logic
│   ├── get_products.php        # Fetch active products catalog
│   ├── get_inventory.php       # Real-time aggregated inventory & active batch lots
│   ├── adjust_stock.php        # Restocking, open sack conversion, damage & correction
│   ├── add_product.php         # Create new rice variety
│   ├── update_product.php      # Edit rice variety details & prices
│   ├── delete_product.php      # Deactivate or remove product
│   ├── get_transactions.php    # Retrieve past sales orders
│   ├── get_sales_report.php    # Aggregate sales metrics & variety volume
│   ├── get_audit_logs.php      # Retrieve audit history entries
│   └── file_manager.php        # Upload, delete, and list store documents
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

| Page | File | Roles | Core Features |
|---|---|---|---|
| **Login** | [`login.html`](login.html) | All | Role-based authentication (`admin` / `cashier`). |
| **Dashboard** | [`dashboard.html`](dashboard.html) | Admin | Key performance indicators (Total Varieties, Inventory Value, 7-Day Sales, Low Stock, Old Stock Alerts). |
| **Point of Sale** | [`pos.html`](pos.html) | Admin, Cashier | Modal packaging selector (`50Kg Whole`, `25Kg Half`, `20Kg`, `10Kg`, `5Kg`, `Tinatakal`), strict stock capping, automatic change computation, official sales receipt generator. |
| **View Inventory** | [`view-inventory.html`](view-inventory.html) | Admin, Cashier | Live variety summary, pre-packed bag counts, total volume in Kg, single-line status badges, dynamic FIFO batch lot drill-down. |
| **Manage Inventory** | [`inventory.html`](inventory.html) | Admin | Stock restocking with batch codes, open sack into loose inventory, physical inventory correction, spoilage logging. |
| **Products & Pricing** | [`products.html`](products.html) | Admin | Add/Edit rice varieties, origin (`Local` / `Imported`), wholesale sack price, retail per-Kg rate, pre-packed bag pricing, low-stock threshold. |
| **Transaction History** | [`transactions.html`](transactions.html) | Admin, Cashier | Searchable log of past sales with breakdown modal and printable receipt format. |
| **Sales Report** | [`sales-report.html`](sales-report.html) | Admin, Cashier | Date filtering (today, 7 days, 30 days, custom), variety volume & revenue breakdown, CSV export, print-ready formal report statement. |
| **File Management** | [`file-manager.html`](file-manager.html) | Admin, Cashier | Upload invoices, delivery receipts, supplier documents, and store records. |
| **Audit History** | [`audit.html`](audit.html) | Admin | Audit trail tracking warehouse adjustments, restocks, sack openings, batch completions, and user actions. |

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
   - Create a new database named `roberice_db` (Collation: `utf8mb4_general_ci`).
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
- **Line of Business**: Rice Wholesaler & Retailer
