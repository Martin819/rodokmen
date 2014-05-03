<?php
namespace Rodokmen;

function dateFromIso($iso_date)
{
	$datetime = \DateTime::createFromFormat('Y-m-d', $iso_date);
	return $datetime ? $datetime->format('j.n.Y') : false;
}

function dateToIso($dot_date)
{
	$datetime = \DateTime::createFromFormat('j.n.Y', $dot_date);
	return $datetime ? $datetime->format('Y-m-d') : false;
}
