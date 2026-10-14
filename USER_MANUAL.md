# 🌾 ROBERICE POS & INVENTORY MANAGEMENT SYSTEM
## Comprehensive User's Manual (Administrator & Cashier Guide)

**Business Name:** Roberice  
**Location:** 73 Farmers St. Corner Ampalaya, Marikina, Philippines  
**System Type:** Web-Based Point of Sale (POS) and Multi-Packaging Inventory Management System  
**Document Version:** 1.0 (2026 Edition)  

---

## 📌 Document Overview & Instructions for Screenshots

This User’s Manual provides complete, step-by-step operating procedures for both **Cashier** and **Administrator** staff. 

> [!TIP]
> **To the User / Document Owner:**
> Wherever you see a **📸 SCREENSHOT PLACEHOLDER** box throughout this manual, capture a screenshot of that specific screen from your system, save it with the recommended file name in an `images/` or `manual_assets/` folder, and replace the placeholder text with your markdown image tag:
> ```markdown
> ![Descriptive Caption](images/your_image_name.png)
> ```

---

# 📑 TABLE OF CONTENTS

1. [System Access & Technical Prerequisites](#-system-access--technical-prerequisites)
2. [PART 1: CASHIER USER'S MANUAL](#-part-1-cashier-users-manual)
   - [1.1 Logging In to the Cashier Terminal](#11-logging-in-to-the-cashier-terminal)
   - [1.2 POS Interface Walkthrough](#12-pos-interface-walkthrough)
   - [1.3 Step-by-Step: Processing a Customer Sale](#13-step-by-step-processing-a-customer-sale)
     - [A. Selling Standard Whole Sacks (50kg) & Half Sacks (25kg)](#a-selling-standard-whole-sacks-50kg--half-sacks-25kg)
     - [B. Selling Pre-Packed Bags (20kg, 10kg, 5kg)](#b-selling-pre-packed-bags-20kg-10kg-5kg)
     - [C. Selling Custom Weight Loose Rice (Tinatakal per Kg)](#c-selling-custom-weight-loose-rice-tinatakal-per-kg)
     - [D. Automatic Sack Opening during POS Checkout](#d-automatic-sack-opening-during-pos-checkout)
   - [1.4 Completing Checkout & Payment Processing](#14-completing-checkout--payment-processing)
   - [1.5 Printing & Issuing the Customer Receipt](#15-printing--issuing-the-customer-receipt)
   - [1.6 Manual Sack Opening at Cashier Counter](#16-manual-sack-opening-at-cashier-counter)
   - [1.7 Checking Real-Time Stock (View Inventory)](#17-checking-real-time-stock-view-inventory)
   - [1.8 Viewing Past Transactions & Receipt Reprinting](#18-viewing-past-transactions--receipt-reprinting)
   - [1.9 Shift Balancing & End-of-Day Sales Report](#19-shift-balancing--end-of-day-sales-report)
   - [1.10 Secure Logout Procedure](#110-secure-logout-procedure)
3. [PART 2: ADMINISTRATOR USER'S MANUAL](#-part-2-administrator-users-manual)
   - [2.1 Administrator Login & Access Control](#21-administrator-login--access-control)
   - [2.2 Executive Dashboard & Store Analytics](#22-executive-dashboard--store-analytics)
   - [2.3 Product Catalog & Pricing Management](#23-product-catalog--pricing-management)
     - [A. Adding a New Rice Variety](#a-adding-a-new-rice-variety)
     - [B. Updating Prices & Low-Stock Alert Limits](#b-updating-prices--low-stock-alert-limits)
   - [2.4 Warehouse & Inventory Management](#24-warehouse--inventory-management)
     - [A. Restocking New Rice Shipments & Lot Registration](#a-restocking-new-rice-shipments--lot-registration)
     - [B. Converting Sacks into Loose Inventory](#b-converting-sacks-into-loose-inventory)
     - [C. Performing Physical Inventory Corrections](#c-performing-physical-inventory-corrections)
     - [D. Recording Damaged, Spoilage, or Infested Rice](#d-recording-damaged-spoilage-or-infested-rice)
     - [E. Managing Aging Stock (>60 Days FIFO Compliance)](#e-managing-aging-stock-60-days-fifo-compliance)
   - [2.5 Sales Reports & Financial Audit Statements](#25-sales-reports--financial-audit-statements)
     - [A. Generating Multi-Period Reports (Daily, Weekly, Monthly, Quarterly, Yearly)](#a-generating-multi-period-reports)
     - [B. Exporting Filtered CSV Reports](#b-exporting-filtered-csv-reports)
     - [C. Printing Official Store Audit Statements](#c-printing-official-store-audit-statements)
   - [2.6 Store Documents & One-Click Database Backups](#26-store-documents--one-click-database-backups)
     - [A. Triggering a One-Click Live Database Backup](#a-triggering-a-one-click-live-database-backup)
     - [B. Uploading & Archiving Store Documents](#b-uploading--archiving-store-documents)
   - [2.7 Warehouse Audit Trail & Compliance Log](#27-warehouse-audit-trail--compliance-log)
   - [2.8 User Management & Granular Permissions Matrix](#28-user-management--granular-permissions-matrix)
     - [A. Creating New User Accounts & Roles](#a-creating-new-user-accounts--roles)
     - [B. Configuring Granular Module Permissions](#b-configuring-granular-module-permissions)
     - [C. Password Reset & Account Deactivation](#c-password-reset--account-deactivation)
4. [System Troubleshooting & FAQ](#-system-troubleshooting--faq)

---

# 💻 System Access & Technical Prerequisites

### Hardware Requirements
- **Cashier Terminal:** Desktop PC, Laptop, or POS tablet running Google Chrome, Microsoft Edge, or Mozilla Firefox.
- **Receipt Printer:** 58mm or 80mm ESC/POS thermal receipt printer (or standard desktop printer).
- **Network:** Local Area Network (LAN) connected to the local XAMPP host, or standalone local server.

### Starting the System
1. Open the **XAMPP Control Panel**.
2. Click **Start** for both **Apache** and **MySQL**.
3. Open a web browser and navigate to the application URL:
   ```
   http://localhost/Roberice.SAD/
   ```

### Default Credentials (Initial Setup)
| Role | Username | Default Password | Initial Permissions |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full access across all 10 system modules |
| **Cashier** | `cashier1` | `cashier123` | POS Terminal, View Inventory, Transactions, Sales Report |

---

# 🛒 PART 1: CASHIER USER'S MANUAL

---

## 1.1 Logging In to the Cashier Terminal

1. Launch your web browser and open `http://localhost/Roberice.SAD/`.
2. The **Roberice Sign-In Screen** will appear.
3. Enter your assigned **Username** (e.g., `cashier1`).
4. Enter your confidential **Password** (e.g., `cashier123`).
5. Click the green **Sign In** button.
6. The system will verify your credentials and automatically open your default landing page (**Point of Sale** terminal).

> 📸 **SCREENSHOT PLACEHOLDER #01: Login Screen**  
> * **Recommended File:** `manual_cashier_01_login.png`  
> * **Instructions:** Capture the clean sign-in window showing the Roberice logo, Username field, Password field, and Sign In button.

---

## 1.2 POS Interface Walkthrough

Once signed in as Cashier, you will see a two-column workspace:

> 📸 **SCREENSHOT PLACEHOLDER #02: Point of Sale Main Screen**  
> * **Recommended File:** `manual_cashier_02_pos_layout.png`  
> * **Instructions:** Capture the full POS screen showing the left product grid, the top search & filter controls, and the right-hand Current Order cart panel.

### Interface Components:
- **Top Search Box:** Real-time search by rice variety name, origin (Local/Imported), or grain type.
- **Origin Filter:** Quick dropdown to switch between **All Origins**, **Local**, or **Imported**.
- **Rice Type Filter:** Categorical dropdown (e.g., Sinandomeng, Dinorado, Jasmine, Well Milled).
- **Open Sack Button:** Green quick-action button on the top-right of the products panel to manually open unopened sacks into loose inventory.
- **Product Cards Grid:** Displays each rice variety with origin tag, unit prices, available sack counts, and remaining loose kilograms.
- **Current Order (Cart Panel):** Located on the right side. Lists customer order line items, quantity modifiers, subtotal, payment selection, amount received input, change calculation, and checkout button.

---

## 1.3 Step-by-Step: Processing a Customer Sale

### A. Selling Standard Whole Sacks (50kg) & Half Sacks (25kg)

1. On the product catalog grid, locate the requested rice variety (or use the search box).
2. Click on the product card to launch the **Product Packaging & Quantity Selection Modal**.

> 📸 **SCREENSHOT PLACEHOLDER #03: Packaging & Quantity Modal**  
> * **Recommended File:** `manual_cashier_03_packaging_modal.png`  
> * **Instructions:** Capture the modal dialog showing the packaging options grid (50kg Whole Sack, 25kg Half Sack, Pre-packs, and Tinatakal), batch selector, and quantity stepper.

3. In the **Rice Batch / Lot (FIFO Selection)** dropdown, the system automatically selects the oldest active batch to ensure First-In, First-Out stock rotation. Keep this default unless instructed otherwise.
4. Click on the **Whole Sack (50kg)** or **Half Sack (25kg)** card option.
5. In the **Quantity Stepper** below, use the **`+`** or **`-`** buttons (or type directly) to set the number of sacks ordered.
6. Check the **Item Total** preview at the bottom of the modal.
7. Click **Add to Order**. The modal will close, and the item will appear in your **Current Order** cart on the right.

---

### B. Selling Pre-Packed Bags (20kg, 10kg, 5kg)

1. Click on the target rice variety card.
2. Inside the packaging modal, select the desired pre-pack size:
   - **20kg Bag**
   - **10kg Bag**
   - **5kg Bag**
3. The system checks the current warehouse stock for that specific bag size.
4. Set the quantity needed.
5. Click **Add to Order**.

---

### C. Selling Custom Weight Loose Rice (Tinatakal per Kg)

For retail customers purchasing loose rice by specific kilogram amounts (e.g., 1 kg, 2.5 kg, 7 kg):

1. Click on the rice variety card in the POS grid.
2. Select the **Tinatakal / Loose Rice (Per Kg)** option tile.
3. The **Custom Kilos Configuration Section** will expand automatically.

> 📸 **SCREENSHOT PLACEHOLDER #04: Custom Kilos (Tinatakal) Selection**  
> * **Recommended File:** `manual_cashier_04_tinatakal_input.png`  
> * **Instructions:** Capture the packaging modal with the "Tinatakal" option active, showing the loose kg input box, quick kilo chips (+1kg, +2kg, +5kg), and the live Loose Stock Info badge.

4. Enter the exact weight in kilograms:
   - Type the exact weight (e.g., `3.5`) into the **KG** input box, OR
   - Click the **Quick Kilo Chips** (`+0.5 kg`, `+1 kg`, `+2 kg`, `+3 kg`, `+5 kg`, `+10 kg`) to increment the weight rapidly.
5. Review the calculated subtotal.
6. Click **Add to Order**.

---

### D. Automatic Sack Opening during POS Checkout

If a customer orders more loose rice than what is currently open in the display bin:
- The system will display an informative alert box:
  > *ℹ️ Requested kilos exceed current loose stock. Unopened sack(s) will automatically open upon completing sale.*
- You do **not** need to leave the POS screen. The system automatically opens the required unopened sack from the oldest FIFO batch upon checkout and shifts the remaining balance into your loose inventory seamlessly!

---

## 1.4 Completing Checkout & Payment Processing

Once all items have been added to the customer's cart:

1. **Review Cart Contents:**
   - Verify items, packaging types, and prices on the **Current Order** list.
   - To remove an item, click the red **trash bin** icon next to the item row.
   - To cancel the entire order, click the **Clear Cart** button at the top of the panel.

> 📸 **SCREENSHOT PLACEHOLDER #05: Cart Summary & Payment Inputs**  
> * **Recommended File:** `manual_cashier_05_cart_checkout.png`  
> * **Instructions:** Capture the right-side cart panel with active items, showing Subtotal, Total Amount, Payment Method dropdown, Amount Received input, and Change calculation.

2. **Select Payment Method:**
   - Click the **Payment Method** dropdown.
   - Choose: **Cash**, **GCash**, or **Bank Transfer**.

3. **Enter Amount Received:**
   - In the **Amount Received (₱)** field, type the cash tendered by the customer (e.g., `1000.00`).
   - The system instantly calculates and displays the exact **Change** in green text.
   - *Note: If the amount received is less than the total balance, the "Complete Sale" button remains disabled to prevent erroneous transactions.*

4. **Complete the Sale:**
   - Click the large green **Complete Sale** button.
   - The transaction will be saved to the database, inventory will be deducted in real-time, and the official receipt popup will appear.

---

## 1.5 Printing & Issuing the Customer Receipt

1. Upon successful checkout, the **Transaction Receipt Modal** opens automatically with the official store layout:
   - Store header: **ROBERICE** (Wholesale & Retail Rice Merchandising, Marikina)
   - Official Receipt Reference Number & Date/Time
   - Cashier Username
   - Itemized list with packaging description, quantity, and line totals
   - Subtotal, Amount Tendered, and Change Due
   - Thank you footer message

> 📸 **SCREENSHOT PLACEHOLDER #06: Official Printable Receipt Modal**  
> * **Recommended File:** `manual_cashier_06_receipt_modal.png`  
> * **Instructions:** Capture the thermal receipt preview modal showing the formatted store header, itemized breakdown, payment breakdown, and the "Print Receipt" button.

2. Click the blue **Print Receipt** button.
3. The system triggers the browser print dialog configured for standard POS thermal receipt printers (58mm/80mm).
4. Hand the printed receipt and change to the customer.
5. Click **Close** on the modal to return to an empty cart ready for the next customer.

---

## 1.6 Manual Sack Opening at Cashier Counter

If a display bin runs low on loose rice during the day and you wish to manually open an unopened sack:

1. On the POS screen header, click the green **Open Sack** button (or row-level action in View Inventory).
2. The **Open Sack into Loose Inventory Modal** appears.

> 📸 **SCREENSHOT PLACEHOLDER #07: Cashier Open Sack Modal**  
> * **Recommended File:** `manual_cashier_07_open_sack.png`  
> * **Instructions:** Capture the Open Sack modal showing the Rice Variety selector, FIFO Batch selector, Sack Size to Open dropdown, and the Inventory Sync Preview box.

3. Select the **Rice Variety**.
4. Select the **Rice Batch to Open (FIFO Lot)**.
5. Select the **Sack Size to Open** (e.g., 50kg Whole Sack, 25kg Half Sack, 20kg, 10kg, 5kg).
6. Enter the **Number of Sacks** to open (default is `1`).
7. Observe the **Inventory Sync Preview Box** (e.g., *Opening 1x 50kg sack will deduct 1 sack from whole sacks and add +50.00 kg into Loose inventory*).
8. (Optional) Enter a brief note (e.g., *Opened 1 sack for retail counter display*).
9. Click **Confirm & Open Sack**. The loose rice is immediately available for selling!

---

## 1.7 Checking Real-Time Stock (View Inventory)

Cashiers can inspect live stock levels at any time before confirming bulk orders with customers:

1. On the left sidebar navigation menu, click **View Inventory**.
2. The **View Available Inventory** screen displays:
   - Rice Variety & Grain Classification
   - Whole Sack Price & Per-Kg Loose Rate
   - Whole Sacks Left in Warehouse
   - Pre-Packed Bag counts (25kg, 20kg, 10kg, 5kg)
   - Loose / Tinatakal available in Kg
   - Total Volume in Equivalent Kilograms
   - Single-line Status Badges:
     - 🟢 **In Stock**
     - 🟡 **Low Stock** (below store threshold)
     - 🔴 **Out of Stock**

> 📸 **SCREENSHOT PLACEHOLDER #08: View Inventory Table & Filters**  
> * **Recommended File:** `manual_cashier_08_view_inventory.png`  
> * **Instructions:** Capture the View Inventory screen showing the search bar, category filters, and the inventory table with stock count columns and status badges.

3. Use the top **Search Box** or dropdown filters (**Origin**, **Rice Type**, **Stock Status**) to quickly answer customer stock inquiries.
4. Click on any row's **Batch Lots** button to see batch dates and received lot numbers.

---

## 1.8 Viewing Past Transactions & Receipt Reprinting

If a customer requests a duplicate receipt or if you need to verify an earlier order:

1. Click **Transaction History** in the sidebar.
2. The screen shows all past transactions chronologically.

> 📸 **SCREENSHOT PLACEHOLDER #09: Transaction History & Receipt Lookup**  
> * **Recommended File:** `manual_cashier_09_transactions.png`  
> * **Instructions:** Capture the Transaction History screen showing the Transactions Count, Total Revenue cards, the searchable table, and the action buttons.

3. Use the search bar to locate an order by **Transaction ID** (e.g., `TXN-20261014-0012`), item name, or date.
4. Click the **View Receipt** button on the row.
5. The receipt modal will open, allowing you to re-verify the sale or click **Print Receipt** to reprint.

---

## 1.9 Shift Balancing & End-of-Day Sales Report

At the end of your shift or business day, cashiers should reconcile their register drawer with recorded sales:

1. Click **Sales Report** in the sidebar.
2. Ensure the **Daily Report** tab is selected (or click the **Today** shortcut button).
3. The report will display:
   - **Gross Revenue (₱):** Total cash and digital payments collected.
   - **Transactions Completed:** Total number of customer orders.
   - **Total Rice Volume Sold (Kg):** Total kilograms dispensed.
   - **Variety Sales Breakdown:** Itemized sales volume per rice variety.

> 📸 **SCREENSHOT PLACEHOLDER #10: Cashier Daily Sales Summary & Print Preview**  
> * **Recommended File:** `manual_cashier_10_daily_report.png`  
> * **Instructions:** Capture the Sales Report page showing the Daily tab, the summary cards, and the top-right "Print Sales Report" action button.

4. Compare the **Cash Collected** summary with your physical cash in the drawer.
5. In the top navigation bar, click **Print Sales Report** to generate a clean, official closing report for store management sign-off.

---

## 1.10 Secure Logout Procedure

1. Before leaving the terminal, scroll down to the bottom of the left sidebar.
2. Locate your **User Profile Card** displaying your Name and Role.
3. Click the red **Logout** button.
4. The system will safely terminate your session and return to the login screen.

> 📸 **SCREENSHOT PLACEHOLDER #11: Sidebar User Card & Logout Button**  
> * **Recommended File:** `manual_cashier_11_logout.png`  
> * **Instructions:** Capture the lower section of the sidebar showing the user avatar, account name, role badge, and the red Logout button.

---

# 👑 PART 2: ADMINISTRATOR USER'S MANUAL

---

## 2.1 Administrator Login & Access Control

Administrators possess comprehensive oversight over financial analytics, inventory restocking, warehouse auditing, document backups, and user security permissions.

1. Open `http://localhost/Roberice.SAD/`.
2. Enter your **Admin Username** (default: `admin`) and **Password** (default: `admin123`).
3. Click **Sign In**.
4. The system loads the **Executive Dashboard**.

---

## 2.2 Executive Dashboard & Store Analytics

The **Dashboard** serves as the central operational cockpit for Roberice store management.

> 📸 **SCREENSHOT PLACEHOLDER #12: Executive Admin Dashboard Overview**  
> * **Recommended File:** `manual_admin_01_dashboard.png`  
> * **Instructions:** Capture the full Admin Dashboard showing the 5 top KPI cards, the 7-Day Sales Trend bar chart, the centered Variety Sales donut chart, and the Top Selling / Low Stock lists.

### Dashboard Key Elements:
1. **Top KPI Cards:**
   - **Total Varieties:** Total active rice products registered.
   - **Inventory Value:** Calculated wholesale valuation of all sacks, pre-packs, and loose inventory in stock.
   - **Sales (7 Days):** Total revenue and count of transactions in the past 7 days.
   - **Low Stock Items:** Real-time count of varieties that have fallen below their safety threshold.
   - **Old Stock Alert (>60 Days):** Warning count of batches remaining in the warehouse for more than 60 days, requiring priority sales push.

2. **Visual Charts:**
   - **Sales Trend Bar Chart (Last 7 Days):** Shows daily revenue performance and sales volume trajectory.
   - **Product Categories / Variety Sales Donut Chart:** Centered chart displaying proportional sales shares across different rice varieties.

3. **Operational Widgets:**
   - **Top Selling Products:** Quick ranking of the fastest-moving rice varieties.
   - **Low Stock & Reorder Alerts:** Direct list of rice products requiring immediate restocking.

---

## 2.3 Product Catalog & Pricing Management

Manage your product lines, sack prices, loose kilogram rates, and stock alert parameters via the **Products & Pricing** page (`products.html`).

> 📸 **SCREENSHOT PLACEHOLDER #13: Products & Pricing Catalog Table**  
> * **Recommended File:** `manual_admin_02_products_table.png`  
> * **Instructions:** Capture the Products & Pricing screen showing the table of rice varieties, pricing columns (Sack, Tinatakal, 5kg, 10kg, 20kg), and the top-right "+ Add New Rice Variety" button.

### A. Adding a New Rice Variety

1. In the top-right corner of the navigation bar, click the green **`+ Add New Rice Variety`** button.
2. The **Add New Rice Variety Modal** opens.

> 📸 **SCREENSHOT PLACEHOLDER #14: Add New Rice Variety Modal**  
> * **Recommended File:** `manual_admin_03_add_product_modal.png`  
> * **Instructions:** Capture the product modal displaying fields for Name, Origin, Rice Type, Category, multi-tier pricing, and Initial Stock Quantities.

3. **Fill in Product Details:**
   - **Rice Variety Name:** Enter the trade name (e.g., *Dinorado Special Mindoro*).
   - **Origin:** Select **Local (Philippine Rice)** or **Imported (Imported Grain)**.
   - **Specific Rice Type / Grain:** Enter grain type (e.g., *Dinorado*, *Sinandomeng*, *Jasmine*).
   - **Category Classification:** Enter classification (e.g., *Special Aromatic*, *Premium White*).
4. **Set Multi-Tier Packaging Pricing:**
   - **Whole Sack Price (50kg) (₱):** Enter standard wholesale price per 50kg sack.
   - **Half Sack Price (25kg) (₱):** Enter 25kg price (or let the system calculate half rate).
   - **Price per Kg / Loose (₱):** Enter retail rate for loose/tinatakal sales.
   - **Pre-Pack Prices (20kg, 10kg, 5kg) (₱):** Enter specific pack prices (or leave optional).
5. **Set Stock Alert Threshold:**
   - **Low-Stock Alert Threshold (Total Kg):** Enter the minimum safety stock in equivalent kilograms (e.g., `200` kg). When total inventory dips below this, the system flags the product in amber/red.
6. **Set Initial Warehouse Stock (Optional):**
   - Enter starting sacks (50kg, 25kg), pre-pack bags, and loose kilograms.
7. Click **Save Rice Variety**.

---

### B. Updating Prices & Low-Stock Alert Limits

1. Locate the rice variety on the **Products & Pricing** table.
2. Click the **Edit** (pencil) button in the Actions column.
3. The modal opens pre-filled with the product's existing prices and settings.
4. Modify the required fields (e.g., adjust sack price due to market fluctuations).
5. Click **Save Rice Variety**. All updates take effect immediately in the POS register.

---

## 2.4 Warehouse & Inventory Management

Access the **Manage Inventory** page (`inventory.html`) to perform restocking, repackaging, physical audit corrections, and spoilage logging.

> 📸 **SCREENSHOT PLACEHOLDER #15: Manage Inventory Table & Row Actions**  
> * **Recommended File:** `manual_admin_04_inventory_manage.png`  
> * **Instructions:** Capture the Manage Inventory screen showing the stock aging alert banner, variety inventory table, and the contextual row-level buttons (Restock, Open Sack, Adjust/Repack).

---

### A. Restocking New Rice Shipments & Lot Registration

When a new delivery truck arrives from suppliers:

1. Locate the delivered rice variety on the inventory table.
2. Click the green **Restock** button on that specific variety's row.
3. The **Restock Rice Inventory Modal** opens.

> 📸 **SCREENSHOT PLACEHOLDER #16: Restock Rice Inventory Modal**  
> * **Recommended File:** `manual_admin_05_restock_modal.png`  
> * **Instructions:** Capture the Restock modal showing Whole Sacks to Add, Pre-Packaged Bags to Add, Date Received, and Batch Number / Lot input fields.

4. **Enter Quantities Received:**
   - **Whole Sacks to Add (50kg):** Enter quantity of full sacks.
   - **Loose Tinatakal (Kg):** (If loose grain was received).
   - **Pre-Packaged Stock Bags to Add:** Enter counts of 5kg, 10kg, or 20kg bags received.
5. **Record Batch & Traceability Data:**
   - **Date Received:** Pick the delivery date (this initializes the FIFO age counter).
   - **Batch Number / Lot:** Enter the supplier shipment code (e.g., `LOT-202610-A1`).
6. Click **Save Restock**. The inventory counts and equivalent volumes update immediately, and an audit trail entry is logged.

---

### B. Converting Sacks into Loose Inventory

1. Click the blue **Open Sack** button on the target variety row.
2. Select the specific **Rice Batch to Open (FIFO Lot)**.
3. Select the **Sack Size to Open** (50kg, 25kg, 20kg, 10kg, or 5kg).
4. Enter the number of sacks to convert.
5. Review the **Inventory Sync Preview** box confirming sack deduction and kilogram addition.
6. Click **Confirm & Open Sack**.

---

### C. Performing Physical Inventory Corrections

To reconcile system quantities with actual monthly physical counts:

1. Click the **Adjust / Repack** button on the variety row.
2. Under **Action / Adjustment Type**, select:
   - **Inventory Correction (Set / Adjust Physical Count)**.

> 📸 **SCREENSHOT PLACEHOLDER #17: Stock Adjustment & Correction Modal**  
> * **Recommended File:** `manual_admin_06_adjust_modal.png`  
> * **Instructions:** Capture the Adjustment modal with "Inventory Correction" selected, showing the physical count fields and Reason / Justification text area.

3. Enter the audited physical quantities:
   - Updated Whole Sacks count
   - Updated Loose (Tinatakal) kilograms
   - Updated Pre-packed bag counts
4. In the **Reason / Note** field, explain the variance (e.g., *Monthly Physical Warehouse Inventory Audit - October 2026*).
5. Click **Save Adjustment**.

---

### D. Recording Damaged, Spoilage, or Infested Rice

If sacks or bags become wet, damaged during transport, or infested:

1. Click **Adjust / Repack** on the variety row.
2. Select **Damage / Spoilage (Remove Damaged / Infested Stock)**.
3. Enter the damaged quantity to write off (whole sacks or kilograms).
4. Enter a detailed reason (e.g., *Damaged sack due to rain water during transport - discarded*).
5. Click **Save Adjustment**. The stock is deducted from available inventory, and the loss is permanently recorded in the audit log for financial write-off.

---

### E. Managing Aging Stock (>60 Days FIFO Compliance)

1. When rice batches remain in the warehouse for over 60 days, the yellow **Old Stock Alert Banner** appears at the top of the inventory page.
2. Click **View Old Stocks** to filter only aging varieties.
3. Prioritize these batches for loose sales or promotional retail discounts to ensure freshness.

---

## 2.5 Sales Reports & Financial Audit Statements

Access the **Sales Report** module (`sales-report.html`) for multi-period sales analytics, CSV auditing, and printable management statements.

> 📸 **SCREENSHOT PLACEHOLDER #18: Multi-Period Sales Report Overview**  
> * **Recommended File:** `manual_admin_07_sales_report_tabs.png`  
> * **Instructions:** Capture the Sales Report screen showing the period tabs (Daily, Weekly, Monthly, Quarterly, Yearly, Custom), summary metrics, and the variety breakdown table.

---

### A. Generating Multi-Period Reports

Select the appropriate frequency tab at the top of the screen:
1. **📅 Daily Report:** Pick a specific date (or click **Today**). Generates the daily sales audit.
2. **📆 Weekly Report:** Select a calendar week (`input type="week"`) or click **This Week**. Automatically displays Monday-to-Sunday dates (e.g., `Oct 12, 2026 – Oct 18, 2026`).
3. **🗓️ Monthly Report:** Select target month (e.g., `October 2026`). Computes gross monthly turnover and volume.
4. **📊 Quarterly Report:** Select Quarter (Q1, Q2, Q3, Q4) and Year.
5. **📈 Yearly Report:** Select calendar year (e.g., `2026`).
6. **🔍 Custom Range & All Time:** Specify any start and end date for ad-hoc audits.

---

### B. Exporting Filtered CSV Reports

1. Filter the report to your desired period (e.g., *Monthly Report - October 2026*).
2. In the top-right navigation bar, click the **Export CSV** button.
3. The system generates and downloads an itemized spreadsheet file (e.g., `Roberice_Sales_Report_monthly_2026-10.csv`) containing complete order timestamps, customer names, receipt IDs, payment methods, and line-item amounts.

---

### C. Printing Official Store Audit Statements

1. After selecting your target period, click **Print Sales Report** in the top navigation bar.
2. A formal **Official Sales Report Statement** is rendered:
   - Official Roberice header & business registry details
   - Active reporting period & timestamp
   - Total Gross Revenue, Total Sales Count, and Total Kilograms Sold
   - Detailed Rice Variety Volume & Revenue Table
   - Payment Method breakdown (Cash vs. Digital)
   - Formal sign-off lines: **Prepared By (Cashier)**, **Audited By (Admin)**, and **Approved By (Store Owner)**.

> 📸 **SCREENSHOT PLACEHOLDER #19: Official Printable Sales Statement**  
> * **Recommended File:** `manual_admin_08_print_sales_statement.png`  
> * **Instructions:** Capture the print preview of the Official Sales Report statement showing the formal header, table data, and management signature blocks.

---

## 2.6 Store Documents & One-Click Database Backups

Access the **File Management** repository (`file-manager.html`) to safeguard store data and archive financial documents.

> 📸 **SCREENSHOT PLACEHOLDER #20: File Management Repository & Backup Controls**  
> * **Recommended File:** `manual_admin_09_file_manager.png`  
> * **Instructions:** Capture the File Management screen showing the storage summary cards, file list, and the top-right "One-Click Database Backup" and "Upload New Document" buttons.

---

### A. Triggering a One-Click Live Database Backup

Regular database backups prevent data loss in case of hardware failure:

1. In the top-right navigation bar, click the purple **One-Click Database Backup** button.
2. The system executes a live backup of the entire MySQL database (`roberice_db`), including all tables, transactions, inventory lots, and user accounts.
3. An automated SQL snapshot file (e.g., `roberice_db_backup_2026-10-14_19-30-00.sql`) is created, archived in the repository, and immediately downloaded to your computer.
4. The **Latest Database Backup** indicator updates to display the new backup timestamp.

---

### B. Uploading & Archiving Store Documents

To upload supplier receipts, delivery receipts (DR), or sanitary inspection certificates:

1. In the top-right navigation bar, click **Upload New Document**.
2. In the upload modal:
   - Choose your file (supports PDF, CSV, Excel, Word, JPG, PNG, SQL up to 25MB).
   - Select the **Document Category** (e.g., *Supplier Invoice & Delivery Receipt*, *Sales Report*, *Inventory Audit*, *General*).
   - Enter descriptive **Notes / Reference** (e.g., *Delivery Receipt from Isabela Rice Milling Inc. - DR# 44021*).
3. Click **Upload File**.
4. The document is securely stored and accessible for download or viewing at any time.

---

## 2.7 Warehouse Audit Trail & Compliance Log

Access **Audit History** (`audit.html`) to inspect all critical warehouse events and user activities.

> 📸 **SCREENSHOT PLACEHOLDER #21: Audit History & System Trail**  
> * **Recommended File:** `manual_admin_10_audit_history.png`  
> * **Instructions:** Capture the Audit History screen showing the 4 KPI metric cards (Total Events, Sacks Opened, Batches Depleted, Restocks), the event filters, and the chronological audit log table.

### Features & Operations:
- **Automatic Event Recording:** The system automatically logs every restock, sack opening, physical count correction, damage write-off, and batch depletion with exact timestamps and staff names.
- **Filtering Options:** Filter by event type (**Sacks Opened**, **Restocks**, **Damage/Spoilage**, **Corrections**) or date ranges (**Today**, **Past 7 Days**, **Past 30 Days**).
- **Export Audit Log:** Click **Export CSV** in the top navigation bar to download the entire chronological audit trail for external auditors or store accountants.

---

## 2.8 User Management & Granular Permissions Matrix

Manage all employee access via the **User Management** screen (`users.html`).

> 📸 **SCREENSHOT PLACEHOLDER #22: User Management & Accounts Table**  
> * **Recommended File:** `manual_admin_11_user_management.png`  
> * **Instructions:** Capture the User Management screen showing the user statistics cards, search bar, and the users table with assigned roles, permission badges, and account statuses.

---

### A. Creating New User Accounts & Roles

1. Click the green **`Add New User`** button.
2. The **Add / Edit System User Modal** opens.

> 📸 **SCREENSHOT PLACEHOLDER #23: Add User Modal with Permissions Matrix**  
> * **Recommended File:** `manual_admin_12_user_modal_matrix.png`  
> * **Instructions:** Capture the User Modal showing Account Basics (Full Name, Username, Role Presets) and the 10-module Granular Module Permissions Matrix with checkboxes.

3. **Fill in Account Basics:**
   - **Full Name:** Enter employee name (e.g., *Maria Santos*).
   - **Username:** Assign a unique login name (e.g., *msantos*).
   - **Password:** Set an initial password.
   - **Account Status:** Set to **Active**.
4. **Choose a Role Preset:**
   - **Administrator (Full Access):** Automatically checks all 10 module permissions.
   - **Cashier:** Automatically checks **POS**, **View Inventory**, **Transactions**, and **Sales Report**.
   - **Inventory Clerk:** Automatically checks **View Inventory**, **Manage Inventory**, and **Products & Pricing**.
   - **Store Manager:** Automatically checks all operational modules except administrative user management.
   - **Custom Staff:** Allows manual customization.

---

### B. Configuring Granular Module Permissions

Administrators can customize access by checking or unchecking any of the **10 Independent Module Tokens**:

| Module Token | Module Name | Permission Scope |
|---|---|---|
| `dashboard` | **Dashboard** | View revenue charts, KPIs, and store analytics |
| `pos` | **Point of Sale** | Operate cash register, ring sales, and print receipts |
| `view-inventory` | **View Inventory** | Look up stock quantities, sack counts, and batch lots |
| `inventory` | **Manage Inventory** | Restock shipments, open sacks, adjust counts, log spoilage |
| `products` | **Products & Pricing** | Add varieties, edit sack/kg prices, and set alerts |
| `transactions` | **Transactions** | View past customer orders and reprint receipts |
| `sales-report` | **Sales Report** | View daily/monthly sales, export CSV, print statements |
| `file-manager` | **File Manager** | Download backups, upload supplier receipts and invoices |
| `audit` | **Audit History** | Review warehouse adjustments and compliance logs |
| `users` | **User Management** | Create accounts, reset passwords, and edit permissions |

> [!NOTE]
> When a user signs in, their sidebar menu automatically hides any module they have not been granted access to. If they attempt to access an unauthorized URL directly, the system route guard safely redirects them to their homepage.

5. Click **Save User Account**.

---

### C. Password Reset & Account Deactivation

1. **To Reset Password:**
   - Click the **Edit** button on the user's row in `users.html`.
   - Enter a new password in the password field (leave blank if keeping unchanged).
   - Click **Save User Account**.
2. **To Deactivate an Account:**
   - Open the user edit modal.
   - Change **Account Status** from `Active` to `Inactive`.
   - Click **Save**. The user will be immediately blocked from signing in without losing any past sales or audit history tied to their name.

---

# 🔧 System Troubleshooting & FAQ

### Q1: The system says "Cannot connect to database (`roberice_db`)".
- **Solution:** Open the **XAMPP Control Panel** and verify that both the **Apache** and **MySQL** modules display green "Running" statuses. If MySQL is stopped, click **Start**.

### Q2: A customer requests a change of rice variety after the sale is completed.
- **Solution:** Admin users can log an **Inventory Correction** in `inventory.html` to adjust the returned variety back into stock and deduct the replaced variety, adding an explanatory note in the adjustment log.

### Q3: A cashier cannot see the "Manage Inventory" or "User Management" links on their sidebar.
- **Solution:** This is intentional security behavior. Standard Cashier accounts only have permissions for Point of Sale, View Inventory, Transactions, and Sales Report. If an employee requires inventory access, an Admin can update their permissions in `users.html`.

### Q4: Thermal receipt printing cuts off or formatting looks misaligned.
- **Solution:** In the browser print dialog (`Ctrl + P`), set **Paper Size** to `58mm` or `80mm` (matching your thermal roll), set **Margins** to `None` or `Minimum`, and check the **Background Graphics** option.

---

*Roberice POS & Inventory Management System — User's Manual (2026 Edition)*  
*Prepared for Roberice Rice Merchandising, Marikina, Philippines.*
