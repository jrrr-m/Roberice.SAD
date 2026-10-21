<?php
header("Content-Type: application/json");
require_once "db.php";

try {
    $stmt = $conn->prepare("
        SELECT
            a.adjustment_id,
            a.adjustment_date,
            a.adjustment_type,
            a.sacks,
            a.kg,
            a.note,
            a.performed_by,
            COALESCE(p.product_name, 'Unknown / Inactive Product') AS product_name
        FROM inventory_adjustment a
        LEFT JOIN product p ON a.product_id = p.product_id
        ORDER BY a.adjustment_date DESC, a.adjustment_id DESC
    ");
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>