function Selenium(){}

Selenium.prototype.isVisible = function(element) {
    /**
   * Determines if the specified element is visible. An
   * element can be rendered invisible by setting the CSS "visibility"
   * property to "hidden", or the "display" property to "none", either for the
   * element itself or one if its ancestors.  This method will fail if
   * the element is not present.
   */
    // var element;
    // element = this.browserbot.findElement(locator);
    // DGF if it's an input tag of type "hidden" then it's not visible
    if (element.tagName) {
        var tagName = new String(element.tagName).toLowerCase();
        if (tagName == "input") {
            if (element.type) {
                var elementType = new String(element.type).toLowerCase();
                if (elementType == "hidden") {
                    return false;
                }
            }
        }
    }
    var visibility = this.findEffectiveStyleProperty(element, "visibility");
    var _isDisplayed = this._isDisplayed(element);
    return (visibility != "hidden" && _isDisplayed);
};

Selenium.prototype.findEffectiveStyleProperty = function(element, property) {
    var effectiveStyle = this.findEffectiveStyle(element);
    var propertyValue = effectiveStyle[property];
    if (propertyValue == 'inherit' && element.parentNode.style) {
        return this.findEffectiveStyleProperty(element.parentNode, property);
    }
    return propertyValue;
};

Selenium.prototype._isDisplayed = function(element) {
    var display = this.findEffectiveStyleProperty(element, "display");
    if (display == "none") return false;
    if (element.parentNode.style) {
        return this._isDisplayed(element.parentNode);
    }
    return true;
};


Selenium.prototype.findEffectiveStyle = function(element) {
    if (element.style == undefined) {
        return undefined; // not a styled element
    }
    // var window = window.getCurrentWindow();
    if (window.getComputedStyle) {
        // DOM-Level-2-CSS
        return window.getComputedStyle(element, null);
    }
    if (element.currentStyle) {
        // non-standard IE alternative
        return element.currentStyle;
        // TODO: this won't really work in a general sense, as
        //   currentStyle is not identical to getComputedStyle()
        //   ... but it's good enough for "visibility"
    }

    if (window.document.defaultView && window.document.defaultView.getComputedStyle) {
        return window.document.defaultView.getComputedStyle(element, null);
    }


    throw "cannot determine effective stylesheet in this browser";
};


function findPos(obj) {
    var curleft = curtop = 0;
    if (obj.offsetParent) {
    do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }
    return [curleft,curtop];
}
// This is glacially slow, it can take like 200msecs per element, yeah, really slow
// also, it doesn't work for things below the fold!

// function glacial_visible(element) {
//   if (element.offsetWidth === 0 || element.offsetHeight === 0) return false;
//   var height = document.documentElement.clientHeight,
//       rects = element.getClientRects(),
//       on_top = function(r) {
//           for (var x = Math.floor(r.left), x_max = Math.ceil(r.right); x <= x_max; x++)
//           for (var y = Math.floor(r.top), y_max = Math.ceil(r.bottom); y <= y_max; y++) {
//             if (document.elementFromPoint(x, y) === element) return true;
//           }
//           return false;
//         };
//   for (var i = 0, l = rects.length; i < l; i++) {
//     var r = rects[i]//,
//         // in_viewport = r.top > 0 ? r.top <= height : (r.bottom > 0 && r.bottom <= height);
//     if (on_top(r)) return true;
//   }
//   return false;
// }

// find candidates: 102ms 
function visible(el){
    var style = getComputedStyle(el);
    if(style.display == 'none') return false;
    if(style.visibility == 'hidden') return false;
    if(el.offsetWidth === 0 || el.offsetHeight === 0) return false;
    // return selenium.isVisible(el);
    return true;
}

var selenium = new Selenium();

function slow_visible(el){
    var a = findPos(el);
    if(a[0] < 1 || a[1] < 1) return false;
    return selenium.isVisible(el)
}


function rate(el, compare){
    //prefer things which are similar in length
    var score = Math.pow(el.nodeValue.length - compare.length, 2)
    // lets put a bit of stochasticity on that face
    score += Math.random();
    // prefer links
    if(el.parentNode.tagName.toLowerCase() == "a") score -= 0.5;
    return score
}

