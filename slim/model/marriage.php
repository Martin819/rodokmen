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

	public function spouseTo($to)
	{
		$s = $this->spouses();
		return $s[0]->id != $to->id ? $s[0] : $s[1];
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

	public function infoData()
	{
		return array( 'id' => $this->bean->id );
	}

	public function sidebarData()
	{
		$ret = array(
			'm' => $this->infoData(),
			'spouses'  => ModelPerson::makeLinks($this->spouses()),
			'children' => ModelPerson::makeLinks($this->children())
		);

		return $ret;
	}
}
