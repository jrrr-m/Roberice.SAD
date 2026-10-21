<?php
header("Content-Type: application/json; charset=UTF-8");
require_once "db.php";

$method = $_SERVER["REQUEST_METHOD"];

// Helper function to authenticate admin by password
function authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword) {
    if ($adminPassword === "") {
        return ["authenticated" => false, "message" => "Administrator password is required."];
    }

    $admin = null;
    if ($adminUserId > 0) {
        $stmt = $conn->prepare("SELECT user_id, username, password, full_name, role, account_status FROM users WHERE user_id = ? AND role = 'Admin' LIMIT 1");
        $stmt->execute([$adminUserId]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    } elseif ($adminUsername !== "") {
        $stmt = $conn->prepare("SELECT user_id, username, password, full_name, role, account_status FROM users WHERE username = ? AND role = 'Admin' LIMIT 1");
        $stmt->execute([$adminUsername]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$admin) {
        // Fallback: Check primary admin account
        $stmt = $conn->prepare("SELECT user_id, username, password, full_name, role, account_status FROM users WHERE user_id = 1 AND role = 'Admin' LIMIT 1");
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$admin || strtolower($admin["account_status"] ?? "") !== "active") {
        return ["authenticated" => false, "message" => "Active administrator account not found or unauthorized."];
    }

    $valid = false;
    if (password_verify($adminPassword, $admin["password"])) {
        $valid = true;
    } elseif (hash_equals($admin["password"], $adminPassword)) {
        $valid = true;
        // Upgrade plaintext hash if legacy
        $newHash = password_hash($adminPassword, PASSWORD_DEFAULT);
        $upd = $conn->prepare("UPDATE users SET password = ? WHERE user_id = ?");
        $upd->execute([$newHash, $admin["user_id"]]);
    }

    if (!$valid) {
        return ["authenticated" => false, "message" => "Authentication failed: Incorrect administrator password."];
    }

    return ["authenticated" => true, "admin" => $admin];
}

// GET: Retrieve list of users, sync single user, or list account creation requests
if ($method === "GET") {
    // 1. Check if requesting account requests list
    if (isset($_GET["requests"]) || (isset($_GET["action"]) && $_GET["action"] === "get_requests")) {
        try {
            $reqSql = "
                SELECT 
                    r.request_id, 
                    r.full_name, 
                    r.username, 
                    r.email, 
                    r.role, 
                    r.status, 
                    r.rejection_reason, 
                    r.created_at, 
                    r.reviewed_at, 
                    r.reviewed_by, 
                    u.full_name AS reviewer_name,
                    u.username AS reviewer_username
                FROM account_requests r
                LEFT JOIN users u ON r.reviewed_by = u.user_id
                ORDER BY CASE WHEN r.status = 'Pending' THEN 1 ELSE 2 END, r.created_at DESC
            ";
            $reqStmt = $conn->query($reqSql);
            $requests = $reqStmt->fetchAll(PDO::FETCH_ASSOC);

            $pendingCount = 0;
            foreach ($requests as $r) {
                if ($r["status"] === "Pending") {
                    $pendingCount++;
                }
            }

            echo json_encode([
                "success" => true,
                "requests" => $requests,
                "pending_count" => $pendingCount
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error loading requests: " . $e->getMessage()]);
            exit;
        }
    }

    // 2. Sync single user info
    $syncUserId = isset($_GET["sync_user_id"]) ? (int)$_GET["sync_user_id"] : 0;
    if ($syncUserId > 0) {
        try {
            $stmt = $conn->prepare("SELECT user_id, username, full_name, email, role, account_status, permissions FROM users WHERE user_id = ? LIMIT 1");
            $stmt->execute([$syncUserId]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($u) {
                $perms = [];
                if (!empty($u["permissions"])) {
                    $decoded = json_decode($u["permissions"], true);
                    if (is_array($decoded)) {
                        $perms = array_values($decoded);
                    }
                }
                if (empty($perms)) {
                    if (strtolower(trim($u["role"])) === 'admin') {
                        $perms = ['dashboard', 'pos', 'view-inventory', 'inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit', 'users'];
                    } else {
                        $perms = ['pos', 'view-inventory', 'transactions', 'sales-report'];
                    }
                }
                echo json_encode([
                    "success" => true,
                    "user" => [
                        "id" => (string)$u["user_id"],
                        "username" => $u["username"],
                        "name" => $u["full_name"],
                        "email" => $u["email"] ?? "",
                        "role" => strtolower(trim($u["role"] ?? "cashier")),
                        "status" => strtolower(trim($u["account_status"] ?? "active")),
                        "permissions" => $perms
                    ]
                ]);
                exit;
            }
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            exit;
        }
    }

    // 3. Default: List all system users + pending account requests count
    try {
        $sql = "
            SELECT 
                u.user_id, 
                u.username, 
                u.full_name, 
                u.email,
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
                "email" => $u["email"] ?? "",
                "role" => $u["role"],
                "account_status" => $u["account_status"] ?: "Active",
                "permissions" => $perms,
                "transaction_count" => (int)$u["transaction_count"]
            ];
        }

        // Count pending account requests
        $pendingRequestsCount = 0;
        try {
            $pendingRequestsCount = (int)$conn->query("SELECT COUNT(*) FROM account_requests WHERE status = 'Pending'")->fetchColumn();
        } catch (Exception $ex) {
            // Table might not exist yet if uninitialized
        }

        // Fetch custom roles
        $customRoles = [];
        try {
            $crStmt = $conn->query("SELECT role_id, role_name, default_permissions, created_at FROM custom_roles ORDER BY role_name ASC");
            $crRows = $crStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($crRows as $cr) {
                $decodedPerms = [];
                if (!empty($cr["default_permissions"])) {
                    $dp = json_decode($cr["default_permissions"], true);
                    if (is_array($dp)) $decodedPerms = $dp;
                }
                $customRoles[] = [
                    "role_id" => (int)$cr["role_id"],
                    "role_name" => $cr["role_name"],
                    "default_permissions" => $decodedPerms,
                    "created_at" => $cr["created_at"]
                ];
            }
        } catch (Exception $ex) {}

        echo json_encode([
            "success" => true,
            "users" => $result,
            "custom_roles" => $customRoles,
            "pending_requests_count" => $pendingRequestsCount
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

// POST: Actions (create, update, toggle_status, delete, get_requests, approve_request, reject_request, delete_request)
if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = $_POST;
    }
    $data = $input;

    $action = trim($data["action"] ?? "");

    // ---------------------------------------------------------
    // ACTION: Create User (Admin directly creates)
    // ---------------------------------------------------------
    if ($action === "create") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $username = trim($data["username"] ?? "");
        $password = trim($data["password"] ?? "");
        $fullName = trim($data["full_name"] ?? "");
        $email    = trim($data["email"] ?? "");
        $role     = trim($data["role"] ?? "Cashier");
        $status   = trim($data["account_status"] ?? "Active");
        $permissions = $data["permissions"] ?? [];

        if ($username === "" || $password === "" || $fullName === "") {
            echo json_encode([
                "success" => false,
                "message" => "Username, password, and full name are required."
            ]);
            exit;
        }

        if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode([
                "success" => false,
                "message" => "Please enter a valid email address."
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

        // Validate email uniqueness if provided
        if ($email !== "") {
            $checkEmail = $conn->prepare("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
            $checkEmail->execute([$email]);
            if ($checkEmail->fetch()) {
                echo json_encode([
                    "success" => false,
                    "message" => "Email address '{$email}' is already in use by another user."
                ]);
                exit;
            }
        }

        if (is_string($permissions)) {
            $decoded = json_decode($permissions, true);
            $permissions = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($permissions)) {
            $permissions = [];
        }
        $permsJson = json_encode(array_values(array_unique($permissions)));
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $conn->prepare("
                INSERT INTO users (username, password, full_name, email, role, account_status, permissions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $username,
                $hashedPassword,
                $fullName,
                $email ?: null,
                $role,
                $status,
                $permsJson
            ]);

            $newId = $conn->lastInsertId();

            // Auto-register custom role if not standard built-in
            $builtInRoles = ["admin", "administrator", "cashier", "store manager", "inventory clerk"];
            if (!in_array(strtolower($role), $builtInRoles, true)) {
                try {
                    $crChk = $conn->prepare("SELECT role_id FROM custom_roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1");
                    $crChk->execute([$role]);
                    if (!$crChk->fetch()) {
                        $insCr = $conn->prepare("INSERT INTO custom_roles (role_name, default_permissions, created_at) VALUES (?, ?, NOW())");
                        $insCr->execute([$role, $permsJson]);
                    }
                } catch (Exception $ex) {}
            }

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

    // ---------------------------------------------------------
    // ACTION: Update User
    // ---------------------------------------------------------
    if ($action === "update") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $userId   = (int)($data["user_id"] ?? 0);
        $username = trim($data["username"] ?? "");
        $password = trim($data["password"] ?? "");
        $fullName = trim($data["full_name"] ?? "");
        $email    = trim($data["email"] ?? "");
        $role     = trim($data["role"] ?? "Cashier");
        $status   = trim($data["account_status"] ?? "Active");
        $permissions = $data["permissions"] ?? [];

        if ($userId === 1) {
            $role = "Admin";
            $status = "Active";
        }

        if ($userId <= 0 || $username === "" || $fullName === "") {
            echo json_encode([
                "success" => false,
                "message" => "Valid user ID, username, and full name are required."
            ]);
            exit;
        }

        if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode([
                "success" => false,
                "message" => "Please enter a valid email address."
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

        // Validate email uniqueness against other users
        if ($email !== "") {
            $checkEmail = $conn->prepare("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND user_id != ? LIMIT 1");
            $checkEmail->execute([$email, $userId]);
            if ($checkEmail->fetch()) {
                echo json_encode([
                    "success" => false,
                    "message" => "Email address '{$email}' is already in use by another user."
                ]);
                exit;
            }
        }

        if (is_string($permissions)) {
            $decoded = json_decode($permissions, true);
            $permissions = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($permissions)) {
            $permissions = [];
        }
        $permsJson = json_encode(array_values(array_unique($permissions)));

        try {
            if ($password !== "") {
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("
                    UPDATE users 
                    SET username = ?, password = ?, full_name = ?, email = ?, role = ?, account_status = ?, permissions = ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$username, $hashed, $fullName, $email ?: null, $role, $status, $permsJson, $userId]);
            } else {
                $stmt = $conn->prepare("
                    UPDATE users 
                    SET username = ?, full_name = ?, email = ?, role = ?, account_status = ?, permissions = ?
                    WHERE user_id = ?
                ");
                $stmt->execute([$username, $fullName, $email ?: null, $role, $status, $permsJson, $userId]);
            }

            // Auto-register custom role if not standard built-in
            $builtInRoles = ["admin", "administrator", "cashier", "store manager", "inventory clerk"];
            if (!in_array(strtolower($role), $builtInRoles, true)) {
                try {
                    $crChk = $conn->prepare("SELECT role_id FROM custom_roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1");
                    $crChk->execute([$role]);
                    if (!$crChk->fetch()) {
                        $insCr = $conn->prepare("INSERT INTO custom_roles (role_name, default_permissions, created_at) VALUES (?, ?, NOW())");
                        $insCr->execute([$role, $permsJson]);
                    }
                } catch (Exception $ex) {}
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

    // ---------------------------------------------------------
    // ACTION: Toggle Status
    // ---------------------------------------------------------
    if ($action === "toggle_status") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $userId = (int)($data["user_id"] ?? 0);
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

    // ---------------------------------------------------------
    // ACTION: Delete User
    // ---------------------------------------------------------
    if ($action === "delete") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $userId = (int)($data["user_id"] ?? 0);
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

    // ---------------------------------------------------------
    // ACTION: Get Account Requests (POST variant)
    // ---------------------------------------------------------
    if ($action === "get_requests") {
        try {
            $reqSql = "
                SELECT 
                    r.request_id, 
                    r.full_name, 
                    r.username, 
                    r.email, 
                    r.role, 
                    r.status, 
                    r.rejection_reason, 
                    r.created_at, 
                    r.reviewed_at, 
                    r.reviewed_by, 
                    u.full_name AS reviewer_name,
                    u.username AS reviewer_username
                FROM account_requests r
                LEFT JOIN users u ON r.reviewed_by = u.user_id
                ORDER BY CASE WHEN r.status = 'Pending' THEN 1 ELSE 2 END, r.created_at DESC
            ";
            $reqStmt = $conn->query($reqSql);
            $requests = $reqStmt->fetchAll(PDO::FETCH_ASSOC);

            $pendingCount = 0;
            foreach ($requests as $r) {
                if ($r["status"] === "Pending") {
                    $pendingCount++;
                }
            }

            echo json_encode([
                "success" => true,
                "requests" => $requests,
                "pending_count" => $pendingCount
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // ACTION: Approve Request (Requires Admin Password Auth)
    // ---------------------------------------------------------
    if ($action === "approve_request") {
        $requestId     = (int)($data["request_id"] ?? 0);
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");
        $roleOverride  = trim($data["role"] ?? "");
        $permOverride  = $data["permissions"] ?? null;

        if ($requestId <= 0) {
            echo json_encode(["success" => false, "message" => "Valid account request ID is required."]);
            exit;
        }

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }
        $admin = $auth["admin"];

        try {
            // Find request
            $rStmt = $conn->prepare("SELECT * FROM account_requests WHERE request_id = ? LIMIT 1");
            $rStmt->execute([$requestId]);
            $req = $rStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                echo json_encode(["success" => false, "message" => "Account request #{$requestId} not found."]);
                exit;
            }

            if ($req["status"] !== "Pending") {
                echo json_encode(["success" => false, "message" => "This account request is already {$req['status']}."]);
                exit;
            }

            // Verify username not already registered
            $uCheck = $conn->prepare("SELECT user_id FROM users WHERE username = ? LIMIT 1");
            $uCheck->execute([$req["username"]]);
            if ($uCheck->fetch()) {
                echo json_encode(["success" => false, "message" => "Cannot approve: username '{$req['username']}' is already in use by an active system user."]);
                exit;
            }

            // Verify email not already registered
            if (!empty($req["email"])) {
                $eCheck = $conn->prepare("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
                $eCheck->execute([$req["email"]]);
                if ($eCheck->fetch()) {
                    echo json_encode(["success" => false, "message" => "Cannot approve: email '{$req['email']}' is already registered to another user account."]);
                    exit;
                }
            }

            // Determine final role and module permissions
            $assignedRole = $roleOverride ?: $req["role"] ?: "Cashier";
            $perms = $permOverride;

            if (empty($perms) || !is_array($perms)) {
                $roleLower = strtolower($assignedRole);
                if ($roleLower === 'admin') {
                    $perms = ['dashboard', 'pos', 'view-inventory', 'inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit', 'users'];
                } elseif ($roleLower === 'store manager') {
                    $perms = ['dashboard', 'pos', 'view-inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit'];
                } elseif ($roleLower === 'inventory clerk') {
                    $perms = ['view-inventory', 'inventory', 'products'];
                } else {
                    $perms = ['pos', 'view-inventory', 'transactions', 'sales-report'];
                }
            }
            $permsJson = json_encode(array_values(array_unique($perms)));

            // Execute atomic creation & status update
            $conn->beginTransaction();

            $insertStmt = $conn->prepare("
                INSERT INTO users (username, password, full_name, email, role, account_status, permissions)
                VALUES (?, ?, ?, ?, ?, 'Active', ?)
            ");
            $insertStmt->execute([
                $req["username"],
                $req["password"], // Already hashed with password_hash() at registration
                $req["full_name"],
                $req["email"],
                $assignedRole,
                $permsJson
            ]);
            $newUserId = (int)$conn->lastInsertId();

            $updateReqStmt = $conn->prepare("
                UPDATE account_requests 
                SET status = 'Approved', reviewed_at = NOW(), reviewed_by = ?
                WHERE request_id = ?
            ");
            $updateReqStmt->execute([$admin["user_id"], $requestId]);

            $conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Account for '{$req['full_name']}' (@{$req['username']}) has been successfully approved and activated. They can now log in.",
                "user_id" => $newUserId
            ]);
            exit;

        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            echo json_encode([
                "success" => false,
                "message" => "Error approving account request: " . $e->getMessage()
            ]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // ACTION: Reject Request (Requires Admin Password Auth)
    // ---------------------------------------------------------
    if ($action === "reject_request") {
        $requestId       = (int)($data["request_id"] ?? 0);
        $adminPassword   = (string)($data["admin_password"] ?? "");
        $adminUserId     = (int)($data["admin_user_id"] ?? 0);
        $adminUsername   = trim($data["admin_username"] ?? "");
        $rejectionReason = trim($data["rejection_reason"] ?? "Declined by administrator");

        if ($requestId <= 0) {
            echo json_encode(["success" => false, "message" => "Valid account request ID is required."]);
            exit;
        }

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }
        $admin = $auth["admin"];

        try {
            $rStmt = $conn->prepare("SELECT * FROM account_requests WHERE request_id = ? LIMIT 1");
            $rStmt->execute([$requestId]);
            $req = $rStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                echo json_encode(["success" => false, "message" => "Account request #{$requestId} not found."]);
                exit;
            }

            if ($req["status"] !== "Pending") {
                echo json_encode(["success" => false, "message" => "This account request is already {$req['status']}."]);
                exit;
            }

            $updateReqStmt = $conn->prepare("
                UPDATE account_requests 
                SET status = 'Rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?
                WHERE request_id = ?
            ");
            $updateReqStmt->execute([$rejectionReason, $admin["user_id"], $requestId]);

            echo json_encode([
                "success" => true,
                "message" => "Account registration request for '{$req['full_name']}' has been rejected."
            ]);
            exit;

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error rejecting request: " . $e->getMessage()]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // ACTION: Delete Request Record (From history)
    // ---------------------------------------------------------
    if ($action === "delete_request") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $requestId = (int)($data["request_id"] ?? 0);
        if ($requestId <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid request ID."]);
            exit;
        }

        try {
            $delStmt = $conn->prepare("DELETE FROM account_requests WHERE request_id = ?");
            $delStmt->execute([$requestId]);

            echo json_encode([
                "success" => true,
                "message" => "Account request record removed."
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error deleting request: " . $e->getMessage()]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // ACTION: Create Custom Role (Requires Admin Password)
    // ---------------------------------------------------------
    if ($action === "create_role") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $roleName = trim($data["role_name"] ?? "");
        $permissions = $data["permissions"] ?? [];

        if ($roleName === "" || mb_strlen($roleName) < 2) {
            echo json_encode(["success" => false, "message" => "Role name must be at least 2 characters long."]);
            exit;
        }

        if (mb_strlen($roleName) > 50) {
            echo json_encode(["success" => false, "message" => "Role name cannot exceed 50 characters."]);
            exit;
        }

        $builtIn = ["admin", "administrator", "cashier", "store manager", "inventory clerk"];
        if (in_array(strtolower($roleName), $builtIn, true)) {
            echo json_encode(["success" => false, "message" => "'{$roleName}' is already a standard built-in system role."]);
            exit;
        }

        // Check if role name already exists in custom_roles
        $crCheck = $conn->prepare("SELECT role_id FROM custom_roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1");
        $crCheck->execute([$roleName]);
        if ($crCheck->fetch()) {
            echo json_encode(["success" => false, "message" => "A custom role named '{$roleName}' already exists."]);
            exit;
        }

        if (is_string($permissions)) {
            $decoded = json_decode($permissions, true);
            $permissions = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($permissions)) {
            $permissions = [];
        }
        $permsJson = json_encode(array_values(array_unique($permissions)));

        try {
            $ins = $conn->prepare("INSERT INTO custom_roles (role_name, default_permissions, created_at) VALUES (?, ?, NOW())");
            $ins->execute([$roleName, $permsJson]);
            $roleId = (int)$conn->lastInsertId();

            echo json_encode([
                "success" => true,
                "message" => "Custom role '{$roleName}' created successfully.",
                "role_id" => $roleId,
                "role_name" => $roleName,
                "permissions" => $permissions
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error creating custom role: " . $e->getMessage()]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // ACTION: Delete Custom Role (Requires Admin Password)
    // ---------------------------------------------------------
    if ($action === "delete_role") {
        $adminPassword = (string)($data["admin_password"] ?? "");
        $adminUserId   = (int)($data["admin_user_id"] ?? 0);
        $adminUsername = trim($data["admin_username"] ?? "");

        // Authenticate Administrator via Password
        $auth = authenticateAdmin($conn, $adminUserId, $adminUsername, $adminPassword);
        if (!$auth["authenticated"]) {
            echo json_encode(["success" => false, "message" => $auth["message"]]);
            exit;
        }

        $roleId = (int)($data["role_id"] ?? 0);
        $roleName = trim($data["role_name"] ?? "");

        if ($roleId <= 0 && $roleName === "") {
            echo json_encode(["success" => false, "message" => "Valid role ID or role name is required."]);
            exit;
        }

        // Find role
        if ($roleId > 0) {
            $rStmt = $conn->prepare("SELECT role_id, role_name FROM custom_roles WHERE role_id = ? LIMIT 1");
            $rStmt->execute([$roleId]);
        } else {
            $rStmt = $conn->prepare("SELECT role_id, role_name FROM custom_roles WHERE role_name = ? LIMIT 1");
            $rStmt->execute([$roleName]);
        }
        $role = $rStmt->fetch(PDO::FETCH_ASSOC);

        if (!$role) {
            echo json_encode(["success" => false, "message" => "Custom role not found."]);
            exit;
        }

        // Check if any user in users table currently has this role
        $uCheck = $conn->prepare("SELECT COUNT(*) FROM users WHERE LOWER(role) = LOWER(?)");
        $uCheck->execute([$role["role_name"]]);
        $assignedCount = (int)$uCheck->fetchColumn();

        if ($assignedCount > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Cannot delete custom role '{$role['role_name']}' because {$assignedCount} user account(s) are currently assigned to it. Please reassign those users first."
            ]);
            exit;
        }

        try {
            $del = $conn->prepare("DELETE FROM custom_roles WHERE role_id = ?");
            $del->execute([$role["role_id"]]);

            echo json_encode([
                "success" => true,
                "message" => "Custom role '{$role['role_name']}' removed successfully."
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Error deleting custom role: " . $e->getMessage()]);
            exit;
        }
    }

    echo json_encode(["success" => false, "message" => "Invalid action specified."]);
    exit;
}

echo json_encode(["success" => false, "message" => "Unsupported request method."]);
?>
