<?php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/[A-Za-z]+\.php$#', $path)) {
    require '/app' . $path;
    return true;
}

$file = '/app/public' . ($path === '/' ? '/index.html' : $path);
if (is_file($file) && str_starts_with(realpath($file), '/app/public/')) {
    $types = ['html' => 'text/html', 'js' => 'text/javascript', 'css' => 'text/css'];
    header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'text/plain'));
    readfile($file);
    return true;
}

http_response_code(404);
