<?php
header("Content-Type: application/json");
require_once "db.php";

$method = $_SERVER["REQUEST_METHOD"];

// GET: Retrieve list of all system users
if ($method === "GET") {
    try {
        $sql = "
            SELECT 
                u.user_id, 
                u.username, 
                u.full_name, 
                u.role, 
                u.account_status, 
                u.permissions,
                (SELECT COUNT(*) FROM sales_transaction t WHERE t.user_id = u.user_id) AS transaction_count
            FROM users u
            ORDER BY u.user_id ASC
        ";
        $stmt = $conn->query($sql);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($users as $u) {
            $perms = [];
            if (!empty($u["permissions"])) {
                $decoded = json_decode($u["permissions"], true);
                if (is_array($decoded)) {
                    $perms = $decoded;
                }
            }
            if (empty($perms)) {
                if (strtolower($u["role"]) === 'admin') {
                    $perms = ['dashboard', 'pos', 'view-inventory', 'inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit', 'users'];
                } else {
                    $perms = ['pos', 'view-inventory', 'transactions', 'sales-report'];
                }
            }

            $result[] = [
                "user_id" => (int)$u["user_id"],
                "username" => $u["username"],
                "full_name" => $u["full_name"],
                "role" => $u["role"],
                "account_status" => $u["account_status"] ?: "Active",
                "permissions" => $perms,
                "transaction_count" => (int)$u["transaction_count"]
            ];
        }

        echo json_encode([
            "success" => true,
            "users" => $result
        ]);
        exit;
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error loading users: " . $e->getMessage()
        ]);
        exit;
    }
}

// POST: Actions (create, update, toggle_status, delete)
if ($method === "POST") {
    // Read JSON payload or form data
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $action = trim($input["action"] ?? "");

    if ($action === "create") {
        $username = trim($input["username"] ?? "");
        $password = trim($input["password"] ?? "");
        $fullName = trim($input["full_name"] ?? "");
        $role = trim($input["role"] ?? "Cashier");
        $status = trim($input["account_status"] ?? "Active");
        $permissions = $input["permissions"] ?? [];

        if ($username === "" || $password === "" || $fullName === "") {
            echo json_encode([
                "success" => false,
                "message" => "Username, password, and full name are required."
            ]);
            exit;
        }

        // Validate username uniqueness
        $checkStmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? LIMIT 1");
        $checkStmt->execute([$username]);
        if ($checkStmt->fetch()) {
            echo json_encode([
                "success" => false,
                "message" => "Username '{$username}' is already taken. Please choose another."
            ]);
            exit;
        }

        // Normalize permissions
        if (!is_array($permissions)) {
            $permissions = [];
        }
        $permsJson = json_encode(array_values(array_unique($permissions)));
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $conn->prepare("
                INSERT INTO users (username, password, full_name, role, account_status, permissions)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $username,
                $hashedPassword,
                $fullName,
                $role,
                $status,
                $permsJson
            ]);

            $newId = $conn->lastInsertId();

            echo json_encode([
                "success" => true,
                "message" => "User account '{$fullName}' created successfully.",
                "user_id" => (int)$newId
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error creating user: " . $e->getMessage()
            ]);
            exit;
        }
    }

    if ($action === "update") {
        $userId = (int)($input["user_id"] ?? 0);
        $username = trim($input["username"] ?? "");
        $password = trim($input["password"] ?? "");
        $fullName = trim($input["full_name"] ?? "");
        $role = trim($input["role"] ?? "Cashier");
        $status = trim($input["account_status"] ?? "Active");
        $permissions = $input["permissions"] ?? [];

        if ($userId <= 0 || $username === "" || $fullName === "") {
            echo json_encode([
                "success" => false,
                "message" => "Valid user ID, username, and full name are required."
            ]);
            exit;
        }

        // Validate username uniqueness against other users
        $checkStmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? AND user_id != ? LIMIT 1");
        $checkStmt->execute([$username, $userId]);
        if ($checkStmt->fetch()) {
            echo json_encode([
                "success" => false,
                "message" => "Username '{$username}' is already in use by another account."
            ]);
            exit;
        }

        // Normalize permissions
        if (!is_array($permissions)) {
            $permissions = [];
        }
        $permsJson = json_encode(array_values(array_unique($permissions)));

        try {
            if ($password !== "") {
                // Update with new password
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("
                    UPDATE users 
                    SET username = ?, password = ?, full_name = ?, role = ?, account_status = ?, permissions = ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$username, $hashed, $fullName, $role, $status, $permsJson, $userId]);
            } else {
                // Update without modifying password
                $stmt = $conn->prepare("
                    UPDATE users 
                    SET username = ?, full_name = ?, role = ?, account_status = ?, permissions = ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$username, $fullName, $role, $status, $permsJson, $userId]);
            }

            echo json_encode([
                "success" => true,
                "message" => "User account '{$fullName}' updated successfully."
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error updating user: " . $e->getMessage()
            ]);
            exit;
        }
    }

    if ($action === "toggle_status") {
        $userId = (int)($input["user_id"] ?? 0);
        if ($userId <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid user ID."]);
            exit;
        }

        if ($userId === 1) {
            echo json_encode([
                "success" => false,
                "message" => "The primary Administrator account cannot be deactivated."
            ]);
            exit;
        }

        try {
            $curStmt = $conn->prepare("SELECT account_status, full_name FROM users WHERE user_id = ?");
            $curStmt->execute([$userId]);
            $user = $curStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                echo json_encode(["success" => false, "message" => "User not found."]);
                exit;
            }

            $newStatus = ($user["account_status"] === "Active") ? "Inactive" : "Active";
            $update = $conn->prepare("UPDATE users SET account_status = ? WHERE user_id = ?");
            $update->execute([$newStatus, $userId]);

            echo json_encode([
                "success" => true,
                "new_status" => $newStatus,
                "message" => "Account for {$user['full_name']} is now {$newStatus}."
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
            exit;
        }
    }

    if ($action === "delete") {
        $userId = (int)($input["user_id"] ?? 0);
        if ($userId <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid user ID."]);
            exit;
        }

        if ($userId === 1) {
            echo json_encode([
                "success" => false,
                "message" => "The primary Administrator account cannot be deleted."
            ]);
            exit;
        }

        try {
            // Check if user has sales transactions
            $txStmt = $conn->prepare("SELECT COUNT(*) FROM sales_transaction WHERE user_id = ?");
            $txStmt->execute([$userId]);
            $count = (int)$txStmt->fetchColumn();

            if ($count > 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "This user has {$count} recorded sales transactions and cannot be deleted to protect audit records. Please deactivate their account instead."
                ]);
                exit;
            }

            $delStmt = $conn->prepare("DELETE FROM users WHERE user_id = ?");
            $delStmt->execute([$userId]);

            echo json_encode([
                "success" => true,
                "message" => "User account deleted successfully."
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
            exit;
        }
    }

    echo json_encode(["success" => false, "message" => "Invalid action specified."]);
    exit;
}

echo json_encode(["success" => false, "message" => "Unsupported request method."]);
?>
