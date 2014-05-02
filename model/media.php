<?php
namespace Rodokmen;
use \R;


class Media extends Pod
{
	const thumbW = 210;
	const thumbH = 175;
	const viewW = 1920;
	const viewH = 1080;
	const maxSize = 8388608;  // 8MB
	// "640K ought to be enough for anybody."

	public function __construct() { parent::__construct('media'); }

	public function findAllByYear()
	{
		return $this->findAll('ORDER BY year DESC');
	}
}

class ModelMedia extends \RedBean_SimpleModel
{
	private static $image_formats = array(
		'image/png',
		'image/gif',
		'image/jpeg',
		'image/pjpeg'
	);

	const url_image_orig  = 'media/photo/original/';
	const url_image_thumb = 'media/photo/thumb/';
	const url_image_view  = 'media/photo/view/';

	const view_threshold_size = 1048576; // 1MB

	private static function media_fn($url)
	{
		// Data path is hardcoded for media, because it's also hardcoded in .htaccess
		return __DIR__.'/../data/'.$url;
	}

	private function add_image()
	{
		//Create thumbnail and view image, store original

		$tmp_fn = $_FILES['rdk_uploadfile']['tmp_name'];
		$ext = \pathinfo($_FILES['rdk_uploadfile']['name'], PATHINFO_EXTENSION);
		$unique_name = \uniqid('', true);
		$orig_url  = self::url_image_orig.$unique_name.'.'.$ext;
		$thumb_url = self::url_image_thumb.$unique_name.'.jpg';
		$view_url  = self::url_image_view.$unique_name.'.jpg';
		$orig_fn = self::media_fn($orig_url);
		$thumb_fn = self::media_fn($thumb_url);
		$view_fn = self::media_fn($view_url);

		\move_uploaded_file($tmp_fn, $orig_fn);

		try
		{
			$thumb = \PhpThumbFactory::create($orig_fn);
			$thumb->adaptiveResize(Media::thumbW, Media::thumbH);
			$thumb->save($thumb_fn, 'jpg');

			$view  = \PhpThumbFactory::create($orig_fn);
			if (\filesize($tmp_fn) > self::view_threshold_size) $view->resize(Media::viewW, Media::viewH);
			$view->save($view_fn, 'jpg');
		}
		catch (Exception $e)
		{
			if (\file_exists($orig_fn))  \unlink($orig_fn);
			if (\file_exists($thumb_fn)) \unlink($thumb_fn);
			if (\file_exists($view_fn))  \unlink($view_fn);
			return false;
		}

		$this->type = 'image';
		$this->orig_url  = $orig_url;
		$this->thumb_url = $thumb_url;
		$this->view_url  = $view_url;

		return true;
	}

	public function after_delete()
	{
		// Invoked after bean is trashed
		$orig_fn = self::media_fn($this->orig_url);
		$thumb_fn = self::media_fn($this->thumb_url);
		$view_fn = self::media_fn($this->view_url);
		if (\file_exists($orig_fn))  \unlink($orig_fn);
		if (\file_exists($thumb_fn)) \unlink($thumb_fn);
		if (\file_exists($view_fn))  \unlink($view_fn);
	}

	public function addUpload($rq)
	{
		// Initial checks:
		if (!isset($_FILES['rdk_uploadfile'])) return false;
		$tmp_fn = $_FILES['rdk_uploadfile']['tmp_name'];
		if (!\is_uploaded_file($tmp_fn)) return false;
		if (\filesize($tmp_fn) > Media::maxSize) return false;

		// Edit:
		if (!$this->edit($rq)) return false;

		// Add file:
		if (\in_array(\strtolower($_FILES['rdk_uploadfile']['type']), self::$image_formats))
		{
			if (!$this->add_image()) return false;
		}
		else return false;

		return true;
	}

	public function edit($rq)
	{
		$year = $rq->post('rdk_year');
		if (!\preg_match('/\d{4}/', $year)) return false;
		$this->year = intval($year);

		$this->comment = $rq->post('rdk_comment');

		return true;
	}

	public function origFilename()
	{
		return $this->media_fn($this->orig_url);
	}
}
