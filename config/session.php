<?php

function requireJsonPost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        sendJson(['error' => 'Method not allowed'], 405);
    }

    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        sendJson(['error' => 'Content-Type must be application/json'], 415);
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
        sendJson(['error' => 'Authentication required'], 401);
    }
    return $_SESSION['user'];
}
