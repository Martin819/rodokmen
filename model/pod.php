<?php
namespace Rodokmen;
use \R;


class Pod
{
	// Produces beans, duh...

	protected $name;
	protected $db;

	protected function __construct($name, $db = Db::data)
	{
		$this->name = $name;
		$this->db = $db;
	}

	protected function dbSelect()
	{
		DB::select($this->db);
	}

	public function store($bean)
	{
		$this->dbSelect();
		R::store($bean);
	}

	public function fromId($id)
	{
		$this->dbSelect();
		$bean = R::load($this->name, $id);
		return $bean->id ? $bean : false;
	}

	public function findAll()
	{
		$this->dbSelect();
		return R::findAll($this->name);
	}

	public function setupNew()
	{
		$this->dbSelect();
		$bean = R::dispense($this->name);
		return $bean;
	}
}
