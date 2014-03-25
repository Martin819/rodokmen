<?php
namespace Rodokmen;
use \R;


class Marriage extends Pod
{
	public function __construct() { parent::__construct('marriage'); }
}

class ModelMarriage extends \RedBean_SimpleModel
{
	public function dispense() { $this->bean->via('relation'); }
	public function open() { $this->bean->via('relation'); }

	public function update()
	{
		// FIXME: check count(parents) is 2
	}

	public function spouses()
	{
		$ret = $this->bean->withCondition('relation.role = ?', array('parent'))->sharedPersonList;
		// TODO: order by sex ? (female first)
		return \array_values($ret);
	}

	public function children()
	{
		$ret = $this->bean->withCondition('relation.role = ?', array('child'))->sharedPersonList;
		return \array_values($ret);
	}

	public function cyId()
	{
		return 'm'.$this->bean->id;
	}

	public function cyNode()
	{
		return array(
			'data' => array(
				'id' => $this->cyId(),
				'oid' => $this->bean->id),
			'classes' => 'm'
		);
	}

	public function sidebarData()
	{
		$sp = $this->spouses();

		$ret = array(
			'spouses'  => ModelPerson::listPersons($this->spouses()),
			'children' => ModelPerson::listPersons($this->children())
		);

		return $ret;
	}
}
