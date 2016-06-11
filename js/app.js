$("#toggle-sidebar").click(function(){
	$("#left-sidebar").toggle();
});

// Taipei, Taiwan
var taipeiMapOptions = {
	locLat : 25.033,
	locLong : 121.565,
	query : "Parks",
}

var Map = function(mapOptions){
	self.service;
	self.infoWindow;
	self.placesList = ko.observableArray(); // Holds all places returned by Google API search
	self.markers = ko.observableArray(); // Holds all markers returned by search query
	self.initMap = function() {
	    var neighborhood = new google.maps.LatLng(mapOptions.locLat, mapOptions.locLong);

	    // Create new map with marker
	    map = new google.maps.Map(document.getElementById('map'), {
	      center: neighborhood,
	      zoom: 10
	    });
	    marker = new google.maps.Marker({
	        position: neighborhood,
	        map: map
	    });

	    // Search query and search service for locations near the neighborhood
	    var request = {
	        location: neighborhood,
	        radius: '10000',
	        query: mapOptions.query
	    }
	    service = new google.maps.places.PlacesService(map);
	    service.textSearch(request, serviceCallback);


	    // Test for InfoWindow
	    var contentString = '<p>InfoWindow Test</p>';
	    infoWindow = new google.maps.InfoWindow({
	        content: contentString
	    });

	    // Event listener for marker click
	    marker.addListener('click', function() {
	        infoWindow.open(map, marker);
	    });
	}

	// Creates markers based on results from GoogleAPI search
	function serviceCallback(results, status) {
	  if (status == google.maps.places.PlacesServiceStatus.OK) {
	    createMarkers(results);
	  }
	}

	/* Creates a new marker for each returned place */
	function createMarkers(places) {
	    var bounds = new google.maps.LatLngBounds();
	    var placesList = document.getElementById('places-list');

	    // For each place, create a marker
	    for (var i = 0, place; place = places[i]; i++) {

	    	// Marker image creation
	        var image = {
				url: place.icon,
				size: new google.maps.Size(71, 71),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(17, 34),
				scaledSize: new google.maps.Size(25, 25)
	        };

	        // Create the marker with these parameters
	        marker = new google.maps.Marker({
				map: map,
				icon: image,
				title: place.name,
				position: place.geometry.location,
				animation: google.maps.Animation.DROP
	        });

	        placesList.innerHTML += '<li>' + place.name + '</li>';

	        bounds.extend(place.geometry.location);
	    }
	    map.fitBounds(bounds);
	}
}

var ViewModel = function () {
	var self = this;

	self.map = new Map(taipeiMapOptions);
	self.markers = ko.computed();
	self.filter = ko.observable("");
}

ko.applyBindings(new ViewModel());





