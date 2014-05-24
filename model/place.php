<?php
namespace Rodokmen;
use \R;
use \Valitron\Validator;


class Place extends Pod
{
	const TypeBirth = 'birth';

	public function __construct() { parent::__construct('place'); }

	public function toJson()
	{
		$all = $this->findAll();
		$out = array();
		foreach ($all as $b) $out[] = $b->infoData();
		return \json_encode($out, JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS);
	}
}

class ModelPlace extends \RedBean_SimpleModel
{
	public function edit($array)
	{
		// $array is same as in infoData() (except for person_name)

		$v = new Validator($array);
		$v->rule('required', array('name', 'lon', 'lat', 'type'));
		$v->rule('numeric', 'lon');
		$v->rule('numeric', 'lat');

		if (!$v->validate()) return false;
		$d = $v->data();

		$this->name = $d['name'];
		$this->lon  = \floatval($d['lon']);
		$this->lat  = \floatval($d['lat']);
		$this->type = $d['type'];

		return true;
	}

	public function infoData()
	{
		$person = $this->person;

		return array(
			'name' => $this->name,
			'lon' => $this->lon,
			'lat' => $this->lat,
			'type' => $this->type,
			'person_name' => $person->idName()
		);
	}
}
