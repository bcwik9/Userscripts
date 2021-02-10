// ==UserScript==
// @name        Mint.com Ad Blocker
// @namespace   Violentmonkey Scripts
// @match       https://mint.intuit.com/*
// @grant       none
// @version     1.0
// @author      Ben Cwik
// @description Hide ads and other distracting content on Mint.com
// ==/UserScript==

var hide_ads = function(){
  // HIDE WIDGET ADS
  var bad_widget_classes = ['mintWebCovidWidget', 'adviceWidget', 'w2sWidget'];
  var cards = document.getElementsByClassName('CardView');
  Array.from(cards).forEach(function(card, index){
    var display = true;
    card.className.split(' ').forEach(function(klass, klass_index){
      if(bad_widget_classes.includes(klass)){
        display = false;
      }
    })
    if(!display){
      console.log("MINT AD HIDER: HIDING " + card.className)
      card.style.display = 'none'; 
    }
  });

  // HIDE PROMOTIONS
  var promotions = document.getElementsByClassName('promotions-personalized-offers-ui');
  Array.from(promotions).forEach(function(ad, index){
    ad.style.display = 'none';
  })
  
  // HIDE UPSELLS
  // look for a paid disclosure div, and hide the parent element
  var upsells = document.getElementsByClassName('disclosureDiv');
  Array.from(upsells).forEach(function(ad, index){
    ad.parentElement.parentElement.style.display = 'none';
  })
}

// INIT
// poll for ads since they periodically load
setInterval(hide_ads, 1000);
