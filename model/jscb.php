<?php
namespace JSCB;


class Callback
{
	const multiple = 'multiple';

	private $cbs = array();

	public function __construct($cb, array $data)
	{
		if ($cb) $this->add($cb, $data);
	}

	public function add($cb, array $data = array())
	{
		if (\is_string($cb))
		{
			$this->cbs[] = array(
					'callback' => $cb,
					'data' => $data
				);
		}
	}

	public function encode()
	{
		$cnt = \count($this->cbs);

		$json_opts = JSON_HEX_QUOT|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS;

		if ($cnt < 1) return '{}';
		else if ($cnt == 1)
		{
			return \json_encode($this->cbs[0], $json_opts);
		}
		else if ($cnt > 1)
		{
			return \json_encode(array(
					'callback' => self::multiple,
					'data' => $this->cbs
				), $json_opts);
		}
	}

	public function send()
	{
		\header('Content-Type: application/json');
		echo $this->encode();
		exit;
	}

	static public function sendCb($cb, array $data = array())
	{
		$cb = new self($cb, $data);
		$cb->send();
	}
}


class ValidationError extends \Exception
{
	private $inputs;

	public function __construct($inputs)
	{
		parent::__construct('JSCB Validation error');

		if (\is_array($inputs))
		{
			if (\array_key_exists(0, $inputs)) $this->inputs = $inputs;
			else $this->inputs = \array_keys($inputs);
		}
		else $this->inputs = array($inputs);
	}

	public function callback()
	{
		return new Callback('validationError', array($this->inputs));
	}
}
