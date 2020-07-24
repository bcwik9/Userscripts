// ==UserScript==
// @name        Zillow Favorites Enhancer
// @namespace   Violentmonkey Scripts
// @match       https://www.zillow.com/myzillow/favorites
// @grant       none
// @version     1.0
// @author      Ben Cwik
// @description 7/23/2020, 5:15:54 PM
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

$(function(){
  var data = JSON.parse($("#__NEXT_DATA__").text())['props']['apolloInitialCacheData'];
  var card_list = $("div[class^='FavoritesList__ListCardsWrapper']");
  var menu_wrap = $('div[class^="FavoritesList__MenuBarWrapper"]');
  var card = $(card_list.children()[0]);
  var card_html;
  
  var active_listing_regex = /(for.sale|pre.foreclosure)/i;
  var pending_listing_regex = /(contingent|accepting.backups|pending|under.contract)/i;
  var off_market_listing_regex = /(sold|off.market|other|recently.sold)/i;
  
  var zillow_page_loaded = function(){
    console.log("ZILLOW PAGE LOADED");
    
    // add new select filter
    var existing_select = menu_wrap.find('select')[0];
    var existing_label = menu_wrap.find('label')[0];
    menu_wrap.append(select_html);
    var custom_filter = menu_wrap.find('select#custom-filter');
    var custom_label = menu_wrap.find('label#custom-label');
    custom_filter.addClass(existing_select.className);
    custom_label.addClass(existing_label.className);
    custom_filter.change(custom_filter_changed);
  };
  
  var custom_filter_changed = function(){
    // hide unrelated elements
    hide_other_elements();
    
    // append cards that match filter to result list
    var selected_val = $(event.target.selectedOptions[0]).val();
    var listings = eval(selected_val)();
    $.each(listings, function(i,listing_id){
      append_card(listing_id);
    });
    
    var menu_bar = $(menu_wrap.children()[0]);
    menu_bar.html('<h3>'+ listings.length + ' Listing(s) Shown</h3>');
    menu_bar.css('background','none');
    menu_bar.css('border','none');
  }
  
  var hide_other_elements = function(){
    // hide navigation for pagination
    var nav_pagination = card_list.siblings("nav");
    nav_pagination.hide();
    
    // clear existing results list
    card_list.html('');
  }
  
  var append_card = function(data_index){
    // append a placeholder card
    card_list.append(card_html);
    var new_card = card_list.children().last();
    var card_info = new_card.find('.list-card-info');
    var zpid, address;
    
    // hide the share button. TODO: get button to work?
    new_card.find('button:contains("Share")').hide();

    // hide save button. TODO: get button to work?
    new_card.find('button.list-card-save').hide();
    
    // replace the placeholder data with the actual data
    var regex = new RegExp('\\.' + data_index + '(\\.|$)');
    $.each(data, function(key,val){
      if(key.match(regex)){
        //console.log(key);
        //console.log(val);
        //console.log('---------------------------')
        if(key.match(/property$/)){
          // status. TODO: match status icon with actual status (maybe just change color?)
          var status_wrap = card_info.find('.list-card-type');
          var status_class= 'zsg-icon-for-sale';
          if(val['homeStatus'].match(off_market_listing_regex)){
            status_class = 'zsg-icon-off-market';
          }
          var status_icon = '<span class="list-card-type-icon '+ status_class +'"></span>';
          status_wrap.html(status_icon + titleize(val['homeStatus']));
          // price
          var price = card_info.find('.list-card-price');
          price.text(val['countryCurrency'] + val['price']);
          // details
          var details = card_info.find('.list-card-details');
          var bedrooms = $(details.find('li')[0]);
          var bedroom_label = bedrooms.find('abbr').prop('outerHTML');
          bedrooms.html(val['bedrooms'] + bedroom_label);
          var bathrooms = $(details.find('li')[1]);
          var bathroom_label = bathrooms.find('abbr').prop('outerHTML');
          bathrooms.html(val['bathrooms'] + bathroom_label);
          var living_area = $(details.find('li')[2]);
          var living_area_label = living_area.find('abbr').prop('outerHTML');
          living_area.html(val['livingArea'] + living_area_label);
          // URL link
          var link_url = new_card.find('.list-card-link');
          link_url.prop('href', val['hdpUrl']);
          // ZPID
          zpid = val['zpid'];
        }
        if(key.match(/address$/)){
          var address_wrap = card_info.find('.list-card-addr');
          address = val['streetAddress']+', '+val['city']+', '+val['state']+ ' ' + val['zipcode'];
          address_wrap.text(address);
        }
        if(key.match(/postingContact$/)){
          var brokerage = new_card.find('.list-card-brokerage .list-card-truncate');
          brokerage.text(val['brokerageName']);
        }
      }
    });
    
    // replace zpid
    var article = new_card.find('article.list-card');
    article.attr('id', 'zpid_'+zpid);
    
    // fetch additional info not provided on the page already
    fetch_home_details(zpid).then(
      function(response) {
        // check for errors
        if (response.status !== 200) {
          console.log('Looks like there was a problem fetching details. Status Code: ' +
            response.status);
          return;
        }

        // process response and replace property facts
        response.json().then(function(data) {
          var facts = data['data']['property']['homeFacts']['atAGlanceFacts'];
          var detail_list = new_card.find('ul[data-loading="false"]');
          $.each(detail_list.children('li'), function(i,e){
            var label = $(e).find('label');
            var value = label.siblings();          
            var new_value = get_fact(facts, label.text())
            if(new_value){
              value.text(new_value);            
            } else {
              console.log("Couldn't replace fact: " + label.text() + ". Deleting element.");
              $(e).remove();
            }
          })
        });
      }
    )
    .catch(function(err) {
      console.log('Detail Fetch Error :-S', err);
    })
    
    // fetch pictures
    fetch_property_pictures(zpid).then(
      function(response) {
        // check for errors
        if (response.status !== 200) {
          console.log('Looks like there was a problem fetching pictures. Status Code: ' +
            response.status);
          return;
        }

        // process response and replace property facts
        response.json().then(function(data) {
          var new_pic_url = data['data']['property']['photos'][0]['url'];
          var img = new_card.find('.list-card-link img');
          img.prop('src', new_pic_url);
          img.attr('alt', address);
        });
      }
    )
    .catch(function(err) {
      console.log('Picture Fetch Error :-S', err);
    })    
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
  
  var select_html = '<br><label id="custom-label">Filter:</label>'+
      '<select id="custom-filter">'+
      '<option></option>'+
      '<option value="active_listings">Active Listings</option>'+
      '<option value="pending_listings">Pending Listings</option>'+
      '<option value="off_market_listings">Off Market Listings</option>'+
      '</select>';
  
  var titleize = function(str) {
    return str.replaceAll('_', ' ');
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
    // poll until zillow page is loaded, then save existing card HTML
    var loaded = false;
    var interval = setInterval(function(){
      var loaded_info_cards = card_list.find('div[data-loading="false"]');
      $.each(loaded_info_cards, function(i,card){
        // find a card with all 8 details (ie. lot size, sqft, type, date built, etc)
        if(!loaded && $(card).find('li').length >= 7){
          clearInterval(interval);
          loaded = true;
          card_html = $(loaded_info_cards[0]).parent().prop('outerHTML');
          zillow_page_loaded();
        }
      });
    }, 250);
  };
  
  init();
});
