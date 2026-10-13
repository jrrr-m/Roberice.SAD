<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    // 1. Fetch transactions
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
        ORDER BY t.transaction_date DESC
    ");
    $stmt->execute();
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch all transaction items in a single query (indexed by transaction_id)
    $stmtItems = $conn->query("
        SELECT
            ti.transaction_id,
            p.product_name,
            ti.unit,
            ti.quantity,
            ti.unit_price,
            ti.subtotal
        FROM transaction_item ti
        JOIN product p ON ti.product_id = p.product_id
        ORDER BY ti.transaction_item_id ASC
    ");
    $allItems = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    $itemsByTx = [];
    foreach ($allItems as $item) {
        $txId = $item['transaction_id'];
        unset($item['transaction_id']);
        $itemsByTx[$txId][] = $item;
    }

    // 3. Attach items array
    foreach ($transactions as &$t) {
        $txId = $t['transaction_id'];
        $t['items'] = $itemsByTx[$txId] ?? [];
    }

    echo json_encode($transactions);

} catch (PDOException $e) {
    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
?>