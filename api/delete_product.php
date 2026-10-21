<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['productId']) || (int)$data['productId'] <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Product ID is required."
    ]);
    exit;
}

$productId = (int)$data['productId'];
$user = trim($data['user'] ?? 'Admin User');

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        SELECT 
            p.product_id, 
            p.product_name, 
            p.product_status,
            COALESCE(i.stock_sacks, 0) AS stock_sacks,
            COALESCE(i.packaged_25kg, 0) AS packaged_25kg,
            COALESCE(i.packaged_20kg, 0) AS packaged_20kg,
            COALESCE(i.packaged_10kg, 0) AS packaged_10kg,
            COALESCE(i.packaged_5kg, 0) AS packaged_5kg,
            COALESCE(i.stock_kg, 0.0) AS stock_kg,
            COALESCE(i.batch_number, 'BATCH-001') AS batch_number
        FROM product p
        LEFT JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_id = ?
        FOR UPDATE
    ");
    $stmt->execute([$productId]);
    $prod = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$prod) {
        throw new Exception("Product record not found.");
    }

    if ($prod['product_status'] === 'Inactive') {
        throw new Exception("Product is already deactivated.");
    }

    $upd = $conn->prepare("
        UPDATE product
        SET product_status = 'Inactive'
        WHERE product_id = ?
    ");
    $upd->execute([$productId]);

    $sacks = (int)$prod['stock_sacks'];
    $p25 = (int)$prod['packaged_25kg'];
    $p20 = (int)$prod['packaged_20kg'];
    $p10 = (int)$prod['packaged_10kg'];
    $p5 = (int)$prod['packaged_5kg'];
    $kg = (float)$prod['stock_kg'];
    $totalKg = ($sacks * 50.0) + ($p25 * 25.0) + ($p20 * 20.0) + ($p10 * 10.0) + ($p5 * 5.0) + $kg;

    // Log the product deactivation in audit history
    $adjStmt = $conn->prepare("
        INSERT INTO inventory_adjustment
        (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
        VALUES (?, ?, NOW(), 'correction', ?, ?, ?, ?)
    ");
    $adjStmt->execute([
        $productId,
        $prod['batch_number'],
        $sacks,
        $kg,
        "Product '{$prod['product_name']}' set to Inactive by {$user}. Remaining stock at time of deactivation: {$sacks} sacks, {$p25}x 25k, {$p20}x 20k, {$p10}x 10k, {$p5}x 5k, {$kg} kg loose (" . number_format($totalKg, 1) . " kg total).",
        $user
    ]);

    $conn->commit();

    echo json_encode([
        "success" => true,
        "productName" => $prod['product_name'],
        "remainingKg" => $totalKg,
        "message" => "Product '{$prod['product_name']}' deactivated successfully."
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>