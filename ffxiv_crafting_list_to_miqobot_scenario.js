// ==UserScript==
// @name         Crafting List to Miqo Scenario
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add @Lyfox code to a neat button
// @author       BC
// @match        *ffxivcrafting.com/crafting/from-list*
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/clipboard@1/dist/clipboard.min.js
// ==/UserScript==

(function() {
    'use strict';
    new Clipboard('.btn');
    var rJob = function(val){
        return $(val).children("td:eq(4)").children("img:eq(0)").attr("src").replace("/img/jobs","").replace("/","").replace("-inactive","").replace(".png","");
    };
    var rRecipe = function(val){
        return $(val).children("td:eq(0)").children("a:eq(1)").children("span").text();
    };
    var rNeeded = function(val){
        var txt = $(val).children("td:eq(1)").children("span").text();
        var val = $(val).children("td:eq(1)").children("input").val();
        return val > 0 ? val : txt;
    };
    var rYields = function(val){
        return $(val).attr("data-yields");
    };
    var rCount = function(val){
        return Math.ceil(rNeeded(val)/rYields(val));
    };
    var chapter = function(tableId){
        var reagents = $("tbody#"+tableId).children("tr.reagent").not(".success");
        reagents.sort(function(a, b){
            var lvlA = parseInt( $(a).attr("data-ilvl") );
            var lvlB = parseInt( $(b).attr("data-ilvl") );
            return (lvlA < lvlB) ? -1 : (lvlA > lvlB) ? 1 : 0;
        });
        for(var i=0; i<reagents.length; i++){
            var craftsLater = [];
            var from = -1;
            var to = -1;
            //console.log(reagents.get().map(rRecipe));
            $(reagents.get().reverse()).each(function(index){
                var itemId = $(this).attr("data-item-id");
                var requires = $(this).attr("data-requires").split("&").map(function(value){ return value.split("x")[1]; });
                var isCraftable = requires.reduce(function(isCraftable, requireId){
                    if(!isCraftable)
                        return false;
                    if(craftsLater.indexOf(requireId)>=0){
                        from = index;
                        to = craftsLater.indexOf(requireId);
                        return false;
                    }
                    return true;
                }, true);
                //console.log(rRecipe(this)+":"+(isCraftable?1:0));
                if(!isCraftable)
                    return false;
                craftsLater.push(itemId);
            });
            if(from < 0 || to < 0)
                break;
            from = reagents.length-1 - from;
            to = reagents.length-1 - to;
            reagents.splice(to, 0, reagents.splice(from, 1)[0]);
        }
        var miqo = "";
        reagents.each(function(){
            miqo += "job("+rJob(this)+")\r\n";
            miqo += "recipe("+rRecipe(this)+")\r\n";
            miqo += "craft("+rCount(this)+")\r\n";
        });
        miqo += "//--Section crafts: "+reagents.get().reduce(function(allCount, val){ return allCount+rCount(val); },0)+"\r\n";
        return miqo;
    };
    var antiDuplicate = function(miqo){
        miqo = miqo.replace(/recipe\(Kite Shield\)/g, "recipe(Kite Shield, 3)");
        miqo = miqo.replace(/recipe\(Goatskin Wristbands\)/g, "recipe(Goatskin Wristbands, 2)");
        miqo = miqo.replace(/recipe\(Hempen Breeches\)/g, "recipe(Hempen Breeches, 2)");
        miqo = miqo.replace(/recipe\(Copper Ring\)/g, "recipe(Copper Ring, 2)");
        miqo = miqo.replace(/recipe\(Lapis Lazuli\)/g, "recipe(Lapis Lazuli, 2)");
        miqo = miqo.replace(/recipe\(Brass Ring\)/g, "recipe(Brass Ring, 2)");
        miqo = miqo.replace(/recipe\(Silver Ring\)/g, "recipe(Silver Ring, 2)");
        miqo = miqo.replace(/recipe\(Garnet\)/g, "recipe(Garnet, 2)");
        miqo = miqo.replace(/recipe\(Mythril Ring\)/g, "recipe(Mythril Ring, 3)");
        miqo = miqo.replace(/recipe\(Horn Staff\)/g, "recipe(Horn Staff, 8)");
        miqo = miqo.replace(/recipe\(Electrum Ring\)/g, "recipe(Electrum Ring, 2)");
        miqo = miqo.replace(/recipe\(Honey\)/g, "recipe(Honey, 8)");
        miqo = miqo.replace(/recipe\(Horn Fishing Rod\)/g, "recipe(Horn Fishing Rod, 2)");
        miqo = miqo.replace(/recipe\(Ether\)/g, "recipe(Ether, 8)");
        miqo = miqo.replace(/recipe\(Poisoning Potion\)/g, "recipe(Poisoning Potion, 2)");
        miqo = miqo.replace(/recipe\(Paralyzing Potion\)/g, "recipe(Paralyzing Potion, 2)");
        miqo = miqo.replace(/recipe\(Blinding Potion\)/g, "recipe(Blinding Potion, 2)");
        miqo = miqo.replace(/recipe\(Sleeping Potion\)/g, "recipe(Sleeping Potion, 2)");
        miqo = miqo.replace(/recipe\(Silencing Potion\)/g, "recipe(Silencing Potion, 2)");
        miqo = miqo.replace(/recipe\(Boarskin Ring\)/g, "recipe(Boarskin Ring, 2)");
        miqo = miqo.replace(/recipe\(Rose Gold Earrings\)/g, "recipe(Rose Gold Earrings, 2)");
        miqo = miqo.replace(/recipe\(Mortar\)/g, "recipe(Mortar, 21)");
        miqo = miqo.replace(/recipe\(Campfire\)/g, "recipe(Campfire, 2)");
        miqo = miqo.replace(/recipe\(Manor Fireplace\)/g, "recipe(Manor Fireplace, 2)");
        miqo = miqo.replace(/recipe\(Wall Chronometer\)/g, "recipe(Wall Chronometer, 2)");
        miqo = miqo.replace(/recipe\(Cloche\)/g, "recipe(Cloche, 3)");
        miqo = miqo.replace(/recipe\(Smithing Bench\)/g, "recipe(Smithing Bench, 2)");
        miqo = miqo.replace(/recipe\(Wall Lantern\)/g, "recipe(Wall Lantern, 2)");
        miqo = miqo.replace(/recipe\(Holy Rainbow Hat\)/g, "recipe(Holy Rainbow Hat, 2)");
        miqo = miqo.replace(/recipe\(Reading Glasses\)/g, "recipe(Reading Glasses, 2)");
        miqo = miqo.replace(/recipe\(Gaganaskin Gloves\)/g, "recipe(Gaganaskin Gloves, 2)");
        miqo = miqo.replace(/recipe\(Gold Ingot\)/g, "recipe(Gold Ingot, 2)");
        miqo = miqo.replace(/recipe\(Orchestrion\)/g, "recipe(Orchestrion, 4)");
        miqo = miqo.replace(/recipe\(Camphor\)/g, "recipe(Camphor, 14)");
        miqo = miqo.replace(/recipe\(Cordial\)/g, "recipe(Cordial, 2)");
        miqo = miqo.replace(/recipe\(Survival Hat\)/g, "recipe(Survival Hat, 2)");
        miqo = miqo.replace(/recipe\(Survival Shirt\)/g, "recipe(Survival Shirt, 3)");
        miqo = miqo.replace(/recipe\(Survival Halfslops\)/g, "recipe(Survival Halfslops, 2)");
        miqo = miqo.replace(/recipe\(Survival Boots\)/g, "recipe(Survival Boots, 2)");
        miqo = miqo.replace(/recipe\(Luminous Fiber\)/g, "recipe(Luminous Fiber, 2)");
        miqo = miqo.replace(/recipe\(Near Eastern Antique\)/g, "recipe(Near Eastern Antique, 2)");
        miqo = miqo.replace(/recipe\(Coerthan Souvenir\)/g, "recipe(Coerthan Souvenir, 2)");
        miqo = miqo.replace(/recipe\(Maelstrom Materiel\)/g, "recipe(Maelstrom Materiel, 2)");
        miqo = miqo.replace(/recipe\(Heartfelt Gift\)/g, "recipe(Heartfelt Gift, 2)");
        miqo = miqo.replace(/recipe\(Orphanage Donation\)/g, "recipe(Orphanage Donation, 2)");
        miqo = miqo.replace(/recipe\(Platinum Ingot\)/g, "recipe(Platinum Ingot, 2)");
        return miqo;
    };
    var scenario = function(){
        var miqo = "";
        miqo += "//Pre-Requisite Crafting\r\n";
        miqo += "solverPreset(recommended)\r\nnqhq(balanced)\r\nreclaimOff()\r\n\r\n";
        miqo += chapter("PreRequisiteCrafting-section")+"\r\n";
        miqo += "//Crafting List\r\n";
        miqo += "solverPreset(recommended)\r\nnqhq(balanced)\r\nreclaimHQ(50)\r\n\r\n";
        miqo += chapter("CraftingList-section")+"\r\n";
        miqo += "//Repair\r\n";
        miqo += "reclaimOff()\r\nrepair()\r\n";
        miqo = antiDuplicate(miqo);
        //window.prompt("Copy to clipboard: Ctrl+C, Enter", miqo);
        return miqo;
    };

    var addMiqoButton = function(){
        var scenarioBtn = document.createElement("a");
        scenarioBtn.setAttribute('href', "#");
        scenarioBtn.text = "=ㅇㅅㅇ=";
        scenarioBtn.id = "miqo";
        scenarioBtn.className = "btn btn-default pull-right hidden-print margin-top margin-right";
        scenarioBtn.setAttribute('data-clipboard-text',scenario());
        scenarioBtn.onclick = function () {
            //console.log(scenario());
            //console.log("clicked");
        };
        $("#banner .container").prepend(scenarioBtn);
    };



    addMiqoButton();
    //console.log(scenario());
})();
