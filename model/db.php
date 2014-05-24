<?php
namespace Rodokmen;
use \R;

function strEndsWith($str, $with)
{
	return substr_compare($str, $with, -strlen($with), strlen($with)) === 0;
}

abstract class Db
{
	const auth = 'auth';
	const data = 'data';

	static private function check_sqlite($db)
	{
		if (strEndsWith($db, '.sqlite'))
		{
			// NOTE: if the sqlite file doesn't exist, it will be created
			return 'sqlite:'.__DIR__.'/'.$db;
		}
		else return $db;
	}

	static public function setup($dbAuth, $dbData, $frozen)
	{
		R::setup();
		$dbAuth = self::check_sqlite($dbAuth);
		$dbData = self::check_sqlite($dbData);
		R::addDatabase(self::auth, $dbAuth, NULL, NULL, $frozen); // FIXME: uri, username & pw from config
		R::addDatabase(self::data, $dbData, NULL, NULL, $frozen);
	}

	static public function transaction($dbname, $function)
	{
		self::select($dbname);
		R::begin();
		try
		{
			$response = $function();
			R::commit();
			if (\is_array($response))
			{
				$cb = \array_shift($response);
				\JSCB\Callback::sendCb($cb, $response);
			}
		}
		catch(\Exception $e)
		{
			R::rollback();
			if ($e instanceof \JSCB\ValidationError)
			{
				$e->callback()->send();
			}
			else throw $e;
		}
	}

	static public function close() { R::close(); }

	static public function select($db) { R::selectDatabase($db); }
	static public function useAuth() { self::select(self::auth); }
	static public function useData() { self::select(self::data); }
}
