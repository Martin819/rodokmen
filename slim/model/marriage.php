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


	public function relations($role = false)
	{
		if ($role) $ret = $this->bean->withCondition('relation.role = ?', array($role))->ownRelationList;
		else $ret = $this->bean->ownRelationList;
		return \array_values($ret);
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

	public function wouldBeDeletedAlong($pOrigin = false)
	{
		// If this marriage can be deleted, returns an array of persons (beans) which would be deleted along with this marriage
		// otherwise an empty array

		$sps = $this->spouses();
		$cnns = count($this->children());
		$ret = array();
		$origin_added = false;
		foreach ($sps as $sp)
		{
			$n = 0;
			if ($sp->parentMarriage()) $n++;
			$n += count($sp->marriages()) - 1;           // The count will always be at least 1
			if ($n == 0)
			{
				$ret[] = $sp;                              // If spouse is a leaf node, it can be deleted
				if ($pOrigin && $sp->id == $pOrigin) $origin_added = true;
			}
			else $cnns += $n;
		}

		// $cnns is a number of connections of this m and both spouses, except the ones from spouses to this m
		// If the number of connections is > 1 this m can't be deleted as the tree might become discontinuous
		if ($cnns > 1) return array();

		// This request might originate from a person. If they cannot be deleted, don't delete anything
		if ($pOrigin && !$origin_added) return array();

		// All is well, return the list
		return $ret;
	}

	public function canBeDeleted($pOrigin = false)
	{
		$ret = $this->wouldBeDeletedAlong($pOrigin);
		\array_walk($ret, function(&$p, $i) { $p = $p->linkData(); });
		return $ret;
	}

	public function deleteBeans($pOrigin = false)
	{
		// Returns beans to delete along with deletion of this bean
		$along = $this->wouldBeDeletedAlong($pOrigin);
		if (empty($along)) return array();   // This m can't be deleted

		$ret = array();
		foreach ($along as $p) $ret = array_merge($ret, $p->ownBeans());
		$ret[] = $this->bean;
		return $ret;
	}

}
