<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request data."
    ]);
    exit;
}

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

// Data duplication handler: check if a product with the same name and rice type exists
try {
    $checkStmt = $conn->prepare("
        SELECT product_id 
        FROM product 
        WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?)) 
          AND LOWER(TRIM(rice_type)) = LOWER(TRIM(?)) 
          AND product_status = 'Active'
        LIMIT 1
    ");
    $checkStmt->execute([$name, $riceType]);
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

// Value validation: numeric prices and threshold must be greater than 0
$priceSack = isset($data['priceSack']) ? (float)$data['priceSack'] : 0;
$priceKg = isset($data['priceKg']) ? (float)$data['priceKg'] : 0;
$thresholdKg = isset($data['thresholdKg']) ? (float)$data['thresholdKg'] : 200;

if ($priceSack <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Whole sack price must be greater than 0."
    ]);
    exit;
}

if ($priceKg <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Price per kg must be greater than 0."
    ]);
    exit;
}

if ($thresholdKg <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Low-stock alert threshold must be greater than 0."
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
        "message" => "Pack prices must be greater than 0."
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

$initialSacks = isset($data['initialSacks']) ? (int)$data['initialSacks'] : 0;
$packaged25kg = isset($data['packaged25kg']) ? (int)$data['packaged25kg'] : 0;
$initialKg = isset($data['initialKg']) ? (float)$data['initialKg'] : 0;
$packaged5kg = isset($data['packaged5kg']) ? (int)$data['packaged5kg'] : 0;
$packaged10kg = isset($data['packaged10kg']) ? (int)$data['packaged10kg'] : 0;
$packaged20kg = isset($data['packaged20kg']) ? (int)$data['packaged20kg'] : 0;

if ($initialSacks < 0 || $packaged25kg < 0 || $initialKg < 0 || $packaged5kg < 0 || $packaged10kg < 0 || $packaged20kg < 0) {
    echo json_encode([
        "success" => false,
        "message" => "Initial stock quantities must be greater than or equal to 0."
    ]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        INSERT INTO product
        (product_name, category, origin, rice_type, description, price_sack, price_25kg, price_kg, price_5kg, price_10kg, price_20kg, kg_per_sack, product_status)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 50.00, 'Active')
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
        $price20kg
    ]);

    $productId = $conn->lastInsertId();

    $receivedDate = !empty($data['receivedDate']) ? $data['receivedDate'] : date('Y-m-d');
    $batchNumber = !empty($data['batchNumber']) ? trim($data['batchNumber']) : ('BATCH-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 3)) . '-' . date('ym'));

    $stmt = $conn->prepare("
        INSERT INTO inventory
        (product_id, stock_sacks, packaged_25kg, stock_kg, packaged_5kg, packaged_10kg, packaged_20kg, received_date, batch_number, reorder_level_kg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $productId,
        $initialSacks,
        $packaged25kg,
        $initialKg,
        $packaged5kg,
        $packaged10kg,
        $packaged20kg,
        $receivedDate,
        $batchNumber,
        $thresholdKg
    ]);

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Product added successfully."
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