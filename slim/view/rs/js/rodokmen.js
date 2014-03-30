
(function(rdk, $, undefined)
{
	// How to namespace in JS: http://stackoverflow.com/a/5947280/786102

	var spinner;

	function spinnerOn(element)
	{
		if (element)
		{
			var se = spinner.element();
			se.appendTo(element);
			se.css('top',  element.outerHeight()/2);
			se.css('left', element.outerWidth()/2);
			spinner.play();
		} else
		{
			spinner.element().appendTo($('body'));
			spinner.pause();
		}
	}

	function ajaxUrl(url)
	{
		return rdk.baseUrl+'/ajax'+url;
	}

	function ajaxError(method)
	{
		if (method != 'post') method = 'get';
		return function(jqXHR, textStatus, errorThrown)
		{
			vex.dialog.alert(rdk.strings.ajaxErrMsg[method]);
		}
	}

	function bindCyEvents(cy)
	{
		cy.nodes('.p').on('select', function(ev) { loadSidebar('person',   ev.cyTarget[0].data().oid); });
		cy.nodes('.m').on('select', function(ev) { loadSidebar('marriage', ev.cyTarget[0].data().oid); });
		cy.nodes().on('unselect', function(ev) { sidebarClear(); });
	}

	function bindSbEvents()
	{
		$('#sidebar')
		.on('click', 'a.js-sbselect', function(e)
		{
			cy.nodes(':selected').unselect();
			cy.nodes('#'+$(this).data('cyid')).select();
		})
		.on('click', '.js-openform', function(e)
		{
			e.preventDefault();
			openForm($(this).data('title'), $(this).attr('href'));
		});

		$(document)
		.on('click', '.js-formsubmit', function(e)
		{
			e.preventDefault();
			var $t = $(this);
			submitForm($t.closest('.vex'), $t.closest('form'));
		})
		.on('click', '.js-formcancel', function(e)
		{
			vex.close($(this).closest('.vex').data('vex').id);
		});
	}

	function openForm(heading, url)
	{
		vex.open(
		{
			content: '<h2>'+heading+'</h2><div class="hr"></div>',
			css: { padding: '50px 0' },  // TODO: move css (?)
			contentCSS:
			{
				position: 'absolute',
				top: '50px',
				bottom: '50px',
				left: '20%'
			},
			afterOpen: function($vexContent) { loadForm(url, $vexContent); },
			afterClose: function() {}
		});
	}

	function loadForm(url, $vexContent)
	{
		spinnerOn($vexContent);
		$.get(url, '', 'html')
		.done(function(data)
		{
			$vexContent.append(data);
			$('.vex .focus').focus();
		})
		.fail(ajaxError())
		.always(function() { spinnerOn(false); });
	}

	function submitForm($vex, $form)
	{
		// TODO: select new element after form delivered, if any

		var url = $form.attr('action');
		var data = $form.serialize();
		var vexD = $vex.data('vex');

		$form.hide();
		spinnerOn($vex);

		$.post(url, data)
		.fail(ajaxError('post'))
		.always(function()
		{
			spinnerOn(false);
			cy.elements().remove();
			vexD.afterClose = function() { loadLineage(); }
			vex.close(vexD.id);
		});
	}

	var sbTimer;

	function loadSidebar(type, id)
	{
		clearTimeout(sbTimer);

		var sbLoadTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			spinnerOn($('#sidebar'));
			clearTimeout(sbLoadTimer);
		}, 750);

		$.get(ajaxUrl('/'+type+'/'+id, '', 'html'))
		.done(function(data) { $('#sidebar').html(data); })
		.fail(ajaxError())
		.always(function()
		{
			clearTimeout(sbLoadTimer);
			spinnerOn(false);
		});
	}

	function sidebarClear()
	{
		// TODO
		// TODO: lineage stats (← JS) (?)

		sbTimer = setTimeout(function()
		{
			$('#sidebar-content').detach();
			clearTimeout(sbTimer);
		}, 100);
	}

	function loadLineage()
	{
		spinnerOn($('#cy'));

		$.get(ajaxUrl('/lineage'), '', 'json')
		.done(function(data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				bindCyEvents(this);
				spinnerOn(false);
			});
		})
		.fail(ajaxError());
	}

	$(document).ready(function()
	{
		// jQuery
		$.ajaxSetup({ timeout: 20000 });

		// Loading spinner
		spinner = new rdk.Spinner($('#spinner'),
		{
			size: 80,
			stroke: 4,
			color1: '#1173A7',
			color2: '#1173A7',
			speed: 8000
		});

		// Bind evets
		bindSbEvents();

		// Cytoscape
		$('#cy').cytoscape(
		{
			layout: { name: 'rodokmen' },
			// layout: { name: 'breadthfirst' },

			renderer:
			{
				name: 'raphael',
				multiSelect: false,
			},
			// renderer: { name: 'canvas' },

			style: cytoscape.stylesheet()
				.selector('node.p')
					.css({
						// 'background-color': '#239DF3',
						'background-color': '#006280',
						'shape': 'roundrectangle',
						'width': 50,
						'height': 40,
						'content': 'data(name)',
						'text-valign': 'center',
						'text-outline-width': 0,
						// 'text-outline-color': '#000000',
						'color': '#fff',
						'font-size': 15,
						'font-weight': 'bold',
						'font-family': 'sans-serif'
					})
				.selector('node.m')
					.css({
						// 'background-color': '#239DF3',
						'background-color': '#006280',
						// 'background-color': 'red',
						'content': '',
						'shape': 'circle',
						'width': 20,
					})
				.selector(':selected')
					.css({
						'border-width': 3,
						'border-color': '#eee'
					})
				.selector('edge')
					.css({
						'curve-style': 'bezier',
						// 'curve-style': 'haystack',
						'width': 2,
						'target-arrow-shape': 'none',
						// 'target-arrow-shape': 'triangle',
						'source-arrow-shape': 'none',
						// 'line-color': '#239DF3',
						'line-color': '#006280',
						// 'source-arrow-color': 'data(faveColor)',
						// 'target-arrow-color': 'data(faveColor)'
					})
				.selector('edge.questionable')
					.css({
						'line-style': 'dotted',
						'target-arrow-shape': 'diamond'
					})
				.selector('.faded')
					.css({
						'opacity': 0.25,
						'text-opacity': 0
					}),

			showOverlay: false,

			ready: function(e)
			{
				window.cy = e.cy;

				this.boxSelectionEnabled(false);

				// this.zoom(1.5);
				loadLineage();

				// giddy up
			}
		});
	});
}(window.rdk = window.rdk || {}, jQuery));
