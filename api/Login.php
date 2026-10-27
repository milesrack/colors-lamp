<?php

require_once dirname(__DIR__) . '/config/api.php';
$_SESSION = [];
$data = readRequest();
$login = requireString($data, 'login', 50);
$password = requireString($data, 'password', null, true);
if ($password === '') {
    sendJson(['error' => 'Invalid password'], 422);
}

$conn = require dirname(__DIR__) . '/config/database.php';
$stmt = $conn->prepare('SELECT ID, firstName, lastName, Password FROM Users WHERE Login = ?');
$stmt->bind_param('s', $login);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$row || !password_verify($password, $row['Password'])) {
    sendJson(['error' => 'User/password combination incorrect'], 401);
}

if (!session_regenerate_id(true)) {
    throw new RuntimeException('Unable to rotate session');
}
$_SESSION['user'] = ['id' => $row['ID'], 'firstName' => $row['firstName'], 'lastName' => $row['lastName']];
$_SESSION['expiresAt'] = time() + 1200;
sendJson($_SESSION['user'] + ['error' => '']);