function retriveCandidates(compare) {
    var elements = document.querySelectorAll("body *");
    var results = [];
    var child;
    for(var i = 0; i < elements.length; i++) {
        if(!visible(elements[i])) continue;
        var childs = elements[i].childNodes;
        for(var jay = 0; jay < childs.length; jay++){
        	var child = childs[/*of*/jay];

            
	        if(child.nodeType == 3 && 
                child.nodeValue.trim().length > compare.length / 5 && 
                child.nodeValue.length < compare.length * 5){
                    results.push(child);
            }
        }
    }

    return results.map(function(e){
        return [e, rate(e, compare)]
    }).sort(function(a, b){
        return a[1] - b[1]
    })
    // return results.sort(function(a,b){
    //     // return rate(a, compare) - rate(b, compare)
    // })
}

function replaceText(node, text){
    if(node.nodeValue.toLowerCase() == node.nodeValue){
        text = text.toLowerCase(); //match formatting as best as possible
    }
    if(node.nodeValue.toUpperCase() == node.nodeValue){
        text = text.toUpperCase(); //match formatting as best as possible
    }
    node.nodeValue = node.nodeValue.replace(/^([^a-zA-Z]*)(.*?)([^a-zA-Z]*)$/, "$1"+text+"$3");
}

// function injectString(magical){
//     // console.time("find candidates")
//     var candidates = retriveCandidates(magical);
//     // console.timeEnd("find candidates");
//     // console.log(candidates.length, candidates);

//     // var visible_candidates = 0;
//     if(candidates.length > 4){ //4 is like the magic number here
//         for(var i = 0; i < candidates.length; i++){
//             var can = candidates[i];
//             // console.log(c, selenium.isVisible(c.parentNode), c.parentNode)
//             if(slow_visible(c.parentNode)){
//                 //okay, so it passed the slow test, possibly better candidate
//                 // visible_candidates++;
//                 replaceText(c, magical)
//                 return true;
//             }
//         }
//     }
//     throw 'Could not inject string';
// }

// var magical = "Sebastian Jay";
var initialTime = +new Date;
function tryInjection(magical){
    try {
        reportInjection(magical)
    } catch (err) {
        if(new Date - initialTime < 1000 * 5){
            setTimeout(function(){
                tryInjection(magical);
            }, 200);    
        }else{
            // console.log("given up on will to live")
        }
        
    }
}

function reportInjection(magical){
    // var cfg = document.querySelector('input.__configure_project_waldo_text_substitution_algorithm');
    // if(cfg){
        
    // }
    var candidates = retriveCandidates(magical);
    var can = null, rank = 999;
    if(candidates.length > 4){ //4 is like the magic number here
        for(var i = 0; i < candidates.length; i++){
            var c = candidates[i];
            if(c[0].nodeValue.replace(/[^a-zA-Z]/g, '').length < 3) continue;
            // console.log("checking can", c, i)
            if(slow_visible(c[0].parentNode)){
                //okay, so it passed the slow test, possibly better candidate
                can = c[0];
                rank = c[1];
                break;
            }
        }
    }
    if(can){
        // chrome.extension.sendMessage({type: "REPORT_DRAFT", rank: rank, text: can.nodeValue}, function(response){
        //if it ever responds, we win!
        console.log("REPLACING", can)
        replaceText(can, magical)
        // })
    }else{
        // console.log("no caniddate found", magical)
        throw "could not find suitable candidate";
    }
}
// chrome.extension.sendMessage({type: "GET_MAGIC"}, function(response) {
//     tryInjection(response);
// });

chrome.storage.sync.get(function(obj){
    tryInjection(obj.jay || "Sebastian Jay")
})

window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
      return;
    if (event.data.type && (event.data.type == "__configure_project_waldo_text_substitution_algorithm")) {
        console.log("Content script received: " + event.data.text);
        chrome.storage.sync.set({
            jay: event.data.text
        }, function(){
           var isInstalledNode = document.createElement('div');
            isInstalledNode.id = 'project-waldo-is-installed';
            document.body.appendChild(isInstalledNode);
        });
    }
}, false);