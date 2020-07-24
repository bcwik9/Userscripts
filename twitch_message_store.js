// ==UserScript==
// @name         Twitch Message Store
// @namespace    TwitchMessageStore
// @version      0.1
// @description  Keeps track of Twitch messages when joining a channel and automatically replaces deleted ones with the original content!
// @author       Ben Cwik
// @match        https://www.twitch.tv/*
// @grant        none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

(function() {
    'use strict';

    var message_store = []
    var max_messages_stored = 200
    var current_store_index = 0

    var process_messages = function() {
        var messages = $(".chat-line__message")
        $.each(messages, function(index,v){
            var val = $(v)
            var deleted = val.find(".chat-line__message--deleted")
            if(val.attr("store-tag")){
                if(deleted.text().match(/^<message deleted>$/)){
                    console.log("trying to restore deleted message")
                    console.log(message_store[val.attr("store-tag")])
                    //deleted.text(message_store[val.attr("store-tag")])
                    //deleted.css("color", "red")
                    val.html(message_store[val.attr("store-tag")])
                    var author = val.find(".chat-author__display-name")
                    author.text(author.text() + " DELETED")
                }
                return true
            }
            var msg = ""
            var text_fragments = val.find(".text-fragment,img")
            $.each(text_fragments, function(index,v){
                var text_fragment = $(v)
                if(text_fragment.attr("alt")){
                    if(text_fragment.hasClass("chat-badge")){
                       return true
                    }
                    msg = msg + ":" + text_fragment.attr("alt") + ":"
                } else {
                    msg = msg + text_fragment.text()
                }
            })
            if(message_store.length < max_messages_stored){
                val.attr("store-tag", message_store.length)
                //message_store.push(msg)
                message_store.push(val.html())
            } else {
                val.attr("store-tag", current_store_index)
                //message_store[current_store_index] = msg
                message_store[current_store_index] = val.html()
                current_store_index = current_store_index + 1
                if(current_store_index == max_messages_stored){
                    current_store_index = 0
                }
            }
        })
        //console.log(message_store)
    }

    console.log("Starting Twitch message store!")
    setInterval(process_messages, 200)
})();
