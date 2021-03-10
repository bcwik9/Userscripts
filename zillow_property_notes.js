// ==UserScript==
// @name        Zillow Property Notes
// @namespace   Violentmonkey Scripts
// @match       https://www.zillow.com/homedetails/*
// @grant       none
// @version     1.0
// @author      Ben Cwik
// @description Record notes about a property on the Zillow property detail page
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

$(function(){  
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
  
  var get_zpid = function(){
    var zpid_match = window.location.pathname.match(/\/(\d+)_zpid\/?$/);
    if(zpid_match && zpid_match[1]){
      return zpid_match[1];
    } else {
      console.log("Failed to get ZPID to save note");
    }
  }
  
  var note_html = '<div class="custom-notes" style="margin-left:17px;margin-right:17px;">'+
    '<b><label>Notes</label></b>'+
    '<textarea>'+
    (get_zillow_notes()[get_zpid()] || '') +
    '</textarea>'+
    '</div>';
  
  var init = function(){
    var data_wrap = $('.ds-data-col');
    var data_chip = data_wrap.find('.ds-chip');
    var button_wrap = data_wrap.find('.ds-buttons');
    button_wrap.after(note_html);
    var textarea = data_wrap.find('.custom-notes textarea');
    
    // save notes when they are updated
    textarea.on('keyup change', function(e){
      var target = $(e.target);
      var note = target.val();
      set_zillow_note(get_zpid(), note);
    });
  }
  
  init();
});