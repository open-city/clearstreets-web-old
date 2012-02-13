/*------------------------------------------------------------------+
 | Functions used for searchable fusion table maps                  |
 | Requires jQuery                                                  |
 +-------------------------------------------------------------------*/

  var map;
  var geocoder;
  var addrMarker;
  var addrMarkerImage = 'http://derekeder.com/images/icons/blue-pushpin.png';
  
  var fusionTableId = 2708605; //replace this with the ID of your fusion table
  var fusionTableId2 = 2706169; //under chicagoplowtracker2@gmail.com
  
  var searchRadius = 1610; //in meters ~ 1/2 mile
  var recordName = "road segment";
  var recordNamePlural = "road segments";
  var searchrecords;
  var searchrecords2;
  var records = new google.maps.FusionTablesLayer(fusionTableId);
  var records2 = new google.maps.FusionTablesLayer(fusionTableId2);
  
  var searchStr;
  var searchStr2;
  var searchRadiusCircle;
  
  google.load('visualization', '1', {}); //used for custom SQL call to get count
  
  function initialize() {
	$( "#resultCount" ).html("");
  
  	geocoder = new google.maps.Geocoder();
    var chicago = new google.maps.LatLng(41.8781136, -87.66677856445312);
    var myOptions = {
      zoom: 13,
      center: chicago,
      mapTypeId: google.maps.MapTypeId.TERRAIN
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),myOptions);
	
	$("#ddlRadius").val("1610");
	
	searchrecords = null;
	$("#txtSearchAddress").val("");
	$("#txtStartTime").val("01/20/2012 10:00 AM");
	$("#txtEndTime").val("01/21/2012 6:00 PM");
	//$("#txtEndTime").val($.format.date(new Date(), "MM/dd/yyyy h:mm a"));
	doSearch();
  }
	
	function doSearch() 
	{
		clearSearch();
		var address = $("#txtSearchAddress").val();
		searchRadius = $("#ddlRadius").val();
		
		searchStr = "SELECT geometry FROM " + fusionTableId + " WHERE geometry not equal to ''";
		
		
		searchStr += " AND 'Datestamp' >= '" + $('#txtStartTime').val() + "'";
        searchStr += " AND 'Datestamp' <= '" + $('#txtEndTime').val() + "'";
		
		
		// because the geocode function does a callback, we have to handle it in both cases - when they search for an address and when they dont
		if (address != "")
		{
			if (address.toLowerCase().indexOf("chicago") == -1)
				address = address + " chicago";
			_trackClickEventWithGA("Search", "Plow Tracker", address);
			geocoder.geocode( { 'address': address}, function(results, status) 
			{
			  if (status == google.maps.GeocoderStatus.OK) 
			  {
				//console.log("found address: " + results[0].geometry.location.toString());
				map.setCenter(results[0].geometry.location);
				map.setZoom(14);
				
				addrMarker = new google.maps.Marker({
				  position: results[0].geometry.location, 
				  map: map, 
				  icon: addrMarkerImage,
				  animation: google.maps.Animation.DROP,
				  title:address
				});
				drawSearchRadiusCircle(results[0].geometry.location);
				
				searchStr += " AND ST_INTERSECTS(geometry, CIRCLE(LATLNG" + results[0].geometry.location.toString() + "," + searchRadius + "))";
				
				//get using all filters
				//console.log(searchStr);
				searchrecords = new google.maps.FusionTablesLayer(fusionTableId, {
					query: searchStr}
					);
					
				searchrecords2 = new google.maps.FusionTablesLayer(fusionTableId2, {
					query: searchStr.replace(fusionTableId+"",fusionTableId2+"")}
					);
			
				searchrecords.setMap(map);
				searchrecords2.setMap(map);
				//displayCount(searchStr);
			  } 
			  else 
			  {
				alert("We could not find your address: " + status);
			  }
			});
		}
		else
		{
			//get using all filters
			//console.log(searchStr);
			searchrecords = new google.maps.FusionTablesLayer(fusionTableId, {
				query: searchStr}
				);
			searchrecords2 = new google.maps.FusionTablesLayer(fusionTableId2, {
				query: searchStr.replace(fusionTableId+"",fusionTableId2+"")}
				);
		
			searchrecords.setMap(map);
			searchrecords2.setMap(map);
			//displayCount(searchStr);
		}
  	}
	
	function clearSearch() {
		if (searchrecords != null)
			searchrecords.setMap(null);
		if (searchrecords2 != null)
			searchrecords2.setMap(null);	
		if (addrMarker != null)
			addrMarker.setMap(null);	
		if (searchRadiusCircle != null)
			searchRadiusCircle.setMap(null);
		
		records.setMap(null);
	}

 function findMe() {
	  // Try W3C Geolocation (Preferred)
	  var foundLocation;
	  
	  if(navigator.geolocation) {
	    navigator.geolocation.getCurrentPosition(function(position) {
	      foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
	      addrFromLatLng(foundLocation);
	    }, null);
	  }
	  else {
	  	alert("Sorry, we could not find your location.");
	  }
	}
	
	function addrFromLatLng(latLngPoint) {
	    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
	      if (status == google.maps.GeocoderStatus.OK) {
	        if (results[1]) {
	          $('#txtSearchAddress').val(results[1].formatted_address);
	          $('.hint').focus();
	          doSearch();
	        }
	      } else {
	        alert("Geocoder failed due to: " + status);
	      }
	    });
	  }
	
	function drawSearchRadiusCircle(point) {
	    var circleOptions = {
	      strokeColor: "#4b58a6",
	      strokeOpacity: 0.3,
	      strokeWeight: 1,
	      fillColor: "#4b58a6",
	      fillOpacity: 0.05,
	      map: map,
	      center: point,
	      radius: parseInt(searchRadius)
	    };
	    searchRadiusCircle = new google.maps.Circle(circleOptions);
	}
	
	function getFTQuery(sql) {
		var queryText = encodeURIComponent(sql);
		return new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq='  + queryText);
	}
	
	function displayCount(searchStr) {
	  //set the query using the parameter
	  searchStr = searchStr.replace("SELECT geometry ","SELECT Count() ");
	  
	  //set the callback function
	  getFTQuery(searchStr).send(displaySearchCount);
	}
	
	function getLastUpdated() {
		//set the query using the parameter
	  var searchStr = "SELECT Datestamp FROM " + fusionTableId + " ORDER BY Datestamp DESC LIMIT 1";
	  
	  //set the callback function
	  getFTQuery(searchStr).send(displayLastUpdated);
	
	}
	
	function displayLastUpdated(response) {
	  var date = "";
	  if (response.getDataTable().getNumberOfRows() > 0)
	  {
	  	  date = response.getDataTable().getValue(0, 0);
	  	  date = $.format.date(new Date(date), "MMM dd, yyyy h:mm a")
		  //alert(date);
		  $( "#lastUpdated" ).fadeOut(function() {
	        $( "#lastUpdated" ).html("Last updated: " + date);
	      });
		  $( "#lastUpdated" ).fadeIn();
	  }
	}

	function displaySearchCount(response) {
	  var numRows = 0;
	  if (response.getDataTable().getNumberOfRows() > 0)
	  	numRows = parseInt(response.getDataTable().getValue(0, 0));
	  var name = recordNamePlural;
	  if (numRows == 1)
		name = recordName;
	  $( "#resultCount" ).fadeOut(function() {
        $( "#resultCount" ).html(addCommas(numRows) + " " + name + " found");
      });
	  $( "#resultCount" ).fadeIn();
	}
	
	function addCommas(nStr)
	{
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}