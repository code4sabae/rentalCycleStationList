window.onload = function () {
  var mapDiv = document.getElementById("map-canvas");

  var map = new google.maps.Map(mapDiv, {
    center: new google.maps.LatLng(35.6, 135.9),
    zoom: 11,
  });


  var query = `prefix  geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
  prefix jrrk: <http://purl.org/jrrk#>
  prefix schema: <http://schema.org/>
  prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  prefix odp:             <http://odp.jig.jp/odp/1.0#>
  prefix ic:              <http://imi.go.jp/ns/core/rdf#>
  prefix rdf:             <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

  select ?label ?lat ?lng ?type {
    {?s ?p odp:TourSpot;
rdfs:label ?label;
geo:lat ?lat;
geo:long ?lng;
ic:住所[ic:都道府県 ?pref];
rdf:type ?type.
filter (lang(?label) = 'ja')
filter (contains(str(?pref),"福井県"))
}
UNION
  {
?s ?p odp:RentalCycleStation;
    rdfs:label ?label;
    geo:lat ?lat;
    geo:long ?lng;
    rdf:type ?type.
    filter (lang(?label) = 'ja')
    }

    }limit 1000
    `;

  console.log("clear");

  var endpointSparql = "https://sparql.odp.jig.jp/api/v1/sparql";

  var rentalCycleStation = "http://odp.jig.jp/odp/1.0#RentalCycleStation";
  var tourSpot = "http://odp.jig.jp/odp/1.0#TourSpot";

  querySparql(endpointSparql, query, function (data) {
    console.log(data);

    var items = data.results.bindings;
    var spotCounter = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      var lat = item.lat.value;
      var lng = item.lng.value;
      var label = item.label.value;
      var type = item.type.value;
      if (type == rentalCycleStation) {
        icon = "images/orangecycle.png"
        item.neighbor = [];
        for (var j = 0; j < spotCounter; j++) {

          var deltaLat = abs(lat - items[j].lat.value) * 40000 * Math.cos(lng * Math.PI / 180) / 360;
          var deltaLng = abs(lng - items[j].lng.value) * 40000 / 360;
          var distance = (deltaLat * deltaLat) + (deltaLng * deltaLng);
          if (distance <= 10) {
            item.neighbor.push(items[j].label.value);
          }
        }

        console.log(item.neighbor);
      }
      else if (type == tourSpot) {
        icon = "images/center.png";
        spotCounter++;
      }
      //40000/360 * delta long
      //40000*cos(long*pi/180)/360 * delta lat

      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(lat, lng),
        icon: {
          url: icon,
          size: new google.maps.Size(100, 100),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(15, 15),
        },
        map: map
      });
      marker.item = item;
      google.maps.event.addListener(marker, "click", function (e) {
        text.innerHTML = this.item.label.value;
        if (this.item.type.value == rentalCycleStation) {
          text.innerHTML += "<div id='displayLabel'><p>近くの観光地リスト</p></div>" + this.item.neighbor;
          if (this.item.neighbor.length == 0) {
            text.innerHTML += "近くの観光地データはありません";
          }
        }
        map.panTo(this.getPosition());
      });
      if (type == rentalCycleStation) {
        var li = create("li");
        li.innerHTML = label;
        if (item.neighbor.length != 0) {
          li.innerHTML += " 近隣の観光地" + item.neighbor.length + "件";

        }
        li.marker = marker;
        li.onclick = function () {
          map.setZoom(13);
          map.panTo(this.marker.getPosition());
          text.innerHTML = "<div id='displayLabel'>レンタルサイクルステーション名 </div>" + this.marker.item.label.value;
          if (this.marker.item.type.value == rentalCycleStation) {
            text.innerHTML += "<div id='displayLabel'><p>近くの観光地リスト</p></div>" + this.marker.item.neighbor;
            if (this.marker.item.neighbor.length == 0) {
              text.innerHTML += "近くの観光地データはありません";
            }
          }
        };
        list.appendChild(li);
      }
    }

  });

};
var create = function (tag, cls) {
  var res = document.createElement(tag);
  if (cls != null)
    res.className = cls;
  return res;
};

var querySparql = function (baseurl, q, callback) {
  var url = baseurl + "?query=" + encodeURIComponent(q) + "&output=json" + "&callback=" + getCallbackMethod(callback);
  jsonp(url);
};
var getCallbackMethod = function (callback) {
  var scallback = "_cb_" + (Math.random() * 1000000 >> 0);
  window[scallback] = function (data) {
    window[scallback] = null;
    callback(data);
  };
  return scallback;
};

var jsonp = function (url) {
  var head = document.getElementsByTagName("head")[0];
  var script = document.createElement("script");
  script.setAttribute("src", url);
  script.setAttribute("type", "text/javascript");
  head.appendChild(script);
};
function abs(val) {
  return val < 0 ? -val : val;
};
