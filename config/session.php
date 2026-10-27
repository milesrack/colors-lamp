<?php

function requireJsonPost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        http_response_code(405);
        header('Content-Type: application/json');
        echo '{"error":"Method not allowed"}';
        exit;
    }

    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        http_response_code(415);
        header('Content-Type: application/json');
        echo '{"error":"Content-Type must be application/json"}';
        exit;
    }
}

function startSession(): void
{
    session_name('colors_session');
    session_set_cookie_params([
        'lifetime' => 1200,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    if (!session_start(['use_strict_mode' => 1, 'use_only_cookies' => 1])) {
        throw new RuntimeException('Unable to start session');
    }
    header('Cache-Control: no-store');
}

function destroySession(): void
{
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $params['path'],
        'secure' => $params['secure'],
        'httponly' => true,
        'samesite' => $params['samesite'],
    ]);
    session_destroy();
}

function requireUser(): array
{
    if (!isset($_SESSION['user'], $_SESSION['expiresAt']) || $_SESSION['expiresAt'] <= time()) {
        destroySession();
        http_response_code(401);
        header('Content-Type: application/json');
        echo '{"error":"Authentication required"}';
        exit;
    }
    return $_SESSION['user'];
}
