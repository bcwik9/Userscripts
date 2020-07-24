// ==UserScript==
// @name CheapCaribbean.com Searcher
// @namespace Violentmonkey Scripts
// @match https://www.cheapcaribbean.com/search/*
// @grant none
// @author Ben Cwik
// @require https://cdnjs.cloudflare.com/ajax/libs/Dynatable/0.3.1/jquery.dynatable.min.js
// ==/UserScript==

// load datatables css
$('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/Dynatable/0.3.1/jquery.dynatable.min.css" type="text/css" />');

var results = {} // store all our data if we want to process later
var search_area = $("#searchlist,.ccContent div.twoColumns:first")
var results_wait_delay = 10000

var results_done = function(){
  $("#search_status").text("")
  // display results on table
  search_area.html('<table id="hotel_table" style="width:100%"><thead><tr><th>Name</th><th>Location</th><th>Price</th><th>Rating</th><th>Customer Rating</th><th>Number Reviews</th></tr></thead><tbody></tbody></table>')
  $.each(results, function(name, info){
    $("#hotel_table tbody").append('<tr><td><a target="_blank" href="' + info["url"] + '">' + name + '</a></td><td>' + info["location"] + '</td><td>' + info["price"] + '</td><td>' + info["site_rating"] + '</td><td>' + info["customer_rating"] + '</td><td>' + info["num_reviews"] + '</td></tr>')
  })
  $('#hotel_table').bind('dynatable:init', function(e, dynatable) {
    dynatable.sorts.add('price', 1);
    dynatable.paginationPerPage.set(20);
  }).dynatable({
    readers: {
      'price': function(el, record) {
        return Number(el.innerHTML) || 0;
      },
      'numberReviews': function(el, record) {
        return Number(el.innerHTML) || 0;
      }
    }
  });
}

var handle_error = function(data,status,error){
  console.warn("Failed to fetch page. Locale id: " + data.responseURL.match(/localeId=(\d+)/))
  console.warn(data)
}

var parse_hotel_results = function(data,status){
  // uncomment to display results in page, but can crash page
  //$("#deals").append(data)
  
  var resorts = $(data).find(".resort-result")
  $.each(resorts, function(index,resort){
    var info = {}
    var name = $(resort).find(".resort-title a").text()
    info["url"] = $(resort).find(".resort-title a").attr("href")
    info["location"] = $(resort).find(".resort-location").text()
    info["price"] = $(resort).find(".from-price").text().trim().replace(/(\$|,|\*)/g,'')
    info["site_rating"] = $(resort).find(".cc-rating .rating-text strong").text()
    info["customer_rating"] = $(resort).find(".customer-rating .rating-text strong").text()
    info["num_reviews"] = $(resort).find(".customer-rating a:last").text().replace(/\s+Reviews?/, '')
    // save result for later processing
    results[name]= info
    // reset results done event
    window.clearTimeout(window.table_timeout)
    window.table_timeout = window.setTimeout(results_done, results_wait_delay)
    $("#search_status").text("Searching EVERYTHING... found " + Object.keys(results).length + " results.")
  })
}

var execute_search = function(){
  // disable button
  $("#searchItAll").css("display", "none")
  // replace existing results with new table
  search_area.html('<h1 id="search_status">Searching EVERYTHING... found 0 results.</h3>')
  window.table_timeout = window.setTimeout(results_done, results_wait_delay)
  
  // search everything!
  var destinations = $("#destinationForHotel option")
  var url = window.location.href.replace(/&searchParameters\.localeId=\d+/, "").replace(/&dealStart=\d+/,"").replace(/&dealEnd=\d+/,"")
  $.each(destinations, function(index,data){
    var locale = $(data).val()
    if(locale > 0){
      console.log("Requesting page for " + $(data).text())
      $.ajax({
        url: (url + "&searchParameters.localeId=" + locale + "&dealStart=0&dealEnd=250"),
        type: "GET",
        beforeSend: function(xhr){xhr.setRequestHeader('authority', 'www.cheapcaribbean.com');},
        success: parse_hotel_results,
        error: handle_error
      })
    }
  })
}

var init = function(){
  // create button to click to search
  $(".viewResults").append('<br><br><button id="searchItAll" type="button" class="commonButton oneColumnButton" style="width:100%">Search Everything</button>')
  $("#searchItAll").click(execute_search)
  // hide search button if user changes form
  $("#osbForm input,select").click(function(){
    $("#searchItAll").css("display", "none")
  })
}

setTimeout(init, 1500)
