<?php

require_once dirname(__DIR__) . '/config/session.php';
requireJsonPost();
startSession();
$_SESSION = [];

	$inData = getRequestInfo();

	$id = 0;
	$firstName = "";
	$lastName = "";

    $conn = require dirname(__DIR__) . '/config/database.php';
	if( $conn->connect_error )
	{
		returnWithError( $conn->connect_error );
	}
	else
	{
			$stmt = $conn->prepare("SELECT ID,firstName,lastName,Password FROM Users WHERE Login=?");
			$stmt->bind_param("s", $inData["login"]);
			$stmt->execute();
			$result = $stmt->get_result();

			if( $row = $result->fetch_assoc() )
			{
				if( password_verify( $inData["password"], $row["Password"] ) )
				{
					session_regenerate_id(true);
					$_SESSION['user'] = ['id' => $row['ID'], 'firstName' => $row['firstName'], 'lastName' => $row['lastName']];
					$_SESSION['expiresAt'] = time() + 1200;
					returnWithInfo( $row['firstName'], $row['lastName'], $row['ID'] );
				}
				else
				{
					returnWithError("No Records Found");
				}
			}
			else
			{
				returnWithError("No Records Found");
			}

		$stmt->close();
		$conn->close();
	}

	function getRequestInfo()
	{
		return json_decode(file_get_contents('php://input'), true);
	}

	function sendResultInfoAsJson( $obj )
	{
		header('Content-type: application/json');
		echo json_encode($obj, JSON_THROW_ON_ERROR);
	}

	function returnWithError( $err )
	{
		$retValue = ['id' => 0, 'firstName' => '', 'lastName' => '', 'error' => $err];
		sendResultInfoAsJson( $retValue );
	}

	function returnWithInfo( $firstName, $lastName, $id )
	{
		$retValue = ['id' => $id, 'firstName' => $firstName, 'lastName' => $lastName, 'error' => ''];
		sendResultInfoAsJson( $retValue );
	}

?>
