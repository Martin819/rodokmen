<?php
namespace Rodokmen;
use \Slim;
use \R;


abstract class Op
{
	const Create = 0;
	const Update = 1;
	const Delete = 2;

	static public function string($op)
	{
		switch ($op)
		{
			case self::Create: return 'Create';
			case self::Update: return 'Update';
			case self::Delete: return 'Delete';
			default: return '';
		}
	}
}

class Logger
{
	private $app;
	private $fn;
	private $f;

	public function __construct($app, $filename)
	{
		$this->app = $app;
		$this->fn = $filename;
		$this->f = \fopen($filename, 'a');
	}

	public function __destruct()
	{
		 \fclose($this->f);
	}

	public function write($message)
	{
		$date = R::isoDateTime(\time());
		$user = $this->app->user()->username();
		\fprintf($this->f, "[%s][%s] %s\n", $date, $user, $message);
	}

	public function tail($tailBytes)
	{
		$sz = \filesize($this->fn);
		if ($sz <= $tailBytes)
		{
			return \file_get_contents($this->fn);
		}
		$tail = \file_get_contents($this->fn, NULL, NULL, $sz - $tailBytes);
		$nl = \strpos($tail, "\n");
		if ($nl === false) return $tail;
		if ($nl == strlen($tail) - 1) return $tail;
		return \substr($tail, $nl + 1);
	}
}
