// ==UserScript==
// @name        Zillow Favorites Enhancer
// @namespace   Violentmonkey Scripts
// @match       https://www.zillow.com/myzillow/favorites
// @grant       none
// @version     1.0
// @author      Ben Cwik
// @description Easily search and sort your favorite properties on Zillow
// @downloadURL https://raw.githubusercontent.com/bcwik9/Userscripts/master/zillow_favorite_enhancer.js
// @require http://code.jquery.com/jquery-3.3.1.min.js
// @require http://cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js
// ==/UserScript==

$(function(){
  var data = JSON.parse($("#__NEXT_DATA__").text())['props']['apolloInitialCacheData'];
  var main_body = $('div[class^="Favorites__SavedHomesWrapper"]');
  var card_list = $("div[class^='FavoritesList__ListCardsWrapper']");
  var menu_wrap = $('div[class^="FavoritesList__MenuBarWrapper"]');
  var card = $(card_list.children()[0]);
  var card_html;
  
  var active_listing_regex = /(for.sale|pre.foreclosure)/i;
  var pending_listing_regex = /(contingent|accepting.backups|pending|under.contract)/i;
  var off_market_listing_regex = /(sold|off.market|other|recently.sold)/i;
  
  var init_table = function(){
    // load datatables CSS
    $('head').append('<link rel="stylesheet" href="https://cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css" type="text/css" />');
    
    // add table to dom
    var info_html = '<br><h2 style="text-align:center;">Saved Homes</h2>';
    var table_html = '<table id="custom-table" class="display compact" style="width:100%;text-align:center;"><thead><tr>'+
        '<th>Picture</th>'+
        '<th>Price</th>'+
        '<th>Status</th>'+
        '<th>Bed</th>'+
        '<th>Bath</th>'+
        '<th>Sqft</th>'+
        '<th>City</th>'+
        '<th>State</th>'+
        '<th>Zip</th>'+
        '<th>Type</th>'+
        '<th>Built</th>'+
        '<th>Heating</th>'+
        '<th>Cooling</th>'+
        '<th>Parking</th>'+
        '<th>HOA</th>'+
        '<th>Lot</th>'+
        '<th>Price/sqft</th>'+
        '<th>Brokerage</th>'+
        '<th>Saves</th>'+
        '<th>Days on Zillow</th>'+
        '<th>Date Saved</th>'+
        '</tr></thead>'+
        '<tbody></tbody>'+
        '</table>';
    
    main_body.html(
      '<div style="margin-left:100px;margin-right:100px;">'+
      info_html+
      table_html+
      '</div>'
    );
    var table = $('#custom-table');
    var body = table.find('tbody');
    
    // populate the table with row data
    var listings = all_listings();
    $.each(listings, function(i,listing_id){
      var data = data_for_property(listing_id);
      var interval = setInterval(function(){
        if(data['picture_url'] && data['facts']){
          clearInterval(interval);
          var parking_match = get_fact(data['facts'], 'Parking').match(/(\d+)/);
          var parking = parking_match ? parking_match[1] : '';
          var days_on_fact = get_fact(data['facts'], 'Days on Zillow');
          var days_on_match = days_on_fact ? days_on_fact.match(/(\d+)/) : undefined;
          var days_on_zillow = days_on_match ? days_on_match[1] : '';
          var row = '<tr>'+
              '<td><a href="'+ data['url'] +'">'+'<img src="'+ data['picture_url'] +'" style="max-width:200px;max-height:150px;"></a></td>'+
              '<td>'+ data['price'] + '</td>'+
              '<td>'+ data['status'] + '</td>'+
              '<td>'+ data['bedrooms'] + '</td>'+
              '<td>'+ data['bathrooms'] + '</td>'+
              '<td>'+ data['living_area'] + '</td>'+
              '<td>'+ data['city'] + '</td>'+
              '<td>'+ data['state'] + '</td>'+
              '<td>'+ data['zipcode'] + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Type') + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Year Built') + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Heating') + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Cooling') + '</td>'+
              '<td>'+ parking + '</td>'+
              '<td>'+ get_fact(data['facts'], 'HOA') + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Lot') + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Price/sqft') + '</td>'+
              '<td>'+ data['brokerage'] + '</td>'+
              '<td>'+ get_fact(data['facts'], 'Saves') + '</td>'+
              '<td>'+ days_on_zillow + '</td>'+
              '<td>'+ data['raw_saved_date'] + '</td>'+
              '</tr>';
          body.append(row);
        }
      }, 100);
    });
    
    // wait for data to be populated before initializing DataTables
    var data_ready = setInterval(function(){
      if(body.find('tr').length == listings.length){
        clearInterval(data_ready);
        table.DataTable({
          "lengthMenu": [[-1, 10, 25, 50], ['All', 10, 25, 50]],
          "order": [[20, "desc" ]],
          "columns":[
            {data: 'picture'},
            {data: 'price'},
            {data: 'status'},
            {data: 'bed'},
            {data: 'bath'},
            {data: 'sqft'},
            {data: 'city'},
            {data: 'state'},
            {data: 'zip'},
            {data: 'type'},
            {data: 'built'},
            {data: 'heating'},
            {data: 'cooling'},
            {data: 'parking'},
            {data: 'hoa'},
            {data: 'lot'},
            {data: 'price/sqft'},
            {data: 'brokerage'},
            {data: 'saves'},
            {data: 'days_on_zillow', render: render_days_on_zillow},
            {data: 'date_saved', render: render_date}
          ]
        });
      }
    }, 250);
    
  }
  
  var render_days_on_zillow = function(data,type){
    if(type === 'display'){
      return data;
    }
    return data ? data : 99999999;
  }
  
  var render_date = function(raw_date,type){
    if(type === 'display'){
      var date = new Date(parseInt(raw_date));
      return date;
    }
    return raw_date;
  }
  
  var data_for_property = function(data_index){
    var property_data = {};
    var regex = new RegExp('\\.' + data_index + '(\\.|$)');
    $.each(data, function(key,val){
      if(key.match(regex)){
        //console.log(key);
        //console.log(val);
        //console.log('---------------------------')
        var base_regex = new RegExp('\\.' + data_index + '$');
        if(key.match(base_regex)){
          property_data['raw_saved_date'] = val['savedDate'];
          var date = new Date(val['savedDate']);
          property_data['saved_date'] = date;
          property_data['short_saved_date'] = [date.getFullYear(), date.getMonth(), date.getDate()].join('/');
        }
        if(key.match(/property$/)){
          property_data['status'] = titleize(val['homeStatus']);
          var status_class= 'zsg-icon-for-sale';
          if(val['homeStatus'].match(off_market_listing_regex)){
            status_class = 'zsg-icon-off-market';
          }
          property_data['status_icon'] = '<span class="list-card-type-icon '+ status_class +'"></span>';
          
          property_data['price'] = val['countryCurrency'] + val['price'];
          property_data['bedrooms'] = val['bedrooms'];
          property_data['bathrooms'] = val['bathrooms'];
          property_data['living_area'] = val['livingArea'];
          property_data['url'] = val['hdpUrl'];
          property_data['zpid'] = val['zpid'];
        }
        if(key.match(/address$/)){
          property_data['street_address'] = val['streetAddress'];
          property_data['city'] = val['city'];
          property_data['state'] = val['state'];
          property_data['zipcode'] = val['zipcode'];
          property_data['full_address'] = val['streetAddress']+', '+val['city']+', '+val['state']+ ' ' + val['zipcode'];;
        }
        if(key.match(/postingContact$/)){
          property_data['brokerage'] = val['brokerageName'];
        }
      }
    });
     
    // fetch additional info not provided on the page already
    fetch_home_details(property_data['zpid']).then(
      function(response) {
        // check for errors
        if (response.status !== 200) {
          console.log('Looks like there was a problem fetching details. Status Code: ' +
            response.status);
          return;
        }

        // process response and replace property facts
        response.json().then(function(data) {
          property_data['facts'] = data['data']['property']['homeFacts']['atAGlanceFacts'];
        });
      }
    )
    .catch(function(err) {
      console.log('Detail Fetch Error :-S', err);
    })
    
    // fetch pictures
    fetch_property_pictures(property_data['zpid']).then(
      function(response) {
        // check for errors
        if (response.status !== 200) {
          console.log('Looks like there was a problem fetching pictures. Status Code: ' +
            response.status);
          return;
        }

        // process response and replace property facts
        response.json().then(function(data) {
          property_data['picture_url'] = data['data']['property']['photos'][0]['url'];
        });
      }
    )
    .catch(function(err) {
      console.log('Picture Fetch Error :-S', err);
    })
    
    return property_data;
  }
  
  var fetch_home_details = function(zpid){
    var body = "{\"operationName\":\"GetPropertyFacts\",\"variables\":{\"zpid\":" + zpid +"},\"query\":\"query GetPropertyFacts($zpid: ID) {\\n  property(zpid: $zpid) {\\n    homeType\\n    homeFacts {\\n      atAGlanceFacts {\\n        factLabel\\n        factValue\\n        __typename\\n      }\\n      __typename\\n    }\\n    lotSize\\n    __typename\\n  }\\n}\\n\"}";
    return graphql_fetch(body);
  }
  
  var get_fact = function(facts, fact_key){
    var ret;
    $.each(facts, function(i,fact){
      if(fact['factLabel'] === fact_key){
        ret = fact['factValue'];
      }
    });
    return ret;
  }
  
  var fetch_property_pictures = function(zpid){
    var body = "{\"operationName\":\"GetPropertyPhotos\",\"variables\":{\"zpid\":" + zpid +"},\"query\":\"query GetPropertyPhotos($zpid: ID) {\\n  property(zpid: $zpid) {\\n    photos(count: 1, size: XXL) {\\n      url\\n      __typename\\n    }\\n    photoCount\\n    googleStaticMapSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", type: SATELLITE, width: 400, height: 215)\\n    googleStreetViewImageSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", locationType: ADDRESS, width: 400, height: 215)\\n    googleStreetViewMetadataSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", locationType: ADDRESS)\\n    __typename\\n  }\\n}\\n\"}";
    return graphql_fetch(body);
  }
  
  var graphql_fetch = function(body){
    return fetch("https://www.zillow.com/graphql/", {
      "headers": {
        "accept": "*/*",
        "cache-control": "no-cache",
        "content-type": "text/plain",
        "pragma": "no-cache"
      },
      "body": body,
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    });
  }
  
  var titleize = function(str) {
    return str.replaceAll('_', ' ');
  }
  
  var all_listings = function(){
    return find_listings(/./);
  }
  
  var active_listings = function(){
    return find_listings(active_listing_regex);
  }
  
  var pending_listings = function(){
    return find_listings(pending_listing_regex);
  }
  
  var off_market_listings = function(){
    return find_listings(off_market_listing_regex);
  }
  
  var find_listings = function(status_regex){
    var matched = [];
    $.each(data, function(key,val){
      var match = key.match(/(\d+)\.property$/)
      if(match && val['homeStatus'].match(status_regex)){
        matched.push(match[1]);
      }
    });
    return matched;
  }
  
  var init = function(){
    var load_button_html = '<br><button id="load-table">Load Table View</button>';
    menu_wrap.append(load_button_html);
    var load_button = menu_wrap.find('#load-table')
    load_button.addClass($("button:contains('Share')")[0].className);
    load_button.click(init_table);
  }
  
  init();
});
