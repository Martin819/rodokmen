<?php
namespace Rodokmen;
use \R;


class Person extends Pod
{
	public function __construct() { parent::__construct('person'); }
}

class ModelPerson extends \RedBean_SimpleModel
{
	public static function listPersons($persons)
	{
		$ret = array();
		foreach ($persons as $p) $ret[] = array('dname' => $p->displayName(), 'cyid' => $p->cyId());
		return $ret;
	}

	public function dispense() { $this->bean->via('relation'); }
	public function open() { $this->bean->via('relation'); }

	public function name()
	{
		return \array_values($this->bean->xownNameList);
	}

	public function displayName($sep = ' ')
	{
		$n = $this->name()[0];
		return $n->first.$sep.$n->last;
	}

	public function parentMarriage()
	{
		$m = $this->bean->withCondition('relation.role = ?', array('child'))->sharedMarriageList;
		return \reset($m);
	}

	public function parents()
	{
		$m = $this->parentMarriage();
		if (!$m) return array();
		else return $m->spouses();
	}

	public function marriages()
	{
		$ms = $this->bean->withCondition('relation.role = ?', array('parent'))->sharedMarriageList;
		return \array_values($ms);
	}

	public function children()
	{
		$ret = array();
		$ms = $this->marriages();
		foreach ($ms as $m) $ret = \array_merge($ret, $m->children());
		return $ret;
	}

	public function cyId()
	{
		return 'p'.$this->bean->id;
	}

	public function cyNode()
	{
		return array(
			'data' => array(
				'id' => $this->cyId(),
				'name' => $this->displayName("\n"),
				'oid' => $this->bean->id),
			'classes' => 'p'
		);
	}

	public function sidebarData()
	{
		$pm = $this->parentMarriage();

		$ret = array(
			'parentMarriage' => $pm ? $pm->cyId() : '',
			'parents' => self::listPersons($this->parents()),
			'children' => self::listPersons($this->children()),
			'dname' => $this->displayName()
		);

		return $ret;
	}
}
