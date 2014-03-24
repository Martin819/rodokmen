
(function(rdk, $, undefined)
{
	// How to namespace in JS: http://stackoverflow.com/a/5947280/786102

	function ajaxUrl(url)
	{
		return rdkRoot+'/ajax'+url;
	}

	function bindCyEvents(cy)
	{
		cy.nodes('.p').on('select', function(ev) { loadSidebar('person',   ev.cyTarget[0].data().oid); });
		cy.nodes('.m').on('select', function(ev) { loadSidebar('marriage', ev.cyTarget[0].data().oid); });
		cy.nodes().on('unselect', function(ev) { sidebarClear(); });
	}

	function bindSbEvents()
	{
		$('a.js-sbselect').click(function(e)
		{
			console.log('zde');
			cy.nodes(':selected').unselect();
			cy.nodes('#'+$(this).data('cyid')).select();
		})
	}

	function loadSidebar(type, id)
	{
		$.get(ajaxUrl('/'+type+'/'+id, '', 'html'))
		.done(function(data)
		{
			$('#sidebar').html(data);
			bindSbEvents();
		})
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			// FIXME: ajax error
			console.log('ajax fail:', type+':', textStatus, errorThrown);
		});
	}

	function sidebarClear()
	{
		// TODO
		// TODO: lineage stats (← JS) (?)
	}

	function loadLineage()
	{
		$.get(ajaxUrl('/lineage'), '', 'json')
		.done(function(data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				bindCyEvents(this);
			});
		})
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			// FIXME: ajax error
			console.log('ajax fail: lineage:', textStatus, errorThrown);
		});
	}

	$(document).ready(function()
	{
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
