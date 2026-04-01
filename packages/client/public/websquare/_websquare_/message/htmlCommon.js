var paramObj;
var isIE = navigator.appName.match(/Explorer/i) != null;
var isMoz = navigator.userAgent.match(/Firefox/i) != null || (navigator.userAgent.match(/Gecko/i) != null && navigator.userAgent.match(/AppleWebKit/i) == null);
var isOpera = navigator.userAgent.match(/Opera/i) != null;
var isChrome = !isIE && (navigator.userAgent.match(/Chrome/i) != null);
var isAndroid = /Android/.test(navigator.userAgent);
var isIphone = /iPhone/.test(navigator.userAgent);
var isIpad = /iPad/.test(navigator.userAgent);
var isIpod = /iPod/.test(navigator.userAgent);
var isSafari = false;
if (typeof navigator.vendor != "undefined") {
    isSafari = navigator.vendor.indexOf("Apple") > -1;
}

function getParameter(param) {
    var ret = "";
    try {
        if (!paramObj) {
            paramObj = {};
            var srch = location.search.substring(1);
            var arrayOfSrch = srch.split("&");
            for (var i = 0; i < arrayOfSrch.length; i++) {
                var tmpArray = arrayOfSrch[i].split("=");
                if (tmpArray.length == 2) {
                    paramObj[trim(tmpArray[0])] = trim(tmpArray[1]);
                }
            }
        }
        ret = paramObj[param];
    } catch (e) {
        ret = "";
    }
    if (ret == null || typeof ret == 'undefined') {
        ret = '';
    }
    return decodeURI(ret);
}

function trim(str) {
    if (typeof str == "undefined" && str == null) return "";
    var leftTrimRegExp = new RegExp("^\\s\\s*");
    var rightTrimRegExp = new RegExp("\\s\\s*$");
    str = str.replace(leftTrimRegExp, '').replace(rightTrimRegExp, '');
    return str;
}

function getPopupParam() {
    try {
        var str = getParameter("modalParamIdx");
        return opener.WebSquare.net._getParam(str);
    } catch (e) {
        return "";
    }
}

function endsWith(str, s) {
    return str.substring(str.length - s.length, str.length) == s;
}

function _safeInnerHTML(elem, str) {
    try {
        if (!elem || typeof elem.textContent !== "string") {
            return;
        }
        if (typeof str !== "string") {
            str = "";
        }
        if (str.indexOf("<") >= 0) {
            elem.textContent = "";
            var pattern1 = /<\s*script/ig;
            var pattern2 = /\s*\/\s*script\s*>/ig;
            var safeElem = "wq-safescr";
            str = str.replace(pattern1, "<" + safeElem).replace(pattern2, "/" + safeElem +">");
            if (location.hostname !== window.document.domain) {
                var tempDiv = document.createElement("div");
                tempDiv.innerHTML = str;
                while (tempDiv.firstChild) {
                    elem.appendChild(tempDiv.firstChild);
                }
            } else {
                var parser = new DOMParser();
                var bodyContent = parser.parseFromString(str, "text/html").body;
                for (var i = 0; i < bodyContent.childNodes.length; i++) {
                    var node = bodyContent.childNodes[i];
                    if (node.nodeType !== 1 || node.tagName.toUpperCase() !== "SCRIPT") {
                        elem.appendChild(node.cloneNode(true));
                    }
                }
            }
        } else {
            elem.textContent = str;
        }
    } catch (e) {
        opener.WebSquare.exception.printStackTrace(e);
    }
}