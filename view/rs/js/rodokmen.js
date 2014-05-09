
(function(rdk, $, undefined)
{
	var sbTimer;
	var sbLoadTimer;


	rdk.mapTileServer = 'http://otile3.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
	rdk.mapAttribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';


	function latDist(a, b)
	{
		a = L.latLng(a.lat, 0);
		b = L.latLng(b.lat, 0);
		return a.distanceTo(b);
	}

	function placeMake(json)
	{
		var place = {
			ll: L.latLng(json.lat, json.lon),
			text: {}
		};
		placeMerge(place, json);
		return place;
	}

	function placeMerge(place, json)
	{
		if (place.text[json.type] === void 0) place.text[json.type] = [];
		place.text[json.type].push(json.person_name);
	}

	function makePlaces(json)
	{
		if (!$.isArray(json)) return [];
		if (json.length < 1)  return [];

		json.sort(function(a, b) { return a.lat - b.lat; });

		var threshold = 100; // in meters

		// First lets divide the places into clusters based on latitude:
		var ci = 0;
		var clusters = [[json[0]]];
		for (var i = 1; i < json.length; i++)
		{
			var dist = latDist(json[i-1], json[i]);
			if (dist < threshold) clusters[ci].push(json[i]);
			else
			{
				// new cluster
				clusters.push([json[i]]);
				ci++;
			}
		}

		// Second, sort each cluster by longitude:
		// (since places in one cluster have almost the same latitude, this should correspond to distance)
		for (var i = 0; i < clusters.length; i++)
		{
			clusters[i].sort(function(a, b) { return a.lon - b.lon; });
		}

		// Last but not least, generate places:
		var places = [];
		for (var i = 0; i < clusters.length; i++)
		{
			places.push(placeMake(clusters[i][0]));
			var pi = places.length-1;
			for (var j = 1; j < clusters[i].length; j++)
			{
				var dist = places[pi].ll.distanceTo(L.latLng(clusters[i][j].lat, clusters[i][j].lon));
				if (dist < threshold) placeMerge(places[pi], clusters[i][j]);
				else
				{
					places.push(placeMake(clusters[i][j]));
					pi++;
				}
			}
		}

		return places;
	}

	function displayMap(places)
	{
		map = L.map('map').setView([51.505, -0.09], 13);
		L.tileLayer(rdk.mapTileServer,
		{
			attribution: rdk.mapAttribution,
			maxZoom: 18
		}).addTo(map);

		L.Icon.Default.imagePath = rdk.baseUrl+'/rs/leaflet';

		var bounds = [];
		for (var i = 0; i < places.length; i++)
		{
			var place = places[i];
			bounds.push(place.ll);

			var marker = L.marker(place.ll);
			var text = '';
			for (var type in place.text)
			{
				text += '<h3>'+rdk.strings.mapPopup[type]+'</h3><ul>';
				for (var j = 0; j < place.text[type].length; j++)
				{
					text += '<li>'+place.text[type][j]+'</li>';
				};
				text += '</ul>';
			}
			marker.bindPopup(text);
			marker.addTo(map);
		};

		map.fitBounds(L.latLngBounds(bounds), { maxZoom: 8 });
		if (map.getZoom() > 3) map.zoomOut(1, { animate: false });
	}


	rdk.globalAjax = function(e, status, xhr)
	{
		if (status == 'fail') vex.dialog.alert(rdk.strings.ajaxErrMsg['get']);
		else if (e)
		{
			if (status == 'start')
			{
				rdk.spinnerOn(false);
				rdk.spinnerOn($(e.target));
			}
			else if (status == 'always')
			{
				rdk.spinnerOn(false);
			}
		}
		return false;
	}

	rdk.sidebarAjax = function(e, status)
	{
		if (status == 'start')
		{
			clearTimeout(sbTimer);
			sbLoadTimer = setTimeout(function()
			{
				$('#sidebar-content').detach();
				rdk.spinnerOn(false);
				rdk.spinnerOn($('#sidebar'));
				clearTimeout(sbLoadTimer);
			}, 750);
			return false;
		}
		else if (status == 'always')
		{
			clearTimeout(sbLoadTimer);
			rdk.spinnerOn(false);
			return false;
		}

		return true;
	}

	rdk.cyInit = function(e)
	{
		// Initialize Cytoscape:
		var self = this;
		self.cytoscape(
		{
			layout: { name: 'rodokmen' },

			renderer:
			{
				name: 'raphael',
				multiSelect: false
			},

			style: cytoscape.stylesheet()
				.selector('node.p')
					.css({
						'background-color': '#006280',
						'shape': 'roundrectangle',
						'width': 50,
						'height': 40,
						'content': 'data(name)',
						'text-valign': 'center',
						'text-outline-width': 0,
						'color': '#fff',
						'font-size': 15,
						'font-weight': 'bold',
						'font-family': 'sans-serif'
					})
				.selector('node.m')
					.css({
						'background-color': '#006280',
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
						'width': 2,
						'target-arrow-shape': 'none',
						'source-arrow-shape': 'none',
						'line-color': '#006280',
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
				window.cy = this;
				this.boxSelectionEnabled(false);
				self.jscb('cyLoad');
			}
		});
	}

	rdk.cyLoad = function(e, cyid)
	{
		function giddyUp(e, data)
		{
			cy.load(data, function()
			{
				this.nodes().ungrabify();
				this.nodes().on('select', function(ev)
				{
					var ele = ev.cyTarget[0];
					var url = ele.hasClass('p') ? '/person/' : '/marriage/';
					$().jscb('getHtml', rdk.ajaxUrl(url + ele.data().oid), '#sidebar');
				});
				this.nodes().on('unselect', function(ev)
				{
					sbTimer = setTimeout(function()
					{
						$('#sidebar-content').detach();
						clearTimeout(sbTimer);
					}, 100);
				});

				rdk.spinnerOn(false);

				if (cyid) $().jscb('cySelect', cyid);

				// TODO: lineage stats → sidebar (?)
			});
		}

		cy.nodes().unselect();
		cy.elements().remove();
		this.jscb('get', rdk.ajaxUrl('/lineage'), giddyUp);
	}

	rdk.cyAjax = function(e, status)
	{
		if (status == 'always') e.stopPropagation(); // Let's not stop the spinner just yet
	}

	rdk.cySelect = function(e, cyid)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
		cy.nodes(':selected').unselect();
		cy.nodes('#'+cyid).select();
	}

	rdk.cyEdited = function(e, cyid)
	{
		var vexD = this.closest('.vex').data('vex');
		vexD.afterClose = function()
		{
			$('#cy').jscb('cyLoad', cyid);
		}
		vex.close(vexD.id);
	}

	rdk.vexOpen = function(e, url, title)
	{
		if (e)
		{
			e.preventDefault();
			e.stopPropagation();
		}
		vex.open(
		{
			content: '<h2>'+title+'</h2><div class="hr"></div>',
			css: { padding: '50px 0' },
			contentCSS:
			{
				position: 'absolute',
				top: '50px',
				bottom: '50px',
				left: '20%'
			},
			afterOpen: function($vexContent) { $().jscb('getHtml', url, $vexContent, true); },
			afterClose: function() {},
			onSubmit: function() {}
		});
	}

	rdk.vexAjax = function(e, status)
	{
		if (status == 'start')
		{
			rdk.spinnerOn(this.closest('.vex'));
			this.children().hide();
			e.stopPropagation();
		}
	}

	rdk.vexClose = function(e)
	{
		var $vex = this.closest('.vex');
		this.find('form').jscb('abortAjax');
		rdk.spinnerOn(false);
		vex.close($vex.data('vex').id);
	}

	rdk.nominatim = function(e)
	{
		this.nominatim();
	}

	rdk.fotorama = function(e, fid)
	{
		if (!$(e.target).hasClass('photo')) return;
		if (e && (e.which != 1 || e.ctrlKey)) return;
		e.preventDefault();
		var fotorama = $('#fotorama').data('fotorama');
		fotorama.show(fid);
		fotorama.requestFullScreen();
	}

	rdk.leaflet = function(e)
	{
		function makemap(e, data)
		{
			displayMap(makePlaces(data));
		}

		this.jscb('get', rdk.ajaxUrl('/places'), makemap);
	}


	$(document).ready(function()
	{
		$('.jscb').jscb(
		{
			namespace: function() { return window.rdk; },
			binds:
			[
				['.focus', '', 'focus'],
				['.nominatim', '', 'nominatim'],
				['.vex-cancel', 'click', 'vexClose']
			]
		});
	});
}(window.rdk = window.rdk || {}, jQuery));
