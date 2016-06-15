// Toggle the left sidebar button
$("#toggle-sidebar").click(function(){
	$("#left-sidebar").toggle();
});

// Map options for London, UK with query: "Parks"
var londonMapOptions = {
	locLat : 51.507,
	locLong : 0.128,
	radius : "10000",
	query : "Museums",
	zoom : 11
}

// Google Maps API call stored in global map variable
var map = function(mapOptions){
	var self = this;

	initMap = function(){
		var neighborhood = new google.maps.LatLng(mapOptions.locLat, mapOptions.locLong);

		// Create new map with marker for center location
		map = new google.maps.Map(document.getElementById('map'), {
		  center: neighborhood,
		  zoom: mapOptions.zoom
		});

		// Create marker for center of neighborhood
		marker = new google.maps.Marker({
		    position: neighborhood,
		    map: map
		});

		// Search service implementing search query for locations near the neighborhood
		var request = {
		    location: neighborhood,
		    radius: mapOptions.radius,
		    query: mapOptions.query
		}
		self.service = new google.maps.places.PlacesService(map);
		self.service.textSearch(request, serviceCallback);

		// Test for InfoWindow on this marker
		var contentString = '<p>InfoWindow Test</p>';
		infoWindow = new google.maps.InfoWindow({
		    content: '<h1>London, UK</h1><p>Testing InfoWindow</p>'
		});

		// Event listener for marker click
		marker.addListener('click', function() {
		    infoWindow.open(map, marker);
		});
	}

	// Callback function for Maps API search query
	function serviceCallback(results, status) {
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			storeResults(results);
			createMarkers(results);
			//getWikiURLs();
			//getFlickrImages();
		}
	}

	// Stores results
	function storeResults(places) {
		$.each(places, function(i, place){
			// Push each place to KO observableArray
			appViewModel.locationsData.placesList.push(place);
		});
	}

	// Creates a new marker for each returned place
	function createMarkers(places) {
	    var bounds = new google.maps.LatLngBounds();

	    // For each place in places, create a marker
	    for (var i = 0, place; place = places[i]; i++) {

	    	// Marker image creation
	        var image = {
				url: place.icon,
				size: new google.maps.Size(71, 71),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(17, 34),
				scaledSize: new google.maps.Size(25, 25)
	        };

	        // Create the marker with these parameters and store together in Location object
	        $.each(appViewModel.locationsData.locations(), function(i, loc){
	        	if(loc.name == place.name){
    		        loc.marker = new google.maps.Marker({
    					map: map,
    					icon: image,
    					title: place.name,
    					position: place.geometry.location,
    					animation: google.maps.Animation.DROP
    		        });
    		        loc.marker.addListener('click', (function(marker){
    		        	return function(){
    		        		marker.setAnimation(google.maps.Animation.BOUNCE);
    		        	}
    		        })(loc.marker));
	        	}
	        });
	        bounds.extend(place.geometry.location);
	    }
	    map.fitBounds(bounds);
	}

}(londonMapOptions);

// Stores all information related to a particular location together
var Location = function(name){
	var self = this;
	self.marker = null;
	self.name = name;
	self.images = [];	// Array of URLs
	self.wikiLink = "";	// URL of wikipedia article
	self.infoWindow = null;
}

var LocationsData = function(){
	var self = this;

	self.placesList = ko.observableArray(); // Holds all places returned by Google API search

	// Creates a location object for each place
	self.locations = ko.computed(function(){
		return ko.utils.arrayMap(self.placesList(), function(place) {
			return new Location(place.name);
		});
	});

	// Names of places
	self.placesNamesList = ko.computed(function(){
		return ko.utils.arrayMap(self.locations(), function(loc) {
			return loc.name;
		});
	});

	// Filtered places based on input bar
	self.filter = ko.observable();	// Store filter
	self.filteredPlacesList = ko.computed(function() {
		if(!self.filter()) {
			return self.placesNamesList();
		} else {
			return ko.utils.arrayFilter(self.placesNamesList(), function(place) {
				return (place.toLowerCase().indexOf(self.filter().toLowerCase())) !== -1 ? place : null});
		}
	});



	/*
	 * Markers filtering
	 */
	// Markers populated from Google Maps search API call
	self.markers = ko.observableArray();

	// The markers computed based on the filter
	self.filteredMarkers = ko.computed(function(){
		if(!self.filter()) {
			return self.markers();
		} else {
			return ko.utils.arrayFilter(self.markers(), function(marker) {
				return (marker.title.toLowerCase().indexOf(self.filter().toLowerCase())) !== -1 ? marker : null});
		}
	});
	// Only display markers based on filter
	self.filteredMarkers.subscribe(function() {
		// Clear all markers from map
		$.each(self.markers(), function(){
			this.setMap(null);
		});

		// Put all filtered markers on map
		$.each(self.filteredMarkers(), function(){
			this.setMap(map);
		});
	});

}

var appViewModel = {
	locationsData: new LocationsData(),

	dropMarker : function(){

	}
};

ko.applyBindings(appViewModel);