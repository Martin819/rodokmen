<?php
namespace Rodokmen;


class Session
{
	private static $id_field = 'RdkID';

	const defaultName = 'RdkSession';

	public function __construct($name = self::defaultName)
	{
		// FIXME: expire time
		if (!isset($_SESSION))
		{
			\session_name($name);
			\session_start();
		}
	}

	static public function exists($name = self::defaultName)
	{
		\session_name($name);
		return isset($_COOKIE[\session_name()]);
	}

	public function setID($id)
	{
		$_SESSION[self::$id_field] = $id;
	}

	public function getID()
	{
		if (isset($_SESSION[self::$id_field])) return $_SESSION[self::$id_field];
		else return false;
	}

	public function delete()
	{
		unset($_SESSION[self::$id_field]);
	  $params = \session_get_cookie_params();
	  \setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
		\session_destroy();
	}
}
