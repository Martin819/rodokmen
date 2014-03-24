<?php
namespace Rodokmen;
use \Slim;
use \R;


class Logger
{
	private $app;
	private $f;

	public function __construct($app, $filename)
	{
		$this->app = $app;
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
}
