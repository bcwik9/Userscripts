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
  var card_list = $('div[class^="FavoritesList__ListCardsWrapper"]');
  var menu_wrap = $('div[class^="FavoritesList__MenuBarWrapper"]');
  var stats = $('div[class^="MenuBar__StatusCountsStyleWrapper"] label').text();
  var card = $(card_list.children()[0]);
  var card_html;
  var datatable;
  
  var active_listing_regex = /(for.sale|pre.foreclosure)/i;
  var pending_listing_regex = /(contingent|accepting.backups|pending|under.contract)/i;
  var off_market_listing_regex = /(sold|off.market|other|recently.sold)/i;
  
  var init_table = function(){
    // load CSS
    $('head').append('<link rel="stylesheet" href="https://cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css" type="text/css" />');
    
    // add table to dom
    var info_html = '<br><h2>Saved Homes</h2>'+
        '<p>'+ stats +'</p>';
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
        '<th>Saves per Day</th>'+
        '<th>Saves</th>'+
        '<th>Days on Zillow</th>'+
        '<th>Date Saved</th>'+
        '<th>Notes</th>'+
        '</tr></thead>'+
        '<tbody></tbody>'+
        '</table>';
    
    main_body.html(
      '<div style="margin-left:100px;margin-right:100px;text-align:center;">'+
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
      var attempts = 0;
      var interval = setInterval(function(){
        if(data['picture_url'] && data['facts']){
          clearInterval(interval);
          var parking_match = get_fact(data['facts'], 'Parking').match(/(\d+)/);
          var parking = parking_match ? parking_match[1] : '';
          var days_on_fact = get_fact(data['facts'], 'Days on Zillow');
          var days_on_match = days_on_fact ? days_on_fact.match(/(\d+)/) : undefined;
          var days_on_zillow = days_on_match ? days_on_match[1] : '';
          var saves = get_fact(data['facts'], 'Saves');
          var saves_per_day;
          if(saves && days_on_zillow){
            saves = parseInt(saves.replaceAll(',',''));
            days_on_zillow = parseInt(days_on_zillow);
            saves_per_day = (saves / days_on_zillow).toFixed(2);
          }
          var row = '<tr data-zpid='+ data['zpid'] +'>'+
              '<td><a href="'+ data['url'] +'" target="_blank">'+'<img src="'+ data['picture_url'] +'" style="max-width:200px;max-height:150px;"></a></td>'+
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
              '<td>'+ saves_per_day + '</td>'+
              '<td>'+ saves + '</td>'+
              '<td>'+ days_on_zillow + '</td>'+
              '<td>'+ data['raw_saved_date'] + '</td>'+
              '<td><textarea class="note">'+ data['notes'] +'</textarea></td>'+
              '</tr>';
          body.append(row);
        } else {
          attempts++;
          if(attempts > 20) {
            // retry, probably network failure or something
            console.log("No data yet for listing index " + listing_id + ". Retrying.");
            attempts = 0;
            data = data_for_property(listing_id);
          }
        }
      }, 100);
    });
    
    // wait for data to be populated before initializing DataTables
    var data_ready = setInterval(function(){
      var num_listings_ready = body.find('tr').length;
      if(num_listings_ready == listings.length){
        clearInterval(data_ready);
        datatable = table.DataTable({
          lengthMenu: [[-1, 10, 25, 50], ['All', 10, 25, 50]],
          order: [[21, "desc" ]],
          columns:[
            {data: 'picture'},
            {data: 'price', render: render_number},
            {data: 'status', render: render_status},
            {data: 'bed', render: render_number},
            {data: 'bath', render: render_number},
            {data: 'sqft', render: render_number},
            {data: 'city'},
            {data: 'state'},
            {data: 'zip', render: render_number},
            {data: 'type'},
            {data: 'built', render: render_number},
            {data: 'heating'},
            {data: 'cooling'},
            {data: 'parking'},
            {data: 'hoa', render: render_number},
            {data: 'lot', render: render_lot},
            {data: 'price/sqft', render: render_number},
            {data: 'brokerage'},
            {data: 'saves_per_day', render: render_number},
            {data: 'saves', render: render_number},
            {data: 'days_on_zillow', render: render_number},
            {data: 'date_saved', render: render_date},
            {data: 'notes', render: render_note}
          ]
        });
        // add filters to each column
        table.find('thead tr').clone(true).appendTo( '#custom-table thead' );
        table.find('thead tr:eq(1) th').each( function (i) {
          var title = $(this).text();
          $(this).attr('class', '');
          $(this).html( '<input type="text" placeholder="Search '+title+'" />' );
          var inputs = $('input', this);
          inputs.on( 'keyup change', function () {
            if(datatable.column(i).search() !== this.value) {
              datatable
                .column(i)
                .search( this.value )
                .draw();
            }
          });
        });
        
        // save notes when they are updated
        table.find('textarea.note').on('keyup change', function(e){
          var target = $(e.target);
          var note = target.val();
          var zpid = target.parents('tr').data('zpid');
          set_zillow_note(zpid, note);
        });
      }
    }, 250);
    
  }
  
  var render_note = function(data,type){
    if(type === 'display'){
      return data;
    }
    return $(data).val();
  } 
  
  var render_number = function(data,type){
    if(type === 'display'){
      return data;
    }
    var ret = 9999999;
    if(data){
      var match = data.replaceAll(',','').match(/(\d*\.?\d+)/);
      if(match && match[1]){
        ret = match[1];
      }else if(data === 'None'){
        ret = 0;
      }
    }
    return ret;
  }
  
  var render_lot = function(data,type){
    if(data){
      var no_commas = data.replaceAll(',','');
      var match = no_commas.match(/(\d*\.?\d+).*sqft/);
      if(match && match[1]){
        var sqft_in_one_acre = 43560.0;
        var acres = (parseFloat(match[1])/sqft_in_one_acre).toFixed(2);
        if(type === 'display'){
          return acres + ' acres';
        }
        return acres;
      }
      var match = no_commas.match(/(\d*\.?\d+).*acre/);
      if(match && match[1]){
        if(type === 'display'){
          return data;
        }
        return parseFloat(match[1]).toFixed(2);
      }
    }
    return data;
  }
  
  var render_date = function(raw_date,type){
    if(type === 'display'){
      var date = new Date(parseInt(raw_date));
      return date;
    }
    return raw_date;
  }
  
  var render_status = function(data,type){
    if(type === 'display'){
      return data;
    }
    var ret = 'Off Market';
    if(data.match(active_listing_regex)){
      ret = 'Active';
    }
    if(data.match(pending_listing_regex)){
      ret = 'Pending'
    }
    return ret;
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
    
    // load notes
    var notes = get_zillow_notes();
    property_data['notes'] = notes[property_data['zpid']] || '';
     
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
          if(data['data']['property']){
            property_data['facts'] = data['data']['property']['homeFacts']['atAGlanceFacts'];
          } else {
            console.log("Couldn't retrieve facts for " + property_data['zpid']);
          }
          
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
          if(data['data']['property']){
            property_data['picture_url'] = data['data']['property']['photos'][0]['url'];
          } else {
            console.log("Couldn't retrieve photos for " + property_data['zpid']);
          }
        });
      }
    )
    .catch(function(err) {
      console.log('Picture Fetch Error :-S', err);
    })
    
    return property_data;
  }
  
  var get_zillow_notes = function(){
    if(localStorage.zillow_notes == undefined){
      return {};
    } else {
      return JSON.parse(localStorage.zillow_notes);
    }
  }

  var set_zillow_note = function(zpid, note){
    var notes = get_zillow_notes();
    notes[zpid] = note;
    localStorage.zillow_notes = JSON.stringify(notes);
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
    var body = "{\"operationName\":\"GetPropertyPhotos\",\"variables\":{\"zpid\":" + zpid +"},\"query\":\"query GetPropertyPhotos($zpid: ID) {\\n  property(zpid: $zpid) {\\n    photos(count: 1, size: S) {\\n      url\\n      __typename\\n    }\\n    photoCount\\n    googleStaticMapSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", type: SATELLITE, width: 400, height: 215)\\n    googleStreetViewImageSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", locationType: ADDRESS, width: 400, height: 215)\\n    googleStreetViewMetadataSignedUrl(featureArea: \\\"mzFavoritesListCard\\\", locationType: ADDRESS)\\n    __typename\\n  }\\n}\\n\"}";
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
  
  setTimeout(init, 1000);
});
