/**
 * appl.js
 *
 * Eddie Chou
 *
 * Contains map initialization data, mapError, and mapSuccess functions
 * that are called on success or failure regarding the call to the Google
 * Maps API, respectively.
 *
 */

 // Contains map initialization information and 5 hard-coded locations/markers


 // Toggle the sidebar
  $("#toggle-button").click(function(){
  	$('#sidebar').toggle();
  });

// Default loaded data for museums.
 var mapInfo = {
 	initialData: {
 		position: {
 			lat: 51.580,
 			lng: -0.100
 		},
 		zoom: 11
 	},
 	museumMarkers: [
 		{
 			name: 'Ragged School Museum',
 			location: {lat: 51.5187639, lng: -0.035701},
 		},
 		{
 			name: "Alexander Fleming Laboratory",
 			location: {lat: 51.517162, lng: -0.173442},
 		},
 		{
 			name: "Hackney Museum",
 			location: {lat: 51.5445, lng: -0.055853},
 		},
 		{
 			name: "Royal Observatory Greenwich",
 			location: {lat: 51.476853, lng: -0.000500},
 		},
 		{
 			name: "The National Gallery",
 			location: {lat: 51.5089, lng: 0.1283},
 		},
 		{
 			name: "Imperial War Museum",
 			location: {lat: 51.49083137, lng: -0.10499958}
 		},
 		{
 			name: "Tate Modern",
 			location: {lat: 51.5074, lng: 0.1001}
 		},
 		{
 			name: "Bank of England Museum",
 			location: {lat: 51.5141, lng: 0.0876}
 		}
 	]
 };

