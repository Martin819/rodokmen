
(function(rdk, $, undefined)
{

	// Loading spinner

	var spinner_defaults =
	{
		size: 100,
		stroke: 10,
		speed: 5000,
		color1: '#fff',
		color2: '#fff',
		pattern1: '- ',
		pattern2: '- .'
	};

	rdk.Spinner = function(element, options)
	{
		this.options = $.extend({}, spinner_defaults, options);
		var opts = this.options;

		var eleSize = 1.1*opts.size;
		var eleMargin = -Math.round(eleSize/2);

		this.ele = $('<div/>').css(
		{
			'position': 'absolute',
			'width': eleSize+'px',
			'height': eleSize+'px',
			'margin': eleMargin+'px 0 0 '+eleMargin+'px',
			'z-index': 10
		});

		this.paper = Raphael(this.ele[0], opts.size+2*opts.stroke, opts.size+2*opts.stroke);

		this.c1 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c1.attr('stroke', opts.color1);
		this.c1.attr('stroke-width', opts.stroke);
		this.c1.attr('stroke-dasharray', opts.pattern1);

		this.c2 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c2.attr('stroke', opts.color2);
		this.c2.attr('stroke-width', opts.stroke);
		this.c2.attr('stroke-dasharray', opts.pattern2);

		this.animating = false;
	}

	rdk.Spinner.prototype.play = function(onElement)
	{
		if (onElement)
		{
			if (this.animating) this.pause();
			this.ele.appendTo(onElement);
			this.ele.css('top',  onElement.outerHeight()/2);
			this.ele.css('left', onElement.outerWidth()/2);

			var R = Math.floor(Math.random()*360);
			this.c1.attr({'transform': 'R'+R});
			this.c2.attr({'transform': 'R'+R});
			this.spin1 = Raphael.animation({'transform': 'R'+R+'r360'}, this.options.speed).repeat(Infinity);
			this.c1.animate(this.spin1);
			this.spin2 = Raphael.animation({'transform': 'R'+R+'r360'}, .71*this.options.speed).repeat(Infinity);
			this.c2.animate(this.spin2);

			this.animating = true;
		}
	}

	rdk.Spinner.prototype.pause = function()
	{
		this.c1.stop(this.spin1);
		this.c2.stop(this.spin2);
		this.ele.detach();
		this.animating = false;
	}

	rdk.Spinner.prototype.element = function()
	{
		return this.ele;
	}


	// Ajax utils

	rdk.ajaxUrl = function (url)
	{
		return rdk.baseUrl+'/ajax'+url;
	}


	// Location search field

	$.fn.nominatim = function()
	{
		this.select2(
		{
			placeholder: "Vyhledat místo...",
			multiple: true,
			minimumInputLength: 1,
			maximumSelectionSize: 1,
			ajax:
			{
				url: rdk.nominatimServer,
				type: "GET",
				dataType: 'json',
				quietMillis: 500,
				data: function (term)
				{
					return { q: term, format: 'json' };
				},
				results: function (data)
				{
					return {
						results: $.map(data, function(p, i)
						{
							return { id: i, text: p.display_name, name: p.display_name, lon: p.lon, lat: p.lat };
						})
					};
				}
			},
			initSelection: function(e, cb)
			{
				cb([{ id: 0, text: e.val() }]);
			}
		});

		var input_id = this.data('input');
		this.after('<input type="hidden" name="'+input_id+'" id="'+input_id+'" value="" />');
		var input = $('#'+input_id);
		this.on('change', function(e)
		{
			if (e.added)
			{
				var place = e.added;
				delete place.id;
				delete place.text;
				input.val(JSON.stringify(place));
			}
			else if (e.removed) input.val('{"removed": true}');
		});

		return this;
	}

	$.fn.personSelect = function()
	{
		var input_id = this.data('input');
		this.after('<input type="hidden" name="'+input_id+'" id="'+input_id+'" value="" />');
		var input = $('#'+input_id);

		this.select2(
		{
			placeholder: "Vyhledat...",
			multiple: true,
			minimumInputLength: 1,
			ajax:
			{
				url: function(query)
				{
					return rdk.ajaxUrl('/person/lookup/'+query);
				},
				type: "POST",
				dataType: 'json',
				quietMillis: 500,
				results: function (data)
				{
					return {
						results: $.map(data, function(p, i)
						{
							return { id: p.id, text: rdk.strings.idName(p.name, p.birth) };
						})
					};
				}
			},
			initSelection: function(e, cb)
			{
				var tags = JSON.parse(e.val()).tags;
				e.val(''); // This is needed, otherwise select2 _appends_ the data to the existing value
				cb($.map(tags, function(tag)
				{
					return { id: tag.id, text: rdk.strings.idName(tag.name, tag.birth) };
				}));
			}
		});

		this.on('change', function(e)
		{
			input.val(JSON.stringify({tags: e.val}));
		});

		return this;
	}

}(window.rdk = window.rdk || {}, jQuery));
