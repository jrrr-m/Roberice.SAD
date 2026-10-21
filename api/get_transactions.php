<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    // 1. Pagination parameters
    $isAll = isset($_GET['limit']) && strtolower($_GET['limit']) === 'all';
    $limit = $isAll ? 5000 : (isset($_GET['limit']) ? max(1, min(500, (int)$_GET['limit'])) : 150);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    if (isset($_GET['page'])) {
        $page = max(1, (int)$_GET['page']);
        $offset = ($page - 1) * $limit;
    }

    // 2. Query filters
    $whereClauses = [];
    $params = [];

    $cashier = isset($_GET['cashier']) && $_GET['cashier'] !== 'all' ? (int)$_GET['cashier'] : null;
    if ($cashier !== null) {
        $whereClauses[] = "t.user_id = ?";
        $params[] = $cashier;
    }

    $method = isset($_GET['method']) && $_GET['method'] !== 'all' && $_GET['method'] !== '' ? trim($_GET['method']) : null;
    if ($method !== null) {
        $whereClauses[] = "t.payment_method = ?";
        $params[] = $method;
    }

    $days = isset($_GET['days']) ? (int)$_GET['days'] : null;
    if ($days !== null && $days > 0) {
        $whereClauses[] = "t.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)";
        $params[] = $days;
    }

    $date = isset($_GET['date']) && $_GET['date'] !== 'all' && $_GET['date'] !== '' ? trim($_GET['date']) : null;
    if ($date !== null) {
        $whereClauses[] = "DATE(t.transaction_date) = ?";
        $params[] = $date;
    }

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    if ($search !== '') {
        $whereClauses[] = "(t.transaction_id LIKE ? OR u.username LIKE ? OR u.full_name LIKE ? OR EXISTS (
            SELECT 1 FROM transaction_item ti2 
            LEFT JOIN product p2 ON ti2.product_id = p2.product_id 
            WHERE ti2.transaction_id = t.transaction_id AND p2.product_name LIKE ?
        ))";
        $wildcard = "%{$search}%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $whereSql = !empty($whereClauses) ? "WHERE " . implode(" AND ", $whereClauses) : "";

    // Total count for pagination metadata
    $countStmt = $conn->prepare("SELECT COUNT(*) FROM sales_transaction t JOIN users u ON t.user_id = u.user_id $whereSql");
    $countStmt->execute($params);
    $totalRecords = (int)$countStmt->fetchColumn();

    // 3. Fetch paginated transactions from DB
    $stmt = $conn->prepare("
        SELECT
            t.transaction_id,
            t.transaction_date,
            t.total_amount,
            t.payment_amount,
            t.change_amount,
            t.payment_method,
            t.transaction_status,
            u.user_id,
            u.username,
            u.full_name
        FROM sales_transaction t
        JOIN users u ON t.user_id = u.user_id
        $whereSql
        ORDER BY t.transaction_date DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Fetch line items ONLY for the selected transactions (prevents whole-table memory blowup)
    if (!empty($transactions)) {
        $txIds = array_column($transactions, 'transaction_id');
        $placeholders = implode(',', array_fill(0, count($txIds), '?'));
        $stmtItems = $conn->prepare("
            SELECT
                ti.transaction_id,
                COALESCE(p.product_name, 'Unknown / Inactive Product') AS product_name,
                ti.unit,
                ti.quantity,
                ti.unit_price,
                ti.subtotal
            FROM transaction_item ti
            LEFT JOIN product p ON ti.product_id = p.product_id
            WHERE ti.transaction_id IN ($placeholders)
            ORDER BY ti.transaction_item_id ASC
        ");
        $stmtItems->execute($txIds);
        $allItems = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        $itemsByTx = [];
        foreach ($allItems as $item) {
            $txId = $item['transaction_id'];
            unset($item['transaction_id']);
            $itemsByTx[$txId][] = $item;
        }

        foreach ($transactions as &$t) {
            $t['items'] = $itemsByTx[$t['transaction_id']] ?? [];
        }
        unset($t);
    }

    // Set pagination metadata headers
    header("X-Total-Count: " . $totalRecords);
    header("X-Limit: " . $limit);
    header("X-Offset: " . $offset);

    // Return structured object if requested or array by default for backward compatibility
    if (isset($_GET['format']) && $_GET['format'] === 'paged' || isset($_GET['page'])) {
        echo json_encode([
            "success" => true,
            "total" => $totalRecords,
            "limit" => $limit,
            "offset" => $offset,
            "transactions" => $transactions
        ]);
    } else {
        echo json_encode($transactions);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
?>