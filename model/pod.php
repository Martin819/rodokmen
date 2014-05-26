<?php
namespace Rodokmen;
use \R;
use \JSCB\ValidationError;
use \Valitron\Validator;


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

	public function trash($bean)
	{
		$this->dbSelect();
		R::trash($bean);
	}

	public function fromId($id)
	{
		$this->dbSelect();
		$bean = R::load($this->name, $id);
		return $bean->id ? $bean : false;
	}

	public function fromIds(array $ids)
	{
		$this->dbSelect();
		return R::loadAll($this->name, $ids);
	}

	public function findAll($query = '')
	{
		$this->dbSelect();
		return R::findAll($this->name, $query);
	}

	public function setupNew()
	{
		$this->dbSelect();
		$bean = R::dispense($this->name);
		return $bean;
	}


	static public function validate($input, $rules)
	{
		$v = new Validator($input);

		foreach ($rules as $rule)
		{
			\call_user_func_array(array($v, 'rule'), $rule);
		}

		if (!$v->validate()) throw new ValidationError($v->errors());

		return $v->data();
	}
}


// Additional rules for Valitron:

Validator::addRule('file', function($field, $value, array $params)
{
	if (!\is_array($value) || !\array_key_exists('tmp_name', $value)) return false;
	$tmp_fn = $value['tmp_name'];

	// if (!\is_uploaded_file($tmp_fn)) return false;  // Doesn't work reliably :-/

	if (\array_key_exists(0, $params))
	{
		// Size check
		if (\filesize($tmp_fn) > $params[0]) return false;
	}

	if (\array_key_exists(1, $params))
	{
		// MIME type check
		if (!\in_array(\strtolower($value['type']), $params[1])) return false;
	}

  return true;
}, 'Invalid upload.');

Validator::addRule('eval', function($field, $value, array $params)
{
	return \array_key_exists(0, $params) && ($params[0] === true);
}, '');
