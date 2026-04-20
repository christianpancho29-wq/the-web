<?php

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');


$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'polyshift_db';

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed: ' . $conn->connect_error]);
    exit;
}
$conn->set_charset('utf8mb4');


$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? $_GET['action'] ?? '';


switch ($action) {
    case 'signup':
        $fullname = trim($input['fullname'] ?? '');
        $username = trim($input['username'] ?? '');
        $email    = trim($input['email']    ?? '');
        $password = $input['password']      ?? '';

        if (!$fullname || !$username || !$email || !$password) {
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            break;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
            break;
        }
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
            break;
        }

        
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param('ss', $username, $email);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Username or email already taken.']);
            $stmt->close();
            break;
        }
        $stmt->close();

        
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (fullname, username, email, password) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('ssss', $fullname, $username, $email, $hashed);
        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $_SESSION['user_id']   = $newId;
            $_SESSION['username']  = $username;
            $_SESSION['fullname']  = $fullname;
            echo json_encode(['success' => true, 'username' => $username, 'fullname' => $fullname]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Signup failed: ' . $conn->error]);
        }
        $stmt->close();
        break;

    
    case 'login':
        $username = trim($input['username'] ?? '');
        $password = $input['password']      ?? '';

        if (!$username || !$password) {
            echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
            break;
        }

        $stmt = $conn->prepare("SELECT id, fullname, username, password FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param('ss', $username, $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $user   = $result->fetch_assoc();
        $stmt->close();

        if (!$user || !password_verify($password, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Incorrect username or password.']);
            break;
        }

        $_SESSION['user_id']  = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['fullname'] = $user['fullname'];
        echo json_encode(['success' => true, 'username' => $user['username'], 'fullname' => $user['fullname']]);
        break;

    
    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    
    case 'check_session':
        if (!empty($_SESSION['user_id'])) {
            echo json_encode(['success' => true, 'loggedIn' => true, 'username' => $_SESSION['username'], 'fullname' => $_SESSION['fullname']]);
        } else {
            echo json_encode(['success' => true, 'loggedIn' => false]);
        }
        break;

    
    case 'save':
        if (empty($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'You must be logged in to save records.']);
            break;
        }
        $user_id     = $_SESSION['user_id'];
        $type        = $conn->real_escape_string($input['type']    ?? '');
        $label       = $conn->real_escape_string($input['label']   ?? 'Untitled');
        $input_text  = $conn->real_escape_string($input['input']   ?? '');
        $output_text = $conn->real_escape_string($input['output']  ?? '');
        $enc_key     = $conn->real_escape_string($input['enc_key'] ?? '');
        $shift       = intval($input['shift'] ?? 0);

        $sql = "INSERT INTO records (user_id, type, label, input_text, output_text, enc_key, shift, created_at)
                VALUES ($user_id, '$type', '$label', '$input_text', '$output_text', '$enc_key', $shift, NOW())";

        if ($conn->query($sql)) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            echo json_encode(['success' => false, 'message' => $conn->error]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Unknown action.']);
        break;
}

$conn->close();
?>
