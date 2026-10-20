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

// Data duplication handler: check if a product with the same name exists
try {
    $checkStmt = $conn->prepare("
        SELECT product_id 
        FROM product 
        WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?)) 
          AND product_status = 'Active'
        LIMIT 1
    ");
    $checkStmt->execute([$name]);
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

$initialSacks = isset($data['initialSacks']) ? (int)$data['initialSacks'] : 0;
$packaged25kg = isset($data['packaged25kg']) ? (int)$data['packaged25kg'] : 0;
$initialKg = isset($data['initialKg']) ? (float)$data['initialKg'] : 0;
$packaged5kg = isset($data['packaged5kg']) ? (int)$data['packaged5kg'] : 0;
$packaged10kg = isset($data['packaged10kg']) ? (int)$data['packaged10kg'] : 0;
$packaged20kg = isset($data['packaged20kg']) ? (int)$data['packaged20kg'] : 0;

if ($initialSacks < 0 || $packaged25kg < 0 || $initialKg < 0 || $packaged5kg < 0 || $packaged10kg < 0 || $packaged20kg < 0) {
    echo json_encode([
        "success" => false,
        "message" => "Value must be greater than zero."
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

    // Sync initial stock with inventory_batch
    $hasBatches = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
    if (count($hasBatches) > 0) {
        $totalInitKg = ($initialSacks * 50) + ($packaged25kg * 25) + ($packaged20kg * 20) + ($packaged10kg * 10) + ($packaged5kg * 5) + $initialKg;
        $batchStatus = ($totalInitKg <= 0) ? 'Depleted' : 'Active';
        $insBatch = $conn->prepare("
            INSERT INTO inventory_batch 
            (product_id, batch_code, received_date, stock_sacks, packaged_25kg, packaged_20kg, packaged_10kg, packaged_5kg, stock_kg, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        $insBatch->execute([$productId, $batchNumber, $receivedDate, $initialSacks, $packaged25kg, $packaged20kg, $packaged10kg, $packaged5kg, $initialKg, $batchStatus]);
    }

    // Log initial restock to inventory_adjustment if any stock was provided
    if ($initialSacks > 0 || $packaged25kg > 0 || $initialKg > 0 || $packaged5kg > 0 || $packaged10kg > 0 || $packaged20kg > 0) {
        $adjStmt = $conn->prepare("
            INSERT INTO inventory_adjustment
            (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
            VALUES (?, ?, NOW(), 'restock', ?, ?, ?, 'Admin User')
        ");
        $adjStmt->execute([
            $productId,
            $batchNumber,
            $initialSacks,
            $initialKg,
            "Initial stock configuration for {$name} [Batch: {$batchNumber}, Packs: 25k={$packaged25kg}, 20k={$packaged20kg}, 10k={$packaged10kg}, 5k={$packaged5kg}]"
        ]);
    }

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