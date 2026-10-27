<?php

$conn = require '/app/config/database.php';
$conn->query('DELETE FROM Colors');
$conn->query('DELETE FROM Users');
$stmt = $conn->prepare('INSERT INTO Users (ID, firstName, lastName, Login, Password) VALUES (?, ?, ?, ?, ?)');
foreach ([[1, 'Alpha', 'User', 'alpha'], [2, 'Beta', 'User', 'beta'], [3, 'A"\\名', '<b>User</b>', 'quoted']] as [$id, $first, $last, $login]) {
    $hash = password_hash('test-password', PASSWORD_BCRYPT);
    $stmt->bind_param('issss', $id, $first, $last, $login, $hash);
    $stmt->execute();
}
$conn->query("INSERT INTO Colors (UserId, Name) VALUES (1, 'red'), (2, 'blue')");

session_name('colors_session');
session_id('colors-expired-test');
session_start();
$_SESSION = ['user' => ['id' => 1, 'firstName' => 'Alpha', 'lastName' => 'User'], 'expiresAt' => time() - 1];
session_write_close();
