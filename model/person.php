<?php
namespace Rodokmen;
use \R;


class Person extends Pod
{
	public function __construct() { parent::__construct('person'); }

	public function lookup($query)
	{
		// Search persons by name, return json for select2

		$query = '%'.$query.'%';
		$this->dbSelect();
		$beans = R::find('name', 'first LIKE ? OR last LIKE ?', array($query, $query));

		$ret = array();

		foreach ($beans as $bean)
		{
			$ret[] = $bean->person->idName();
		}

		return \json_encode($ret, JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS);
	}
}

class ModelPerson extends \RedBean_SimpleModel
{
	private $_name_new;

	private function set_names($first, $last)
	{
		// For now, only one name is supported
		if (count($this->bean->xownNameList) == 0)
		{
			$name = $this->_name_new;
			$this->bean->xownNameList[] = $name;
		} else
		{
			$name = \reset($this->bean->xownNameList);
		}
		$name->first = $first;
		$name->last  = $last;

		return true;
	}

	private function edit_place($json, $type)
	{
		$place = \reset($this->bean->withCondition('type = ?', array($type))->xownPlaceList);

		if (\array_key_exists('removed', $json) && $json['removed'] === true && $place)
		{
			unset($this->bean->xownPlaceList[$place->id]);
		} else
		{
			$json['type'] = $type;

			if (!$place)
			{
				$pod = new Place();
				$place = $pod->setupNew();
				$place->edit($json);
				$this->bean->xownPlaceList[] = $place;
			}
			else $place->edit($json);
		}
	}

	private function place($type)
	{
		$place = \reset($this->bean->withCondition('type = ?', array($type))->xownPlaceList);
		return $place ? $place->name : '';
	}


	public static function makeLinks($persons)
	{
		$ret = array();
		foreach ($persons as $p) $ret[] = $p->linkData();
		return $ret;
	}

	public function dispense()
	{
		$this->_name_new = R::dispense('name');
		$this->bean->noLoad()->via('relation')->sharedMarriageList;
	}

	public function open()
	{
		$this->bean->noLoad()->via('relation')->sharedMarriageList;
	}


	public function relations($role = false)
	{
		if ($role) $ret = $this->bean->withCondition('relation.role = ?', array($role))->ownRelationList;
		else $ret = $this->bean->ownRelationList;
		return \array_values($ret);
	}

	public function names()
	{
		/* Names TODO:
		 * Names are going to need some serious thought & design. What might be needed:
		 * 1. Past names (incl. birth name, arbitrary number of marriages, etc.)
		 * 2. Middle names
		 * 3. Godfather?
		 * Also don't forget to modify deletion code
		 */

		return \array_values($this->bean->xownNameList);
	}

	public function displayName($sep = ' ')
	{
		$n = $this->names();
		$n = $n[0];  // Compatibility hack
		return $n->first.$sep.$n->last;
	}

	public function idName($value='')
	{
		// Like display name, but year of birth is added for unambigous identification

		$name = $this->displayName();
		$birth = \DateTime::createFromFormat('Y-m-d', $this->birth_date);
		if ($birth) $birth = $birth->format('Y');

		return array(
				'id' => $this->id,
				'name' => $name,
				'birth' => $birth
			);
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

	public function media($shuffle = false)
	{
		$ret = \array_values($this->bean->sharedMediaList);
		if ($shuffle) \shuffle($ret);
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

	public function linkData()
	{
		return array('dname' => $this->displayName(), 'cyid' => $this->cyId());
	}

	public function infoData()
	{
		$names = $this->names();
		$name = array(
			'first' => $names[0]->first,
			'last' => $names[0]->last
		);

		$ret = array(
			'id' => $this->bean->id,
			'dname' => $this->displayName(),
			'name' => $name,
			'birth_date' => dateFromIso($this->birth_date),
			'birth_place' => $this->place(Place::TypeBirth)
		);

		return $ret;
	}

	public function sidebarData()
	{
		$pm = $this->parentMarriage();

		$ret = array(
			'p' => $this->infoData(),
			'parentMarriage' => $pm ? $pm->cyId() : '',
			'parents' => self::makeLinks($this->parents()),
			'children' => self::makeLinks($this->children()),
			'media' => $this->media(true)
		);

		$ret['marriages'] = array();
		$ms = $this->marriages();
		foreach ($ms as $m)
		{
			$ret['marriages'][] = array(
				'cyid' => $m->cyId(),
				'spouse' => $m->spouseTo($this->bean)->linkData(),
				'children' => self::makeLinks($m->children())
			);
		}

		return $ret;
	}

	public function edit($input)
	{
		$bean = $this->bean;

		$d = Pod::validate($input, array(
				array('required', array('rdk_firstname', 'rdk_lastname')),
				array('dateFormat', 'rdk_birth_date', 'j.n.Y')
			));

		$this->set_names($d['rdk_firstname'], $d['rdk_lastname']);

		$birth_date = $d['rdk_birth_date'];
		if ($birth_date)
		{
			$date = dateToIso($birth_date);
			if ($date) $this->birth_date = $date;
		} else unset($this->birth_date);

		$birth_place = \json_decode($d['rdk_birth_place'], true);
		if ($birth_place) $this->edit_place($birth_place, Place::TypeBirth);

		return true;
	}

	public function editNewParent($input, $num)
	{
		$d = Pod::validate($input, array(
				array('required', array('rdk_p'.$num.'_firstname', 'rdk_p'.$num.'_lastname'))
			));

		$this->set_names($d['rdk_p'.$num.'_firstname'], $d['rdk_p'.$num.'_lastname']);
	}

	static public function editNewParents($input, $p1, $p2)
	{
		Pod::validate($input, array(
				array('required', array('rdk_p1_firstname', 'rdk_p1_lastname', 'rdk_p2_firstname', 'rdk_p2_lastname'))
			));

		$p1->editNewParent($input, 1);
		$p2->editNewParent($input, 2);
	}

	public function canBeDeleted()
	{
		// If this person can be deleted, returns an array of perons which would be deleted along _and_ this one
		// otherwise an empty array

		$marriages = $this->marriages();
		switch (count($marriages))
		{
			case 0:  return array($this->bean->linkData());               // This person is a leaf node
			case 1:  return $marriages[0]->canBeDeleted($this->bean->id); // This person is member of a marriage, delegate to the marriage
			default: return array();                                      // several marriages, can't be deleted
		}
	}

	public function ownBeans()
	{
		return \array_merge($this->relations(), $this->names(), array($this->bean));
	}

	public function deleteBeans()
	{
		// Returns beans to delete along with deletion of this bean

		$marriages = $this->marriages();
		switch (count($marriages))
		{
			case 0:  return $this->ownBeans();
			case 1:  return $marriages[0]->deleteBeans($this->bean->id);
			default: return array();
		}
	}

}
