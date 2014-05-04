
(function(rdk, $, undefined)
{
	var map;

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
	}

	function loadPlaces()
	{
		rdk.spinnerOn($('#map'));

		$.get(rdk.ajaxUrl('/places'), '', 'json')
		.done(function(data)
		{
			displayMap(makePlaces(data));
			rdk.spinnerOn(false);
		})
		.fail(rdk.ajaxError());
	}

	$(document).ready(function()
	{
		loadPlaces();
	});
}(window.rdk = window.rdk || {}, jQuery));
