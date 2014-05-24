

(function($, undefined)
{
	var builtins = {};
	var navigating = false;


	function call_cb($this, cb, eo, args)
	{
		var cbns = $.fn.jscb.opts.namespace.call($this, cb, eo);
		args.unshift(eo);
		if (typeof cbns[cb] === 'function') return cbns[cb].apply($this, args);
		else if (typeof builtins[cb] === 'function') return builtins[cb].apply($this, args);
	}

	function xhr_events($target, xhr)
	{
		xhr
		.done(function()   { $target.trigger('jscb:ajax', ['done', xhr]);   })
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			if (!navigating) $target.trigger('jscb:ajax', ['fail', xhr, textStatus, errorThrown]);
		})
		.always(function() { $target.trigger('jscb:ajax', ['always', xhr]); });
		$target.trigger('jscb:ajax', ['start', xhr]);
	}

	function cb_from_ev($this, ev)
	{
		var prefix = $this.attr('id');
		if (prefix === undefined) prefix = $this.prop('tagName').toLowerCase();
		if (prefix === undefined) return undefined;

		if (ev === '') return prefix + 'Init';
		else
		{
			return prefix + ev.split(/\W/).map(function(s)
			{
				return s.charAt(0).toUpperCase() + s.slice(1);
			}).join('');
		}
	}

	function bind($this, args)
	{
		if (args.length < 1) return;
		var ev = args.shift();
		var cb = args.shift();

		// If no cb is supplied infer it from $this and event name:
		if (cb === undefined || cb === '') cb = cb_from_ev($this, ev);
		if (cb === undefined) throw 'JSCB: callback neither specified nor could it be inferred';

		if (ev === '') call_cb($this, cb, undefined, args);
		else $this.on(ev, function(eo)
		{
			var evargs = [].slice.call(arguments, 1);
			evargs = evargs.concat(args);
			return call_cb($this, cb, eo, evargs);
		});
	}

	function ajax_response_cb($this, response)
	{
		if (typeof response == 'object' &&
		    'data' in response && $.isArray(response.data) &&
		    'callback' in response && typeof response.callback === 'string')
		{
			call_cb($this, response.callback, undefined, response.data);
		}
	}

	function event_stop(e)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function apply_opts(opts)
	{
		$.extend($.fn.jscb.opts, opts);
		if (typeof $.fn.jscb.opts.namespace !== 'function') throw 'JSCB: callback namespace not defined or is not a function';

		// Special selectors:
		for (var i = 0; i < $.fn.jscb.opts.binds.length;)
		{
			var b = $.fn.jscb.opts.binds[i];
			var sel = b[0];
			var $e;
			switch (sel)
			{
				case ':window':   $e = $(window);   break;
				case ':document': $e = $(document); break;
				default: $e = false;
			}
			if ($e)
			{
				bind($e, b.slice(1));
				$.fn.jscb.opts.binds.splice(i, 1);  // Remove current element (these should only be considered once)
			}
			else i++;
		};

		// Bind beforeunload so that ajax errors are not reported while user navigates away
		$(window).on('beforeunload', function() { navigating = true; });
	}


	builtins.$ = function(e, fn)
	{
		var args = [].slice.call(arguments, 2);
		if (typeof $.fn[fn] === 'function') $.fn[fn].apply(this, args);
	}

	builtins.multiple = function(e, cbs)
	{
		if (!$.isArray(cbs)) return;
		for (var i = 0; i < cbs.length; i++) ajax_response_cb(this, cbs[i]);
	}

	builtins.log = function(e)
	{
		if ('console' in window && 'log' in window.console)
		{
			var args = [].slice.call(arguments, 1);

			if (args.length < 1) return;

			if ('apply' in window.console.log && typeof window.console.log.apply == 'function')
			{
				window.console.log.apply(window.console, args);
			}
			else
			{
				var invocation = 'window.console.log(args[0]';
				for (var i = 1; i < args.length; i++) {
					invocation += ',args['+i+']';
				};
				invocation += ')';

				logfn = new Function('args', invocation);
				logfn(args);
			}
		}
	}

	builtins.alert = function(e, msg)
	{
		alert(msg);
	}

	builtins.focus = function(e, ele)
	{
		if (ele !== undefined) ele.focus();
		else this.focus();
	}

	builtins.location = function(e, location)
	{
		event_stop(e);
		window.location.href = location;
	}

	builtins.reload = function(e, location)
	{
		event_stop(e);
		window.location.reload(true);
	}

	builtins.html = function(e, data, append)
	{
		append ? this.append(data) : this.html(data);
		if (!$.fn.jscb.opts.noAuto) this.jscbAll();
	}

	builtins.ajaxClass = function(e, status)
	{
		if (status != 'always') this.removeClass('jscb-ajax-done jscb-ajax-fail');
		if (status == 'start') this.removeClass('jscb-ajax-always');
		else this.removeClass('jscb-ajax-start');
		this.addClass('jscb-ajax-'+status);
	}

	builtins.get = function(e, url, cb)
	{
		if (e) e.preventDefault();
		this.jscb('abortAjax');
		var args = [].slice.call(arguments, 3);

		(function(self)
		{
			var cbargs = args;
			var xhr = $.get(url)
			.done(function(data)
			{
				if ($.isFunction(cb)) cb.apply(self, [e, data].concat(cbargs));
				else if (typeof cb === 'string') self.jscb.apply(self, [cb, data].concat(cbargs));
				else ajax_response_cb(self, data);
			});

			xhr_events(self, xhr);
			self.data('jscb:xhr', xhr);
		})(this);
	}

	builtins.getHtml = function(e, url, target, append)
	{
		$(target).jscb('get', url, builtins.html, append);
	}

	builtins.formSubmit = function(e)
	{
		if (e) e.preventDefault();

		this.jscb('abortAjax');

		this.ajaxSubmit();
		var self = this;
		var xhr = this.data('jqxhr');
		xhr_events(this, xhr);
		xhr.done(function(response)
		{
			ajax_response_cb(self, response);
		});
		this.data('jscb:xhr', xhr);
	}

	builtins.abortAjax = function(e)
	{
		var xhr = this.data('jscb:xhr');
		if (xhr && xhr.readyState < 4) xhr.abort();
	}

	builtins.validationError = function(e, inputs)
	{
		this.trigger('jscb:validationError', inputs);
		this.find('[name]').removeClass('jscb-input-invalid');
		this.find('[name="'+inputs[0]+'"]').addClass('jscb-input-invalid').focus();
		for (var i = 1; i < inputs.length; i++)
		{
			this.find('[name="'+inputs[i]+'"]').addClass('jscb-input-invalid');
		};
	}


	$.fn.jscbAll = function(arg)
	{
		if (typeof arg === 'object')
		{
			apply_opts.call(this, arg);
			arg = undefined;  // So that options are not re-applied in each jscb() call
		}

		$all = this.find('*');
		$all.each(function()
		{
			$(this).jscb(arg);
		});
	}

	$.fn.jscb = function(arg)
	{
		if (typeof arg === 'object') apply_opts.call(this, arg);

		if (typeof arg === 'string')
		{
			var moreargs = [].slice.call(arguments, 1);
			call_cb(this, arg, undefined, moreargs);
			return this;
		}
		else
		{
			this.each(function(i, e)
			{
				var $this = $(this);

				for (var i = 0; i < $.fn.jscb.opts.binds.length; i++)
				{
					var b = $.fn.jscb.opts.binds[i];
					var sel = b[0];
					if ($this.is(sel)) bind($this, b.slice(1));
				};

				var def = $this.data('jscb');
				if (typeof def === 'string') def = [def];
				else if (!$.isArray(def)) return true;
				var evts = typeof def[0] === 'string' ? [def] : def;

				for (var i = 0; i < evts.length; i++)
				{
					var args;
					if (typeof evts[i] === 'string') args = [evts[i]];
					else if ($.isArray(evts[i])) args = evts[i];
					else continue;

					bind($this, args);
				};

				return true;
			});

			return this;
		}
	}

	$.fn.jscb.opts =
	{
		namespace: undefined,
		noAuto: false,
		binds: []
	};

}(jQuery));
