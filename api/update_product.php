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
$category = isset($data['category']) ? trim($data['category']) : '';
$origin = !empty($data['origin']) && in_array($data['origin'], ['Local', 'Imported']) ? $data['origin'] : 'Local';
$riceType = isset($data['riceType']) ? trim($data['riceType']) : '';

if ($name === '') {
    echo json_encode([
        "success" => false,
        "message" => "Rice variety name is required."
    ]);
    exit;
}

if ($riceType === '') {
    echo json_encode([
        "success" => false,
        "message" => "Specific rice type / grain is required."
    ]);
    exit;
}

if ($category === '') {
    echo json_encode([
        "success" => false,
        "message" => "Category classification is required."
    ]);
    exit;
}

if (!isset($data['priceSack']) || $data['priceSack'] === '' || $data['priceSack'] === null) {
    echo json_encode([
        "success" => false,
        "message" => "Whole sack price is required."
    ]);
    exit;
}

if (!isset($data['priceKg']) || $data['priceKg'] === '' || $data['priceKg'] === null) {
    echo json_encode([
        "success" => false,
        "message" => "Price per kg is required."
    ]);
    exit;
}

if (!isset($data['thresholdKg']) || $data['thresholdKg'] === '' || $data['thresholdKg'] === null) {
    echo json_encode([
        "success" => false,
        "message" => "Low-stock alert threshold is required."
    ]);
    exit;
}

// Data duplication handler: check if another active product with this name exists
try {
    $checkStmt = $conn->prepare("
        SELECT product_id 
        FROM product 
        WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?)) 
          AND product_id != ?
          AND product_status = 'Active'
        LIMIT 1
    ");
    $checkStmt->execute([$name, $productId]);
    if ($checkStmt->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "A product with this name already exists."
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

// Value validation: numeric prices and threshold must be greater than zero
$priceSack = isset($data['priceSack']) ? (float)$data['priceSack'] : 0;
$priceKg = isset($data['priceKg']) ? (float)$data['priceKg'] : 0;
$thresholdKg = isset($data['thresholdKg']) ? (float)$data['thresholdKg'] : 200;

if ($priceSack <= 0 || $priceKg <= 0 || $thresholdKg <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Value must be greater than zero."
    ]);
    exit;
}

$price25kg = !empty($data['price25kg']) ? (float)$data['price25kg'] : ($priceSack / 2);
$price5kg = !empty($data['price5kg']) ? (float)$data['price5kg'] : ($priceKg * 5);
$price10kg = !empty($data['price10kg']) ? (float)$data['price10kg'] : ($priceKg * 10);
$price20kg = !empty($data['price20kg']) ? (float)$data['price20kg'] : ($priceKg * 20);

if ($price25kg <= 0 || $price5kg <= 0 || $price10kg <= 0 || $price20kg <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Value must be greater than zero."
    ]);
    exit;
}

if ($priceSack <= $price25kg) {
    echo json_encode([
        "success" => false,
        "message" => "Whole sack price must be greater than half sack price."
    ]);
    exit;
}

try {
    $conn->beginTransaction();

    $chkExists = $conn->prepare("SELECT product_id FROM product WHERE product_id = ? FOR UPDATE");
    $chkExists->execute([$productId]);
    if (!$chkExists->fetch()) {
        throw new Exception("Product record not found.");
    }

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
        $priceSack,
        $price25kg,
        $priceKg,
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
        $thresholdKg,
        $productId
    ]);

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Product updated successfully."
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