
(function(rdk, $, undefined)
{
	var fotorama;

	function bindFormEvents()
	{
		$('#gallery .js-openform').click(function(e)
		{
			e.preventDefault();
			$t = $(this);
			var href = $t.attr('href');
			if (href === undefined) href = $t.data('href');
			rdk.openForm($t.data('title'), href);
		});

		$(document)
		.on('click', '.js-formsubmit', function(e)
		{
			e.preventDefault();

			// TODO: deduplicate?

			var $t = $(this);
			var $vex = $t.closest('.vex');
			var vexD = $vex.data('vex');

			var xhr = rdk.submitForm($vex, $t.closest('form'));
			xhr.success(function()
			{
				vexD.afterClose = function() { location.reload(true); }
			}).always(function()
			{
				rdk.spinnerOn(false);
				vex.close(vexD.id);
			});
		})
		.on('click', '.js-formcancel', function(e)
		{
			vex.close($(this).closest('.vex').data('vex').id);
		});
	}

	function bindPhotoEvents()
	{
		$('#gallery .photo').click(function(e)
		{
			if (e.which != 1 || e.ctrlKey) return;
			e.preventDefault();
			var $t = $(this);
			var fid = $t.data('idx');
			fotorama.show(fid);
			fotorama.requestFullScreen();
		})
		.mouseenter(function() { $(this).children('.photo-tools').show(); })
		.mouseleave(function() { $(this).children('.photo-tools').hide(); });

		$('#gallery .photo-tools').click(function(e)
		{
			e.preventDefault();
			e.stopPropagation();
		})

		$('#gallery .photo-download').click(function()
		{
			location.href = $(this).data('href');
		})
	}

	$(document).ready(function()
	{
		fotorama = $('#fotorama').data('fotorama');

		bindFormEvents();
		bindPhotoEvents();
	});
}(window.rdk = window.rdk || {}, jQuery));
