
(function(rdk, $, undefined)
{

	var defaults =
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
		this.options = $.extend({}, defaults, options);
		var opts = this.options;

		this.ele = element;
		element.hide();
		this.paper = Raphael(element[0], opts.size+2*opts.stroke, opts.size+2*opts.stroke);

		this.c1 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c1.attr('stroke', opts.color1);
		this.c1.attr('stroke-width', opts.stroke);
		this.c1.attr('stroke-dasharray', opts.pattern1);

		this.c2 = this.paper.circle(opts.stroke+opts.size/2, opts.stroke+opts.size/2, opts.size/2);
		this.c2.attr('stroke', opts.color2);
		this.c2.attr('stroke-width', opts.stroke);
		this.c2.attr('stroke-dasharray', opts.pattern2);

		this.spin1 = Raphael.animation({'transform': 'R360'}, opts.speed).repeat(Infinity);
		this.c1.animate(this.spin1);
		this.c1.pause(this.spin1);

		this.spin2 = Raphael.animation({'transform': 'R360'}, .71*opts.speed).repeat(Infinity);
		this.c2.animate(this.spin2);
		this.c2.pause(this.spin2);
	}

	rdk.Spinner.prototype.play = function()
	{
		this.ele.show();
		this.c1.attr({'transform': 'R0'});
		this.c2.attr({'transform': 'R0'});
		this.c1.animate(this.spin1);
		this.c2.animate(this.spin2);
	}

	rdk.Spinner.prototype.pause = function()
	{
		this.ele.hide();
		this.c1.stop(this.spin1);
		this.c2.stop(this.spin2);
	}

	rdk.Spinner.prototype.element = function()
	{
		return this.ele;
	}

}(window.rdk = window.rdk || {}, jQuery));
