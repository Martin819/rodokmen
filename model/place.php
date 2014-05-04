<?php
namespace Rodokmen;
use \R;


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
	public function infoData()
	{
		$person = $this->person;

		return array(
			'name' => $this->name,
			'lon' => $this->lon,
			'lat' => $this->lat,
			'type' => $this->type,
			'person_name' => $person->displayName()
		);
	}
}
