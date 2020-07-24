// ==UserScript==
// @name Amazon Lightning Deal Watcher
// @namespace Violentmonkey Scripts
// @match https://*.amazon.com/*
// @grant none
// @author Ben Cwik
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

var get_form_value = function(id){
  // read values off of add to cart form
  return $("#addToCart").find('#' + id).val();
}

var get_customer_data = function(){
  // amazon page function
  return gbResources.customerData;
}

var get_title = function(){
  return $("#title").text().trim();
}

var get_asin = function(){
  return get_form_value("ASIN");
}

var get_merchant_id = function(){
  //return get_form_value("merchantID");
  return get_customer_data().marketplaceId;
}

var get_session_id = function(){
  //return get_form_value("session-id");
  return get_customer_data().sessionId;
}

var get_customer_id = function(){
  return get_customer_data().customerId;
}

var draw_deal_table = function(deal_data){
  var deals = get_local_storage_deals();
  var table_html = ''
  $.each(deal_data.dealStatus, function(id, data){
    $.each(data.dealItemStatus, function(asin, status){
      var percent_claimed = '<td>' + status.percentClaimed + '</td>'
      var product_link = '<a href=' + deals[asin].url + '>' + deals[asin].title + '</a>'
      var color = 'white'
      var item_state_label = status.itemState
      var timeleft = Math.round(status.msToCustomerStateExpiry / 1000);
      if(status.customerState === 'NONE' || status.customerState === 'EXPIRED'){
        if(status.itemState === 'WAITLIST'){
          color = 'yellow'
          item_state_label = '<a class="deal_claim" href="#" data-asin="' + asin + '">Join waitlist</a>'
        }
        if(status.itemState === 'AVAILABLE'){
          color = 'lightgreen'
          item_state_label = '<a class="deal_claim" href="#" data-asin="' + asin + '">Claim</a>'
        }
      }
      if(status.itemState === 'WAITLIST' && status.customerState === 'PENDINGATC'){
        color = 'lightgreen'
        item_state_label = '<a class="deal_claim" href="#" data-asin="' + asin + '">Claim ('+ timeleft + ' secs left)</a>'
      }
      if(status.itemState === 'EXPIRED'){
        color = 'lightcoral'
      }
      if(status.customerState === 'INCART'){
        color = 'lightgreen'
        var url = location.origin + '/gp/cart/view.html'
        item_state_label = '<a href="' + url + '">Checkout ('+ timeleft + ' secs left)</a>'
      }
      var item_state = '<td style="background-color:' +color+'">' + item_state_label + '</td>'
      var remove_link = '<a class="remove_deal" href="#" data-asin="' + asin + '">Remove</a>'
      table_html += '<tr><td>' + product_link + '</td>' + percent_claimed + item_state + '<td>' + status.customerState + '</td><td>' + remove_link + '</td></tr>'
      console.log(data);
    })
  });
  $("#deal_watcher tbody").html(table_html);
  $("#deal_watcher a.deal_claim").click(function(e){
    e.preventDefault();
    var asin = $(e.currentTarget).data("asin");
    claim_deal(asin);
  })
  $("#deal_watcher a.remove_deal").click(function(e){
    e.preventDefault();
    var asin = $(e.currentTarget).data("asin");
    remove_deal(asin);
  })
}

var fetch_deal_status = function(){
  var deals_to_watch = get_local_storage_deals();
  var deal_param = $.map(deals_to_watch, function(data){
    return '{"dealID":"' + data.deal_id + '","itemIDs":["' + data.asin +'"]}'
  }).join();
  var body = '{"requestMetadata":{"marketplaceID":"' + get_merchant_id() + '","clientID":"goldbox_udp","sessionID":"' + get_session_id() + '","customerID":"' + get_customer_id() +'"},"responseSize":"STATUS_ONLY","itemResponseSize":"NONE","dealTargets":[' + deal_param + ']}'
  $.ajax({
      url: location.origin + '/xa/dealcontent/v2/GetDealStatus',
      type: 'post',
      data: body,
      headers: {
          "Content-Type": 'application/x-www-form-urlencoded'
      },
      dataType: 'json',
      success: draw_deal_table
  });  
}

var setup_add_to_watchlist_button = function(){
  if(!$("#deal_watch").length){
    $("#buybox").prepend('<button id="deal_watch">Add to deal watch list</button><br><br>');
    $("#deal_watch").click(add_current_product_to_deal_watch_list);
  }
}

var setup_display = function(){
  var title = '<h1>Your Watched Deals</h1>';
  var table = '<table id="deal_watcher"><thead><th>Name</th><th>% Claimed</th><th>Item Status</th><th>Your Status</th><th>Remove</th></thead><tbody></tbody></table><hr>';
  var deals_display = title + table;
  $("#title_feature_div").parent().prepend(deals_display);
  setInterval(setup_add_to_watchlist_button, 2000);
}

var add_current_product_to_deal_watch_list = function(data){
  var product_data = get_local_storage_deals();
  var deal_id = $("[id^=gb_atc_]")[0].id.match(/gb_atc_(.+)/)[1]
  product_data[get_asin()] = {
    title: get_title(),
    url: window.location.href,
    deal_id: deal_id,
    asin: get_asin()
  }
  set_local_storage_deals(product_data);
  fetch_deal_status();
}

var get_local_storage_deals = function(){
  if(localStorage.dealsToWatch == undefined){
    return {};
  } else {
    return JSON.parse(localStorage.dealsToWatch);
  }
}

var set_local_storage_deals = function(deals){
  localStorage.dealsToWatch = JSON.stringify(deals);
}

var claim_deal = function(asin){
  var deal_data = get_local_storage_deals()[asin]
  var widgetName = "udpDealLDWidget";
  var udp_deal_widget = Deal.udpController.getWidget(widgetName);
  if (udp_deal_widget === undefined || udp_deal_widget === null) {
      udp_deal_widget = new UDPDealWidget(widgetName);
      Deal.Widgets.push(udp_deal_widget);
  }

  udp_deal_widget.setDealId({
      "dealId" : deal_data.deal_id, 
      "legacyDealId" :"",
      "asin" : asin, 
      "dealType" : "LIGHTNING_DEAL",
      "primeAccessType" : "PRIME_ONLY_LD",
      "primeAccessDurationInMs" : 0
  });
  
  Deal.udpController.claimDeal(udp_deal_widget.widgetID, deal_data.deal_id, asin, 'gbdp_atc_web_', 1);
  fetch_deal_status();
}

var remove_deal = function(asin){
  var deals = get_local_storage_deals();
  delete deals[asin];
  set_local_storage_deals(deals);
  fetch_deal_status();
}

var init = function(){
  if(typeof(gbResources) !== 'undefined' && get_customer_id() !== undefined){
    clearInterval(startup);
    setup_display();
    setInterval(fetch_deal_status, 5000);
  } else {
    console.log("Missing resources for deal watching.")
  }
}

var startup = setInterval(init, 2000);
