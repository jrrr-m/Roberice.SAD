<?php
header("Content-Type: application/json");
require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    $data = $_POST;
}

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

    // Cashier lookup with defensive fallback to prevent foreign key constraint crashes on sales_transaction
    $user = null;
    if (!empty($username)) {
        $stmt = $conn->prepare("
            SELECT user_id, username, full_name, role
            FROM users
            WHERE username = ? AND account_status = 'Active'
            LIMIT 1
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user) {
        // Fallback to active admin or any active user
        $stmt = $conn->prepare("
            SELECT user_id, username, full_name, role
            FROM users
            WHERE account_status = 'Active'
            ORDER BY CASE WHEN LOWER(role) = 'admin' THEN 1 ELSE 2 END, user_id ASC
            LIMIT 1
        ");
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user) {
        throw new Exception("No active cashier or administrator account found in the database.");
    }

    // Check if table inventory_batch exists in the database
    $hasBatchTable = false;
    try {
        $tblCheck = $conn->query("SHOW TABLES LIKE 'inventory_batch'")->fetchAll();
        $hasBatchTable = (count($tblCheck) > 0);
    } catch (Exception $e) {
        $hasBatchTable = false;
    }

    $total = 0.0;
    $processedItems = [];

    foreach ($items as $item) {
        $productId = (int)($item["productId"] ?? 0);
        $unit = trim($item["unit"] ?? "tinatakal");
        $qty = (float)($item["qty"] ?? 0);
        $batchNumber = trim($item["batchNumber"] ?? "");

        if ($productId <= 0) {
            throw new Exception("Invalid product specified in transaction.");
        }

        if ($qty <= 0) {
            throw new Exception("Invalid quantity for product ID {$productId}.");
        }

        $unitLower = strtolower($unit);

        if (($unitLower === "sack" || $unitLower === "50kg") && floor($qty) != $qty) {
            throw new Exception("Sack quantity must be a whole number.");
        }

        // Lock product and inventory records
        $stmt = $conn->prepare("
            SELECT
                p.product_id,
                p.product_name,
                p.price_sack,
                p.price_25kg,
                p.price_kg,
                p.price_5kg,
                p.price_10kg,
                p.price_20kg,
                p.kg_per_sack,
                COALESCE(i.stock_sacks, 0) AS stock_sacks,
                COALESCE(i.packaged_25kg, 0) AS packaged_25kg,
                COALESCE(i.stock_kg, 0.00) AS stock_kg,
                COALESCE(i.packaged_5kg, 0) AS packaged_5kg,
                COALESCE(i.packaged_10kg, 0) AS packaged_10kg,
                COALESCE(i.packaged_20kg, 0) AS packaged_20kg,
                i.batch_number,
                i.received_date
            FROM product p
            LEFT JOIN inventory i ON p.product_id = i.product_id
            WHERE p.product_id = ?
            AND p.product_status = 'Active'
            FOR UPDATE
        ");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new Exception("Product ID {$productId} was not found or is currently inactive.");
        }

        $stockSacks = (int)$product["stock_sacks"];
        $p25 = (int)$product["packaged_25kg"];
        $p20 = (int)$product["packaged_20kg"];
        $p10 = (int)$product["packaged_10kg"];
        $p5 = (int)$product["packaged_5kg"];
        $stockKg = (float)$product["stock_kg"];

        // 1. Determine Unit Price & Subtotal based on packaging unit
        if ($unitLower === "sack" || $unitLower === "50kg") {
            $unitPrice = (float)$product["price_sack"];
        } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
            $unitPrice = (!empty($product["price_25kg"]) && (float)$product["price_25kg"] > 0)
                ? (float)$product["price_25kg"]
                : ((float)$product["price_sack"] / 2);
        } elseif ($unitLower === "20kg") {
            $unitPrice = (!empty($product["price_20kg"]) && (float)$product["price_20kg"] > 0)
                ? (float)$product["price_20kg"]
                : ((float)$product["price_kg"] * 20);
        } elseif ($unitLower === "10kg") {
            $unitPrice = (!empty($product["price_10kg"]) && (float)$product["price_10kg"] > 0)
                ? (float)$product["price_10kg"]
                : ((float)$product["price_kg"] * 10);
        } elseif ($unitLower === "5kg") {
            $unitPrice = (!empty($product["price_5kg"]) && (float)$product["price_5kg"] > 0)
                ? (float)$product["price_5kg"]
                : ((float)$product["price_kg"] * 5);
        } else {
            // tinatakal / loose per kg
            $unitPrice = (float)$product["price_kg"];
        }

        // 2. Real-time Stock Deduction
        $batches = [];
        if ($hasBatchTable) {
            $batchStmt = $conn->prepare("
                SELECT * 
                FROM inventory_batch 
                WHERE product_id = ? AND status = 'Active'
                ORDER BY received_date ASC, batch_id ASC
                FOR UPDATE
            ");
            $batchStmt->execute([$productId]);
            $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

            // If a specific batch was passed, prioritize it in the deduction order
            if (!empty($batchNumber) && !empty($batches)) {
                usort($batches, function($a, $b) use ($batchNumber) {
                    if ($a['batch_code'] === $batchNumber) return -1;
                    if ($b['batch_code'] === $batchNumber) return 1;
                    return strcmp($a['received_date'], $b['received_date']);
                });
            }
        }

        if (!empty($batches)) {
            // Batch-driven FIFO inventory deduction
            if ($unitLower === "sack" || $unitLower === "50kg") {
                $totalAvailable = array_sum(array_column($batches, 'stock_sacks'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient whole sacks in stock for {$product['product_name']}. Only {$totalAvailable} sacks available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['stock_sacks'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['stock_sacks']);
                    $b['stock_sacks'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_25kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 25kg half sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_25kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_25kg']);
                    $b['packaged_25kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "20kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_20kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 20kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_20kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_20kg']);
                    $b['packaged_20kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "10kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_10kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 10kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_10kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_10kg']);
                    $b['packaged_10kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } elseif ($unitLower === "5kg") {
                $totalAvailable = array_sum(array_column($batches, 'packaged_5kg'));
                if ($qty > $totalAvailable) {
                    throw new Exception("Cannot process sale: Insufficient 5kg sacks in stock for {$product['product_name']}. Only {$totalAvailable} available.");
                }

                $remQty = (int)$qty;
                foreach ($batches as &$b) {
                    if ($b['packaged_5kg'] <= 0) continue;
                    $deduct = min($remQty, (int)$b['packaged_5kg']);
                    $b['packaged_5kg'] -= $deduct;
                    $remQty -= $deduct;
                    if ($remQty <= 0) break;
                }
                unset($b);

            } else {
                // Tinatakal (loose per kg)
                $totalLooseKg = (float)array_sum(array_column($batches, 'stock_kg'));

                // Auto-open whole sack(s) in FIFO order if requested kg exceeds current loose stock
                if ($totalLooseKg < $qty) {
                    $neededKg = $qty - $totalLooseKg;
                    $sacksNeeded = (int)ceil($neededKg / 50.0);

                    $adjStmt = $conn->prepare("
                        INSERT INTO inventory_adjustment
                        (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                        VALUES (?, ?, NOW(), 'open_sack', ?, ?, ?, ?)
                    ");

                    foreach ($batches as &$b) {
                        if ($sacksNeeded <= 0) break;
                        if ((int)$b['stock_sacks'] <= 0) continue;

                        $openThisBatch = min($sacksNeeded, (int)$b['stock_sacks']);
                        $b['stock_sacks'] -= $openThisBatch;
                        $addedKg = $openThisBatch * 50.0;
                        $b['stock_kg'] = (float)$b['stock_kg'] + $addedKg;
                        $sacksNeeded -= $openThisBatch;

                        $adjStmt->execute([
                            $productId,
                            $b['batch_code'],
                            $openThisBatch,
                            $addedKg,
                            "Auto-opened {$openThisBatch}x Whole Sack (50kg) from Batch {$b['batch_code']} for {$qty} kg retail sale.",
                            $user["full_name"]
                        ]);
                    }
                    unset($b);

                    if ($sacksNeeded > 0) {
                        throw new Exception("Cannot process sale: Insufficient loose stock and whole sacks for {$product['product_name']}.");
                    }
                }

                // Deduct loose kg in FIFO order across active batches
                $remKg = (float)$qty;
                foreach ($batches as &$b) {
                    if ((float)$b['stock_kg'] <= 0.0) continue;
                    $deduct = min($remKg, (float)$b['stock_kg']);
                    $b['stock_kg'] = max(0.0, (float)$b['stock_kg'] - $deduct);
                    $remKg -= $deduct;
                    if ($remKg <= 0.0001) break;
                }
                unset($b);
            }

            // Update each batch and detect depletions
            $updBatchStmt = $conn->prepare("
                UPDATE inventory_batch 
                SET stock_sacks = ?, packaged_25kg = ?, packaged_20kg = ?, packaged_10kg = ?, packaged_5kg = ?, stock_kg = ?, status = ?, updated_at = NOW()
                WHERE batch_id = ?
            ");

            $depStmt = $conn->prepare("
                INSERT INTO inventory_adjustment
                (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                VALUES (?, ?, NOW(), 'batch_depleted', 0, 0, ?, ?)
            ");

            $totalSacks = 0;
            $total25 = 0;
            $total20 = 0;
            $total10 = 0;
            $total5 = 0;
            $totalKg = 0.0;
            $latestBatchCode = $product['batch_number'] ?? 'BATCH-001';
            $latestRecDate = $product['received_date'] ?? date('Y-m-d');

            foreach ($batches as $b) {
                $bVol = ($b['stock_sacks'] * 50) + ($b['packaged_25kg'] * 25) + ($b['packaged_20kg'] * 20) + ($b['packaged_10kg'] * 10) + ($b['packaged_5kg'] * 5) + (float)$b['stock_kg'];
                $newStatus = ($bVol <= 0.001) ? 'Depleted' : 'Active';

                $updBatchStmt->execute([
                    $b['stock_sacks'],
                    $b['packaged_25kg'],
                    $b['packaged_20kg'],
                    $b['packaged_10kg'],
                    $b['packaged_5kg'],
                    round((float)$b['stock_kg'], 2),
                    $newStatus,
                    $b['batch_id']
                ]);

                if ($newStatus === 'Depleted' && $b['status'] === 'Active') {
                    $depStmt->execute([
                        $productId,
                        $b['batch_code'],
                        "Batch {$b['batch_code']} for {$product['product_name']} fully sold out (0 kg remaining) — batch completed & archived.",
                        $user["full_name"]
                    ]);
                }

                if ($newStatus === 'Active') {
                    $totalSacks += (int)$b['stock_sacks'];
                    $total25 += (int)$b['packaged_25kg'];
                    $total20 += (int)$b['packaged_20kg'];
                    $total10 += (int)$b['packaged_10kg'];
                    $total5 += (int)$b['packaged_5kg'];
                    $totalKg += (float)$b['stock_kg'];
                    $latestBatchCode = $b['batch_code'];
                    $latestRecDate = $b['received_date'];
                }
            }

            // Synchronize inventory table directly from active batch sums
            $updInv = $conn->prepare("
                UPDATE inventory
                SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?, batch_number = ?, received_date = ?
                WHERE product_id = ?
            ");
            $updInv->execute([$totalSacks, $total25, round($totalKg, 2), $total5, $total10, $total20, $latestBatchCode, $latestRecDate, $productId]);

        } else {
            // Standalone inventory table fallback
            if ($unitLower === "sack" || $unitLower === "50kg") {
                if ($qty > $stockSacks) {
                    throw new Exception("Insufficient whole sacks in stock for {$product['product_name']}. Only {$stockSacks} sacks available.");
                }
                $stockSacks -= (int)$qty;
            } elseif ($unitLower === "25kg" || $unitLower === "half_sack" || $unitLower === "half") {
                if ($qty > $p25) {
                    throw new Exception("Insufficient 25kg half sacks in stock for {$product['product_name']}. Only {$p25} available.");
                }
                $p25 -= (int)$qty;
            } elseif ($unitLower === "20kg") {
                if ($qty > $p20) {
                    throw new Exception("Insufficient 20kg sacks in stock for {$product['product_name']}. Only {$p20} available.");
                }
                $p20 -= (int)$qty;
            } elseif ($unitLower === "10kg") {
                if ($qty > $p10) {
                    throw new Exception("Insufficient 10kg sacks in stock for {$product['product_name']}. Only {$p10} available.");
                }
                $p10 -= (int)$qty;
            } elseif ($unitLower === "5kg") {
                if ($qty > $p5) {
                    throw new Exception("Insufficient 5kg sacks in stock for {$product['product_name']}. Only {$p5} available.");
                }
                $p5 -= (int)$qty;
            } else {
                // Tinatakal (loose per kg)
                if ($stockKg >= $qty) {
                    $stockKg -= $qty;
                } else {
                    $neededKg = $qty - $stockKg;
                    $sacksNeeded = (int)ceil($neededKg / 50.0);
                    if ($sacksNeeded > $stockSacks) {
                        $totalKgAvail = $stockKg + ($stockSacks * 50.0);
                        throw new Exception("Insufficient stock for {$product['product_name']}. Only " . number_format($totalKgAvail, 2) . " kg available.");
                    }
                    $stockSacks -= $sacksNeeded;
                    $addedKg = $sacksNeeded * 50.0;
                    $stockKg = ($stockKg + $addedKg) - $qty;

                    $adjStmt = $conn->prepare("
                        INSERT INTO inventory_adjustment
                        (product_id, batch_code, adjustment_date, adjustment_type, sacks, kg, note, performed_by)
                        VALUES (?, ?, NOW(), 'open_sack', ?, ?, ?, ?)
                    ");
                    $adjStmt->execute([
                        $productId,
                        $product['batch_number'] ?? null,
                        $sacksNeeded,
                        $addedKg,
                        "Auto-opened {$sacksNeeded}x Whole Sack (50kg) for {$qty} kg retail sale.",
                        $user["full_name"]
                    ]);
                }
            }

            $updInv = $conn->prepare("
                UPDATE inventory
                SET stock_sacks = ?, packaged_25kg = ?, stock_kg = ?, packaged_5kg = ?, packaged_10kg = ?, packaged_20kg = ?
                WHERE product_id = ?
            ");
            $updInv->execute([$stockSacks, $p25, round($stockKg, 2), $p5, $p10, $p20, $productId]);
        }

        $subtotal = round($unitPrice * $qty, 2);
        $total += $subtotal;

        $processedItems[] = [
            "productId" => $productId,
            "productName" => $product["product_name"],
            "unit" => $unit,
            "qty" => $qty,
            "unitPrice" => $unitPrice,
            "subtotal" => $subtotal
        ];
    }

    if ($paymentReceived < $total) {
        throw new Exception("Payment received (₱" . number_format($paymentReceived, 2) . ") is less than the total sale amount (₱" . number_format($total, 2) . ").");
    }

    $change = round($paymentReceived - $total, 2);

    // Insert completed sales transaction
    $stmt = $conn->prepare("
        INSERT INTO sales_transaction
        (user_id, total_amount, payment_amount, change_amount, payment_method, transaction_status)
        VALUES (?, ?, ?, ?, ?, 'Completed')
    ");

    $stmt->execute([
        $user["user_id"],
        round($total, 2),
        round($paymentReceived, 2),
        $change,
        $paymentMethod
    ]);

    $transactionId = (int)$conn->lastInsertId();

    // Insert transaction line items
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
        "cashierId" => (int)$user["user_id"],
        "cashierUsername" => $user["username"],
        "cashierName" => $user["full_name"],
        "totalAmount" => round($total, 2),
        "paymentReceived" => round($paymentReceived, 2),
        "changeAmount" => $change,
        "paymentMethod" => $paymentMethod,
        "items" => $processedItems
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>