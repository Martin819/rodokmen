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
		R::freeze($frozen);
		$dbAuth = self::check_sqlite($dbAuth);
		$dbData = self::check_sqlite($dbData);
		R::addDatabase(self::auth, $dbAuth); // FIXME: db addresses
		R::addDatabase(self::data, $dbData);
	}

	static public function transaction($dbname, $function)
	{
		self::select($dbname);
		R::transaction($function);
	}

	static public function close() { R::close(); }

	static public function select($db) { R::selectDatabase($db); }
	static public function useAuth() { self::select(self::auth); }
	static public function useData() { self::select(self::data); }
}
