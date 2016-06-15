// Toggle the left sidebar button
$("#toggle-sidebar").click(function(){
	$("#left-sidebar").toggle();
});

// Map options for Taipei, Taiwan with query: "Parks"
var taipeiMapOptions = {
	locLat : 25.033,
	locLong : 121.565,
	radius : "10000",
	query : "Parks",
	zoom : 10
}

// Map options for London, UK with query: "Parks"
var londonMapOptions = {
	locLat : 51.507,
	locLong : 0.128,
	radius : "10000",
	query : "Museums",
	zoom : 11
}

var Location = function(name, images, wikiLink, infoWindow){
	var self = this;
	self.name = name;
	self.images = images;
	self.wikiLink = wikiLink;
	self.infoWindow = infoWindow;
}

// Map Constructor
var Map = function(mapOptions){
	var self = this;
	self.map;
	self.service;
	self.infoWindow;
	self.flickrRequestResults = ko.observableArray();
	self.flickrImageURLs = ko.observableArray();
	self.wikipediaResults = ko.observableArray();	// Holds results from Wikipedia API
	self.placesList = ko.observableArray(); // Holds all places returned by Google API search

	// Names of places to list on the left-sidebar
	self.placesNamesList = ko.computed(function(){
		return ko.utils.arrayMap(self.placesList(), function(place) {
			return place.name;
		});
	});

	// To filter the places
	self.filter = ko.observable();	// Store filter
	self.filteredPlacesList = ko.computed(function() {
		if(!self.filter()) {
			return self.placesNamesList();
		} else {
			return ko.utils.arrayFilter(self.placesNamesList(), function(place) {
				return (place.toLowerCase().indexOf(self.filter().toLowerCase())) !== -1 ? place : null});
		}
	});

	// To store the markers to use for the map
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
	self.filteredMarkers.subscribe(function () {
		// Clear all markers from map
		$.each(self.markers(), function(){
			this.setMap(null);
		});

		// Put all filtered markers on map
		$.each(self.filteredMarkers(), function(){
			this.setMap(map);
		});
	});

	// Global initMap for Google API to see
	initMap = function() {
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

	    // Test for InfoWindow
	    var contentString = '<p>InfoWindow Test</p>';
	    infoWindow = new google.maps.InfoWindow({
	        content: '<h1>Taipei, Taiwan</h1><p>Testing InfoWindow</p>'
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
	    callWikiAPI();
	    // Call Flickr API to find images for each location
	    callFlickrAPIOnPlaces();
	  }
	}

	// Creates a new marker for each returned place //
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

	        // Create the marker with these parameters and push to observableArray
	        self.markers().push(new google.maps.Marker({
				map: map,
				icon: image,
				title: place.name,
				position: place.geometry.location,
				animation: google.maps.Animation.DROP
	        }));

	        // Push each place to KO observableArray
	        self.placesList.push(place);


	        bounds.extend(place.geometry.location);
	    }
	    map.fitBounds(bounds);
	}

	function callFlickrAPIOnPlaces(){
		// Call FlickrAPI to search for images for each location
		for(var i=0, length = self.placesNamesList().length; i < length; i++){
			callFlickrAPI(self.placesNamesList()[i]);
		};
	}

	// call flickrAPI for a particular placeName
	function callFlickrAPI(placeName){

		// Create URL to search for photos with text of the place name
		var baseURL = "https://api.flickr.com/services/rest/?method=";
		var method = "flickr.photos.search";
		var APIstring = "&api_key=";
		var APIkey = "eb53e93d71dd7f1f541d4b6938ce00ad";
		var jsonFormat = "&format=json";
		var query = "&text=" + placeName;

		var flickrRequestURL = baseURL + method + APIstring + APIkey + jsonFormat + query;

		$.ajax({
			url: flickrRequestURL,
			dataType: "jsonp"
		});

		// Define the callback function for the API call
		jsonFlickrApi = function(response){
			self.flickrRequestResults.push(response);

			// Needs to parse JUST for this location
			parseFlickrImageURLs();
		};

	}

	// Stores Image URLS into flickrImageURLs by parsing through flickrRequestResults
	function parseFlickrImageURLs(){
		var photos;
		var photoInfo;
		var farmID;
		var serverID;
		var photoID;
		var secret;
		var constructedFlickrImageURL;
		var flickrImageBaseURL = "https://farm";
		var flickrImagePreServerURL = ".staticflickr.com/";

		// Construct 5 Image URLs from the API response and store in self.flickrImageURLs

		// You can construct the source URL to a photo once you know its ID, server ID, farm ID and secret, as returned by many API methods.
		// Photo Source URLs:
		// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
		// 	or
		// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
		// 	or
		// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{o-secret}_o.(jpg|gif|png)

		// For each location
		for(var i=0, length = self.placesNamesList().length; i<length; i++){
			// Photos for this particular location
			photos = self.flickrRequestResults()[i].photos.photo
			// Get 5 photos from flickr
			if(photos.length == 0){
				self.flickrImageURLs.push("No images found.");
			} else {
				for(var j=0, length=photos.length; j<length && j<5; j++){
					photoInfo = photos[j];
					farmId = photoInfo.farm;
					serverId = photoInfo.server;
					photoId = photoInfo.id;
					secret = photoInfo.secret;

					// _q at the end gets large square image 150x150
					constructedFlickrImageURL = flickrImageBaseURL + farmId + flickrImagePreServerURL
						+ serverId + "/" + photoId + "_" + secret + "_q.jpg";

					self.flickrImageURLs.push(constructedFlickrImageURL);
				}
			}
		}
	}

 	// callWikiAPI
 	function callWikiAPI(){
// 		var articleList;
// 		var url;
// 		var wikiURL;
// 		var wikiRequestTimeout;
// 		var testURL = "http://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=Daan Forest Park&exsentences=3&exintro=1";
// 		var testURL2 = "http://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=2/28 Peace Park&exsentences=3";
// 		var contentReqBaseURL = "http://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=Daan Forest Park&exsentences=3&exintro=1"
// 		//
// 		var getWikipediaURL = "http://en.wikipedia.org/w/api.php?action=opensearch&search=2/28+Peace+Park&format=json&callback=wikiCallback";
// 		var wikiReturn;
// 		var wikiContentReqURL;
// 		// Do call to find name of park in wikipedia FIRST
// 		$.ajax({
// 			url: getWikipediaURL,
// 			dataType: "jsonp"
// 		}).done(function(response){
// 			wikiContentReqURL = response[3][0]);
// 			clearTimeout(wikiRequestTimeout);
// 		});

// 		wikiContentReqURL = contentReqBaseURL +
// 		// Do call to find name of park in wikipedia FIRST
// 		$.ajax({
// 			url: wikiContentReqURL,
// 			dataType: "jsonp"
// 		}).done(function(response){
// 			wikiContentReqURL = response[3][0]);
// 			clearTimeout(wikiRequestTimeout);
// 		});

// 		// Then, do call for content of the park
// 			// $.ajax({
// 			// 	url: testURL2,
// 			// 	dataType: "jsonp"
// 			// }).done(function(response){
// 			// 	var articleList = response[1];
// 			// 	self.wikipediaResults.push(response);
// 			// 	clearTimeout(wikiRequestTimeout);
// 			// });

// 		// // For each place in the list, run a Wikipedia API query for that location
// 		// $.each(self.placesNamesList(), function(place){
// 		// 	// Wikipedia API: 8 Second Timeout for error-handling
// 		// 	// For each location returned from Maps API, search for wikipedia article

// 		// 	wikiURL = 'http://en.wikipedia.org/w/api.php?action=opensearch&search='
// 		// 		+ place + '&format=json&callback=wikiCallback';
// 		// 	wikiRequestTimeout = setTimeout(function(){
// 		// 		self.wikipediaResults.push("Failed to get wikipedia article for " + place);
// 		// 	}, 8000);

// 		// 	// JSON-P request to wikipedia
// 		// 	$.ajax({
// 		// 		url: wikiURL,
// 		// 		dataType: "jsonp",
// 		// 		// Callback for jsonp request
// 		// 		// Store each response from JSON-P call in wikipediaResults
// 		// 		success: function( response ) {
// 		// 			self.wikipediaResults.push(response);
// 		// 			clearTimeout(wikiRequestTimeout);
// 		// 		}
// 		// 	})
// 		// })
	}
}

var appViewModel = {
	map: new Map(londonMapOptions),
	locations: ko.observableArray()
};

ko.applyBindings(appViewModel);