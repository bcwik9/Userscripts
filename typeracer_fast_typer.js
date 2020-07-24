// ==UserScript==
// @name        TypeRacer.com typer
// @namespace   Violentmonkey Scripts
// @match       https://play.typeracer.com/
// @grant       none
// @version     1.0
// @author      Ben Cwik
// @description 4/17/2020, 10:24:29 PM
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==



// To use this, load a practice or race then move your mouse over the text input area once the race starts.
// Every time you move your mouse over the input, it should enter a single word of the text and submit it.
// Keep moving your mouse over the input area until you're done!

$(function(){
  var getTypeText = function(){
    var elements = $("span[unselectable=on]");
    if(elements.length){
      // text block to type found! stop searching
      clearInterval(get_text_interval);
      
      var words = $.map(elements, function(e, i){
        return $(e).text();
      }).join('').split(' ');
      //console.log(words);
      var i = 0;
      
      // Every time we mouseover, copy the next word to the input area
      $(".txtInput").mouseover(function(){
        $(".txtInput").val(words[i] + ' ');
        i++;
      })
    }
  }
  
  // keep scanning for a text block that we're supposed to type
  var get_text_interval = setInterval(getTypeText, 1000);
});