// Callback function for Google Maps API
var mapSuccess = function(){
	var ViewModel = function(){
		var self = this;
		self.map;
		self.markers = ko.observableArray();
		self.filter = ko.observable('');	// Bound to input query bar

		// Filter markers based on filter (user input)
		self.displayedMarkers = ko.observableArray([]);

		self.openedInfoBubbles = [];
		self.infoBubbleTemplate = "<div><h3>%Location%</h3></div><div>" +
			"Wikipedia: <a href='%WikiLinkURL%' target='_blank'>%WikiLinkContent%</a><p>%WikiData%</p></div><div>" +
			"<img class='flickr-img' src='%Img0%' alt='museum' height='150' width='150'></img>" +
			"<img class='flickr-img' src='%Img1%' alt='museum' height='150' width='150'></img>" +
			"<img class='flickr-img' src='%Img2%' alt='museum' height='150' width='150'></img>" +
			"</div><div><p>Images retrieved from Flickr.</p></div>";

		// Ran whenever filter is changed
		// Updates displayedMarkers to only contain those that have substring in 'filter' (from user input)
		self.filterMarkers = function(){
			var filMarkers = ko.utils.arrayFilter(self.markers(), function(marker) {
				return ( marker.title.toLowerCase().indexOf(self.filter().toLowerCase()) !== -1 ) ? marker : null;
			});
			// Remove all markers from displayedMarkers and refill with the filtered markers
			self.displayedMarkers.removeAll();
			self.displayedMarkers(filMarkers);

			// Remove all markers from map
			$.each(self.markers(), function(i, marker){
				marker.setMap(null);
			});

			// Set markers on map that are filtered
			$.each(self.displayedMarkers(), function(i, marker){
				marker.setMap(self.map);
			});
		};

		/** API CALLS **/

		// Wikipedia API call
		self.getWikiData = function(markers){
			var getWikiDataURL = "https://en.wikipedia.org/w/api.php?action=opensearch&search=%museum%&format=json&callback=wikiCallback";

			// For each marker, perform a wiki request for the location based on name
			$.each(markers, function(i, marker){

				// setTimeout for each marker's request
				marker.wikiRequestTimeout = setTimeout(function(){
					marker.hasWikiData = false;
				}, 8000);

				// AJAX call to Wiki API
				$.ajax({
					url: getWikiDataURL.replace("%museum%", marker.title),
					dataType: "jsonp"
				}).done(function(response){
					clearTimeout(marker.wikiRequestTimeout);
					marker.wikiData = response;
					marker.hasWikiData = true;
				}).fail(function(){
					alert("Failed to get Wikipedia data.");
				});
			});
		};

		// Flicker API call
		self.getFlickrData = function(markers){

			var getFlickrDataURL = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&' +
			'api_key=eb53e93d71dd7f1f541d4b6938ce00ad&text=%placeName%&lat=%lat%&lon=%lon%&format=json&nojsoncallback=1';

			// For each marker, make Flickr API call
			$.each(markers, function(i, marker){
				var lat = marker.getPosition().lat();
				var lon = marker.getPosition().lng();

				// setTimeout for each marker's request
				var flickrRequestTimeout = setTimeout(function(){
					marker.hasFlickrImages = false;
				}, 8000);

				$.ajax({
					url: getFlickrDataURL.replace("%placeName%", marker.title).replace("%lat%", lat).replace("%lon%", lon),
					success: function(data) {
						clearTimeout(flickrRequestTimeout);
						marker.hasFlickrImages = true;
						marker.flickrImages = [];
						// Construct 3 image URLs

						// You can construct the source URL to a photo once you know its ID, server ID, farm ID and secret, as returned by many API methods.
						// Photo Source URLs:
						// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
						// 	or
						// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
						// 	or
						// https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{o-secret}_o.(jpg|gif|png)

						var imgURLTemplate = 'https://farm%farm-id%.staticflickr.com/%server-id%/%id%_%secret%_q.jpg';
						for (var i = 0; i < 3; i++){
							var imgData = data.photos.photo[i];
							marker.flickrImages[i] = imgURLTemplate.replace('%farm-id%', imgData.farm);
							marker.flickrImages[i] = marker.flickrImages[i].replace('%server-id%', imgData.server);
							marker.flickrImages[i] = marker.flickrImages[i].replace('%id%', imgData.id);
							marker.flickrImages[i] = marker.flickrImages[i].replace('%secret%', imgData.secret);
						}
					}
				}).fail(function(){
					alert("Failed to get Flickr data.");
				});
			});
		};


		// Initializes the map
		this.initMap = function(mapData, locations){

			// Create the map using Google Maps API
			self.map = new google.maps.Map(document.getElementById('map'), {
				center: mapData.position,
				zoom: mapData.zoom,
				mapTypeControl: false
			});

			// Create new markers from the hard-coded locations data. Push them to both the
			// full roster of markers and the
			$.each(locations, function(i, location){
				var marker = self.newMarker(location.name, location.location);
				self.markers.push(marker);
				self.displayedMarkers.push(marker);
			});

			// 3rd party API calls
			self.getWikiData(self.markers());
			self.getFlickrData(self.markers());
		};

		// Creates a marker
		self.newMarker = function(name, location){
			var museumIcon = 'images/museum.png';
			// Construct a new marker using Google Maps API
			var marker = new google.maps.Marker({
				map: self.map,
				title: name,
				position: location,
				icon: museumIcon,
				animation: google.maps.Animation.DROP
			});
			marker.addListener('click', function(){
				self.clickMarker(marker);
			});
			return marker;
		};

		// InfoBubble Version
		self.clickMarker = function(marker){
			self.openedInfoBubbles.forEach(function(infoBubble){
				infoBubble.close();
			});

			// Bound animation for marker for 1.4 seconds
			marker.setAnimation(google.maps.Animation.BOUNCE);
			setTimeout(function(){
				marker.setAnimation(null);
			}, 1400);

			// Create and open infoBubble and add to list of open infoBubbles
			var infoBubble = new InfoBubble({
				map: self.map,
				content: self.markerInfoBubble(self.infoBubbleTemplate, marker),
				position: marker.getPosition(),
				shadowStyle: 1,
				padding: 10,
				backgroundColor: 'rgb(255,255,255)',
				borderRadius: 20,
				arrowSize: 50,
				borderWidth: 4,
				borderColor: '#2c2c2c',
				disableAutoPan: true,
				hideCloseButton: true,
				arrowPosition: 30,
				backgroundClassName: 'phoney',
				arrowStyle: 2,
				maxWidth: 530,
				minWidth: 530
			});
			infoBubble.open(self.map, marker);
			self.openedInfoBubbles.push(infoBubble);
		}

		// Returns string containing HTML for marker's infoBubble (similar to resume project)
		self.markerInfoBubble = function(template, marker){
			// Wikipedia Success/Fail
			var HTML = template.replace('%Location%', marker.title);
			if (marker.hasWikiData){
				HTML = HTML.replace('%WikiLinkContent%', marker.wikiData[1][0]);// Name of link
				HTML = HTML.replace('%WikiData%', marker.wikiData[2][0]);		// Paragraph of info
				HTML = HTML.replace('%WikiLinkURL%', marker.wikiData[3][0]);	// URL link
			} else {
				HTML = HTML.replace('%WikiData%', 'Wikipedia data cannot be loaded.');
				HTML = HTML.replace('%WikiLinkContent%', '');
				HTML = HTML.replace('%WikiLinkURL%', '');
			}

			// Flickr Success/Fail
			if (marker.hasFlickrImages){
				HTML = HTML.replace('%Img0%', marker.flickrImages[0]);
				HTML = HTML.replace('%Img1%', marker.flickrImages[1]);
				HTML = HTML.replace('%Img2%', marker.flickrImages[2]);
			} else {
				HTML = HTML.replace('%Img0%', 'images/flickr_error.png');
				HTML = HTML.replace('%Img1%', 'images/flickr_error.png');
				HTML = HTML.replace('%Img2%', 'images/flickr_error.png');
				HTML = HTML.replace('museum image', 'Error loading images from Flickr.');
			}
			return HTML;
		};

		this.initMap(mapInfo.initialData, mapInfo.museumMarkers);
	};
	ko.applyBindings(new ViewModel());
};

// Google Maps API error
var mapError = function(){
	$('#map').append("<p style='text-align: center'>Error loading map from Google API.</p>");
};