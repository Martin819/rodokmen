<?php
namespace Rodokmen;


class Lineage
{
	private $p, $m, $r;

	public function __construct()
	{
		$this->p = new Person();
		$this->m = new Marriage();
		$this->r = new Relation();
	}

	public function toArray()
	{
		$nodes = array();
		$edges = array();

		$ps = $this->p->findAll();
		$ms = $this->m->findAll();
		$rs = $this->r->findAll();

		foreach ($ps as $b) $nodes[] = $b->cyNode();
		foreach ($ms as $b) $nodes[] = $b->cyNode();
		foreach ($rs as $b) $edges[] = $b->cyEdge();

		return array('nodes' => $nodes, 'edges' => $edges);
	}

	public function toJson()
	{
		return \json_encode($this->toArray(), JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS);
	}
}
