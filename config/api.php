<?php

require_once __DIR__ . '/session.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_exception_handler(function (Throwable $error): void {
    error_log(get_class($error) . ': ' . $error->getMessage());
    sendJson(['error' => 'Unable to process request'], 500);
});

function sendJson(array $body, int $status = 200): never
{
    $json = json_encode($body, JSON_THROW_ON_ERROR);
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo $json;
    exit;
}

function readRequest(): stdClass
{
    $body = file_get_contents('php://input', false, null, 0, 65537);
    if ($body === false) {
        throw new RuntimeException('Unable to read request');
    }
    if (strlen($body) > 65536) {
        sendJson(['error' => 'Request body too large'], 413);
    }
    try {
        $data = json_decode($body, false, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        sendJson(['error' => 'Invalid JSON object'], 400);
    }
    if (!$data instanceof stdClass) {
        sendJson(['error' => 'Invalid JSON object'], 400);
    }
    return $data;
}

function requireString(stdClass $data, string $field, ?int $maxLength = null, bool $allowEmpty = false): string
{
    if (!isset($data->$field) || !is_string($data->$field)) {
        sendJson(['error' => "Invalid $field"], 422);
    }
    $value = $data->$field;
    if ((!$allowEmpty && trim($value) === '') ||
        ($maxLength !== null && preg_match_all('/./us', $value) > $maxLength)) {
        sendJson(['error' => "Invalid $field"], 422);
    }
    return $value;
}

requireJsonPost();
startSession();
