<?php
namespace Rodokmen;

define('conf_fn_default', __DIR__.'/../config/config-cached');

class Config
{
	private $conf_fn;
	private $config;

	private function opt_default($opt, $value)
	{
		if (!isset($this->config[$opt])) $this->config[$opt] = $value;
	}

	private function add_defaults()
	{
		$this->opt_default('admin_username', 'admin');
		$this->opt_default('admin_hash', 'sha256:1::26F9kTf0oY1QAVdms5tN9LJRBOY6ZQaQMOX9v8ivAHk=');  // default pw: "admin"
		$this->opt_default('db_freeze', false);
		$this->opt_default('db_auth', '../data/auth.sqlite');
		$this->opt_default('db_data', '../data/data.sqlite');
	}

	private function load()
	{
		if (\file_exists($this->conf_fn))
		{
			$conf_load = \unserialize(\file_get_contents($this->conf_fn));
			if (is_array($conf_load)) $this->config = $conf_load;
			else $this->config = array();
		}
	}

	private function save()
	{
		$sr = \serialize($this->config);
		\file_put_contents($this->conf_fn, $sr, LOCK_EX);
	}


	public function __construct($filename = conf_fn_default)
	{
		$this->conf_fn = $filename;
		$this->load();
		$this->add_defaults();
	}

	public function __destruct()
	{
		$this->save();
	}

	public function __get($name)
	{
		return $this->config[$name];
	}

	public function __set($name, $value)
	{
		$this->config[$name] = $value;
	}
}
