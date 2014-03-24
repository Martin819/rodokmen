<?php
namespace Rodokmen;
use \R;


class Relation extends Pod
{
	public function __construct() { parent::__construct('relation'); }

	public function relate($person, $marriage, $role)
	{
		if (($role != 'parent') && ($role != 'child')) return false;
		// FIXME: check existing!
		$bean = $this->setupNew();
		$bean->person = $person;
		$bean->marriage = $marriage;
		$bean->role = $role;
		return $bean;
	}
}

class ModelRelation extends \RedBean_SimpleModel
{
	public function cyEdge()
	{
		$b = $this->bean;
		switch ($b->role)
		{
			case 'parent': return array('data' => array('source' => $b->person->cyId(), 'target' => $b->marriage->cyId()));
			case 'child': return array('data' => array('source' => $b->marriage->cyId(), 'target' => $b->person->cyId()));
			default: return false;
		}
	}
}
