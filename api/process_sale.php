<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

$items = $data["items"] ?? [];
$username = trim($data["username"] ?? "");
$paymentReceived = (float)($data["paymentReceived"] ?? 0);
$paymentMethod = trim($data["paymentMethod"] ?? "Cash");

if (empty($items)) {
    echo json_encode(["success" => false, "message" => "Cart is empty."]);
    exit;
}

try {
    $conn->beginTransaction();

    $stmt = $conn->prepare("
        SELECT user_id, full_name
        FROM users
        WHERE username = ? AND account_status = 'Active'
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("Cashier account was not found in the database.");
    }

    $total = 0;
    $processedItems = [];

    foreach ($items as $item) {
        $productId = (int)$item["productId"];
        $unit = $item["unit"];
        $qty = (float)$item["qty"];

        if ($qty <= 0) {
            throw new Exception("Invalid quantity.");
        }

        if ($unit === "sack" && floor($qty) != $qty) {
            throw new Exception("Sack quantity must be a whole number.");
        }

        $stmt = $conn->prepare("
            SELECT
                p.product_name,
                p.price_sack,
                p.price_25kg,
                p.price_kg,
                p.price_5kg,
                p.price_10kg,
                p.price_20kg,
                p.kg_per_sack,
                i.stock_sacks,
                i.packaged_25kg,
                i.stock_kg,
                i.packaged_5kg,
                i.packaged_10kg,
                i.packaged_20kg
            FROM product p
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.product_id = ?
            AND p.product_status = 'Active'
            FOR UPDATE
        ");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new Exception("Product not found.");
        }

        $stockSacks = (int)$product["stock_sacks"];
        $p25 = (int)($product["packaged_25kg"] ?? 0);
        $stockKg = (float)$product["stock_kg"];
        $p5 = (int)$product["packaged_5kg"];
        $p10 = (int)$product["packaged_10kg"];
        $p20 = (int)$product["packaged_20kg"];
        $kgPerSack = 50.0;

        $unitLower = strtolower(trim($unit));

        if ($unitLower === "sack" || $unitLower === "50kg") {
            if ($qty > $stockSacks) {
                throw new Exception("Cannot process sale: Insufficient whole sacks in stock for " . $product["product_name"] . ". Only " . $stockSacks . " sacks available.");
            }
            $stockSacks -= (int)$qty;
            $unitPrice = (float)$product["price_sack"];
        } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
            $unitPrice = !empty($product["price_25kg"]) && (float)$product["price_25kg"] > 0
                ? (float)$product["price_25kg"]
                : ((float)$product["price_sack"] / 2);

            $neededPacks = (int)$qty;
            if ($neededPacks > $p25) {
                throw new Exception("Cannot process sale: Insufficient 25kg half sacks in stock for " . $product["product_name"] . ". Only " . $p25 . " available.");
            }
            $p25 -= $neededPacks;
        } elseif ($unitLower === "5kg") {
            $unitPrice = !empty($product["price_5kg"]) && (float)$product["price_5kg"] > 0
                ? (float)$product["price_5kg"]
                : ((float)$product["price_kg"] * 5);

            $neededPacks = (int)$qty;
            if ($neededPacks > $p5) {
                throw new Exception("Cannot process sale: Insufficient 5kg sacks in stock for " . $product["product_name"] . ". Only " . $p5 . " available.");
            }
            $p5 -= $neededPacks;
        } elseif ($unitLower === "10kg") {
            $unitPrice = !empty($product["price_10kg"]) && (float)$product["price_10kg"] > 0
                ? (float)$product["price_10kg"]
                : ((float)$product["price_kg"] * 10);

            $neededPacks = (int)$qty;
            if ($neededPacks > $p10) {
                throw new Exception("Cannot process sale: Insufficient 10kg sacks in stock for " . $product["product_name"] . ". Only " . $p10 . " available.");
            }
            $p10 -= $neededPacks;
        } elseif ($unitLower === "20kg") {
            $unitPrice = !empty($product["price_20kg"]) && (float)$product["price_20kg"] > 0
                ? (float)$product["price_20kg"]
                : ((float)$product["price_kg"] * 20);

            $neededPacks = (int)$qty;
            if ($neededPacks > $p20) {
                throw new Exception("Cannot process sale: Insufficient 20kg sacks in stock for " . $product["product_name"] . ". Only " . $p20 . " available.");
            }
            $p20 -= $neededPacks;
        } else {
            // "tinatakal" or "kg" (loose retail per kg)
            $unitPrice = (float)$product["price_kg"];
            $openSackType = !empty($item["openSackType"]) ? strtolower(trim($item["openSackType"])) : null;

            $totalAvailableKg = ($stockSacks * 50.0) + ($p25 * 25.0) + ($p20 * 20.0) + ($p10 * 10.0) + ($p5 * 5.0) + $stockKg;

            if ($qty > $totalAvailableKg) {
                throw new Exception("Insufficient stock for " . $product["product_name"] . ". Total available is " . number_format($totalAvailableKg, 2) . " kg.");
            }

            if ($stockKg >= $qty && empty($openSackType)) {
                // Stock already has enough loose kg
                $stockKg -= $qty;
            } else {
                // Need to open a sack (or cashier explicitly chose to open a sack)
                $neededKg = max(0, $qty - $stockKg);
                $openedSackDesc = "";

                if ($openSackType === "25kg" || (empty($openSackType) && $p25 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 25.0));
                    if ($p25 < $sacksToOpen) {
                        throw new Exception("Insufficient 25kg half sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p25 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 25.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 25kg half sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($openSackType === "20kg" || (empty($openSackType) && $p20 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 20.0));
                    if ($p20 < $sacksToOpen) {
                        throw new Exception("Insufficient 20kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p20 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 20.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 20kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($openSackType === "10kg" || (empty($openSackType) && $p10 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 10.0));
                    if ($p10 < $sacksToOpen) {
                        throw new Exception("Insufficient 10kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p10 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 10.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 10kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($openSackType === "5kg" || (empty($openSackType) && $p5 > 0)) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 5.0));
                    if ($p5 < $sacksToOpen) {
                        throw new Exception("Insufficient 5kg sacks in stock for " . $product["product_name"] . ".");
                    }
                    $p5 -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 5.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x 5kg sack";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } elseif ($stockSacks > 0) {
                    $sacksToOpen = max(1, (int)ceil($neededKg / 50.0));
                    if ($stockSacks < $sacksToOpen) {
                        throw new Exception("Insufficient whole sacks in stock for " . $product["product_name"] . ".");
                    }
                    $stockSacks -= $sacksToOpen;
                    $addedKg = $sacksToOpen * 50.0;
                    $stockKg += $addedKg;
                    $openedSackDesc = "{$sacksToOpen}x Whole Sack (50kg)";
                    $openedSacksCount = $sacksToOpen;
                    $openedKgAmount = $addedKg;
                } else {
                    throw new Exception("No sacks available to open for " . $product["product_name"] . ".");
                }

                // Deduct sold quantity from the newly opened loose stock
                $stockKg -= $qty;

                // Log the opened sack in inventory adjustment log
                $itemBatch = !empty($item["batchNumber"]) ? trim($item["batchNumber"]) : ($product["batch_number"] ?? "BATCH-001");
                $adjStmt = $conn->prepare("
                    INSERT INTO inventory_adjustment
                    (product_id, batch_code, adjustment_type, sacks, kg, note, performed_by)
                    VALUES (?, ?, 'open_sack', ?, ?, ?, ?)
                ");
                $adjStmt->execute([
                    $productId,
                    $itemBatch,
                    $openedSacksCount,
                    $openedKgAmount,
                    "Opened {$openedSackDesc} from Batch {$itemBatch} for {$qty} kg sale ({$stockKg} kg stored in loose inventory)",
                    $user["full_name"]
                ]);
            }
        }

        $subtotal = $unitPrice * $qty;
        $total += $subtotal;

        $processedItems[] = [
            "productId" => $productId,
            "productName" => $product["product_name"],
            "unit" => $unit,
            "qty" => $qty,
            "unitPrice" => $unitPrice,
            "subtotal" => $subtotal
        ];

        $stmt = $conn->prepare("
            UPDATE inventory
            SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?
            WHERE product_id = ?
        ");
        $stmt->execute([$stockSacks, $p25, $stockKg, $p5, $p10, $p20, $productId]);

        // Sync with inventory_batch table if exists
        $hasBatches = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
        $saleBatchCode = !empty($item["batchNumber"]) ? trim($item["batchNumber"]) : ($product["batch_number"] ?? null);
        if (count($hasBatches) > 0 && !empty($saleBatchCode)) {
            $bStmt = $conn->prepare("SELECT * FROM inventory_batch WHERE product_id = ? AND batch_code = ? AND status = 'Active' LIMIT 1");
            $bStmt->execute([$productId, $saleBatchCode]);
            $bRow = $bStmt->fetch(PDO::FETCH_ASSOC);

            if ($bRow) {
                $bId = $bRow['batch_id'];
                $bSacks = (int)$bRow['stock_sacks'];
                $b25 = (int)$bRow['packaged_25kg'];
                $b20 = (int)$bRow['packaged_20kg'];
                $b10 = (int)$bRow['packaged_10kg'];
                $b5 = (int)$bRow['packaged_5kg'];
                $bKg = (float)$bRow['stock_kg'];

                if ($unit === 'sack' || $unit === '50kg') {
                    $bSacks = max(0, $bSacks - (int)$qty);
                } elseif ($unit === '25kg' || $unit === 'half') {
                    $b25 = max(0, $b25 - (int)$qty);
                } elseif ($unit === '20kg') {
                    $b20 = max(0, $b20 - (int)$qty);
                } elseif ($unit === '10kg') {
                    $b10 = max(0, $b10 - (int)$qty);
                } elseif ($unit === '5kg') {
                    $b5 = max(0, $b5 - (int)$qty);
                } else {
                    if (isset($openedSacksCount) && $openedSacksCount > 0) {
                        if (isset($chosenSackToOpen) && $chosenSackToOpen === '25kg') $b25 = max(0, $b25 - $openedSacksCount);
                        elseif (isset($chosenSackToOpen) && $chosenSackToOpen === '20kg') $b20 = max(0, $b20 - $openedSacksCount);
                        elseif (isset($chosenSackToOpen) && $chosenSackToOpen === '10kg') $b10 = max(0, $b10 - $openedSacksCount);
                        elseif (isset($chosenSackToOpen) && $chosenSackToOpen === '5kg') $b5 = max(0, $b5 - $openedSacksCount);
                        else $bSacks = max(0, $bSacks - $openedSacksCount);
                        $bKg = max(0.0, ($bKg + (float)$openedKgAmount) - (float)$qty);
                    } else {
                        $bKg = max(0.0, $bKg - (float)$qty);
                    }
                }

                $bVol = ($bSacks * 50) + ($b25 * 25) + ($b20 * 20) + ($b10 * 10) + ($b5 * 5) + $bKg;
                $newStatus = ($bVol <= 0) ? 'Depleted' : 'Active';

                $upd = $conn->prepare("UPDATE inventory_batch SET stock_sacks = ?, packaged_25kg = ?, packaged_20kg = ?, packaged_10kg = ?, packaged_5kg = ?, stock_kg = ?, status = ? WHERE batch_id = ?");
                $upd->execute([$bSacks, $b25, $b20, $b10, $b5, $bKg, $newStatus, $bId]);

                if ($newStatus === 'Depleted' && $bRow['status'] === 'Active') {
                    $depStmt = $conn->prepare("
                        INSERT INTO inventory_adjustment
                        (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                        VALUES (?, ?, NOW(), 'batch_depleted', 0, 0, ?, ?)
                    ");
                    $depStmt->execute([
                        $productId,
                        $saleBatchCode,
                        "Batch {$saleBatchCode} for {$product['product_name']} ran out (0 kg remaining) — batch completed & archived.",
                        $user["full_name"]
                    ]);
                }
            }
        }
    }

    if ($paymentReceived < $total) {
        throw new Exception("Payment received is insufficient.");
    }

    $change = $paymentReceived - $total;

    $stmt = $conn->prepare("
        INSERT INTO sales_transaction
        (user_id, total_amount, payment_amount, change_amount, payment_method, transaction_status)
        VALUES (?, ?, ?, ?, ?, 'Completed')
    ");

    $stmt->execute([
        $user["user_id"],
        $total,
        $paymentReceived,
        $change,
        $paymentMethod
    ]);

    $transactionId = $conn->lastInsertId();

    $itemStmt = $conn->prepare("
        INSERT INTO transaction_item
        (transaction_id, product_id, unit, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    foreach ($processedItems as $item) {
        $itemStmt->execute([
            $transactionId,
            $item["productId"],
            $item["unit"],
            $item["qty"],
            $item["unitPrice"],
            $item["subtotal"]
        ]);
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "transactionId" => $transactionId,
        "cashierName" => $user["full_name"],
        "totalAmount" => $total,
        "paymentReceived" => $paymentReceived,
        "changeAmount" => $change,
        "paymentMethod" => $paymentMethod,
        "items" => $processedItems
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