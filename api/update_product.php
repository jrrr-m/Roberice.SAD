<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['productId'])) {
    echo json_encode([
        "success" => false,
        "message" => "Product ID is required."
    ]);
    exit;
}

$productId = (int)$data['productId'];
$name = isset($data['name']) ? trim($data['name']) : '';
$category = !empty($data['category']) ? trim($data['category']) : '';
$origin = !empty($data['origin']) && in_array($data['origin'], ['Local', 'Imported']) ? $data['origin'] : 'Local';
$riceType = !empty($data['riceType']) ? trim($data['riceType']) : (!empty($data['category']) ? trim($data['category']) : 'White Rice');

if ($name === '') {
    echo json_encode([
        "success" => false,
        "message" => "Product name is required."
    ]);
    exit;
}

// Data duplication handler: check if another active product with this name and rice type exists
try {
    $checkStmt = $conn->prepare("
        SELECT product_id 
        FROM product 
        WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?)) 
          AND LOWER(TRIM(rice_type)) = LOWER(TRIM(?)) 
          AND product_id != ?
          AND product_status = 'Active'
        LIMIT 1
    ");
    $checkStmt->execute([$name, $riceType, $productId]);
    if ($checkStmt->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "A product with this name and rice type already exists."
        ]);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database check failed: " . $e->getMessage()
    ]);
    exit;
}

try {
    $price25kg = !empty($data['price25kg']) ? (float)$data['price25kg'] : ((float)$data['priceSack'] / 2);
    $price5kg = !empty($data['price5kg']) ? (float)$data['price5kg'] : ((float)$data['priceKg'] * 5);
    $price10kg = !empty($data['price10kg']) ? (float)$data['price10kg'] : ((float)$data['priceKg'] * 10);
    $price20kg = !empty($data['price20kg']) ? (float)$data['price20kg'] : ((float)$data['priceKg'] * 20);

    $stmt = $conn->prepare("
        UPDATE product
        SET product_name = ?, category = ?, origin = ?, rice_type = ?, price_sack = ?, price_25kg = ?, price_kg = ?, price_5kg = ?, price_10kg = ?, price_20kg = ?, kg_per_sack = 50.00
        WHERE product_id = ?
    ");

    $stmt->execute([
        $name,
        $category,
        $origin,
        $riceType,
        $data['priceSack'],
        $price25kg,
        $data['priceKg'],
        $price5kg,
        $price10kg,
        $price20kg,
        $productId
    ]);

    $stmt = $conn->prepare("
        UPDATE inventory
        SET reorder_level_kg = ?
        WHERE product_id = ?
    ");

    $stmt->execute([
        $data['thresholdKg'],
        $productId
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Product updated successfully."
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>