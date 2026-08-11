window.msaCommon = {};
msaCommon.data = {};
msaCommon.data.lang = {};
msaCommon.data.origin = "*";
msaCommon.data.config = {};
msaCommon.data.blankURL = "about:blank";
msaCommon.data.baseURI = location.origin;
msaCommon.data.sp5ResourcePath = "";
msaCommon._onload = function(callback, paramArr) {
    window.addEventListener("message", msaCommon._onmessage);
    var messageObj = {};
    messageObj._wq_type = "htmlLoaded";
    opener.postMessage(messageObj, msaCommon.data.origin);
    msaCommon._initCallback = callback;
    msaCommon._initCallbackParam = paramArr;
}

msaCommon.addListener = function(listener) {
    msaCommon._apiCallback = listener;
}

msaCommon._onmessage = function(ev) {
    try {
        if (!ev.data || !ev.data._wq_type) {
            return;
        }
        if (ev.data._wq_type === "htmlLoadedFinish") {
            // window.removeEventListener("message", msaCommon._onmessage);
            msaCommon.data = ev.data.param;
            msaCommon.data.origin = ev.origin;
            if (typeof msaCommon._initCallback === "function") {
                msaCommon._initCallback.apply(this, msaCommon._initCallbackParam);
            }
        } else if (ev.data._wq_type === "callAPIFinish") {
            // window.removeEventListener("message", msaCommon._onmessage);
            if (typeof msaCommon._apiCallback === "function") {
                msaCommon._apiCallback(ev.data.param);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

msaCommon._getMessage = function(key) {
    try {
        var result = "";
        if (!key) {
            return "";
        }
        if (typeof msaCommon.data.lang[key] == 'undefined') {
            console.log("'" + key + "' is not defined.");
            result = "";
        } else {
            result = msaCommon.data.lang[key];
        }
        // IE11 support (key, ...rest)
        var rest = [];
        for (var i = 1; i < arguments.length; i++) {
            rest.push(arguments[i]);
        }
        for (var i = 0; i < rest.length; i++) {
            try {
                result = result.replace(new RegExp("%" + (i + 1), "g"), rest[i]);
            } catch (e) {
                console.error(e);
            }
        }
        return result;
    } catch (e) {
        console.error(e);
    }
};

msaCommon._getBoolean = function(boolstr) {
    if (typeof boolstr == "boolean") {
        return boolstr;
    } else if (typeof boolstr == "string" && boolstr.toLowerCase() == "true") {
        return true;
    } else {
        return false;
    }
}

msaCommon._getConfig = function(key) {
    try {
        if (typeof options === "undefined" || options == null) {
            options = {};
        }
        var value = "";
        if (key.indexOf("/") > -1) {
            var st = key.split("/");
            var obj = msaCommon.data.config;
            var find = false;
            var nodeName = null;
            for (var j = 0; j < st.length; j++) {
                if (st[j] == "") {
                    continue;
                }
                find = false;
                var token = st[j];
                var str = token.indexOf("[");
                var attributeName = null;
                var attributeValue = null;
                if (str == -1) {
                    nodeName = token;
                } else {
                    nodeName = token.substring(0, str);
                    var result = token.match(/[a-zA-Z0-9_]*[\[][\s]*(@[a-zA-Z0-9_]*)[\\]*=[\s]*["']?([^'"]*)["']?[\]]/);
                    if (result != null) {
                        attributeName = result[1];
                        attributeValue = result[2];
                    }
                }
                obj = obj[nodeName];
                if (obj) {
                    if (Object.prototype.toString.call(obj) === "[object Array]") {
                        if (options.type === "array" && attributeName == null && attributeValue == null) {
                            find = true;
                        } else {
                            for (var k = 0; k < obj.length; k++) {
                                if (attributeName == null && attributeValue == null) {
                                    find = true;
                                    obj = obj[k];
                                    break;
                                } else {
                                    if (attributeValue == obj[k][attributeName]) {
                                        find = true;
                                        obj = obj[k];
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        if (attributeName == null && attributeValue == null) {
                            find = true;
                        } else {
                            if (attributeValue == obj[attributeName]) {
                                find = true;
                            }
                        }
                    }
                }
                if (!find) {
                    obj = null;
                    break;
                }
            }
            if (options.type === "json" || options.type === "array") {
                value = obj;
            } else {
                if (obj) {
                    if (nodeName && nodeName.startsWith("@")) {
                        if (typeof obj == 'string') {
                            value = obj;
                        } else {
                            value = obj + "";
                        }
                    } else {
                        if (Object.prototype.toString.call(obj) === "[object Array]") {
                            if (options.type !== "array") {
                                value = obj[0]["#text"] || "";
                                value += obj[0]["#cdata"] || "";
                            }
                        } else {
                            value = obj["#text"] || "";
                            value += obj["#cdata"] || "";
                        }
                        if (typeof value != 'string') {
                            value = value + "";
                        }
                    }
                }
                value = value.trim();
            }
        } else {
            var obj = msaCommon.data.config["WebSquare"][key.trim()];
            if (options.type === "json") {
                value = obj;
            } else {
                if (obj) {
                    if (Object.prototype.toString.call(obj) === "[object Array]") {
                        if (options.type !== "array") {
                            value = obj[0]["@value"];
                        }
                    } else {
                        value = obj["@value"];
                    }
                }
                if (value) {
                    value = value.trim();
                } else if (options.type !== "array") {
                    value = "";
                }
            }
        }
        if (options.type === "json" || options.type === "array") {
            if (value == null) {
                value = {};
            }
            if (options.type === "json") {
                var ret = {};
                for (var item in value) {
                    var temp = value[item];
                    if (temp.constructor !== Array && temp["@value"] != undefined) {
                        ret[item] = temp["@value"] || "";
                    } else {
                        ret[item] = temp;
                    }
                }
                value = ret;
            }
        }
        return value;
    } catch (e) {
        console.error(e);
    }
}

msaCommon._getSSLBlankPage = function() {
    return msaCommon.data.blankURL;
}

msaCommon._getBaseURI = function() {
    return msaCommon.data.baseURI;
}

msaCommon._inquiresPath = function(path) {
    return msaCommon.data.sp5ResourcePath + "/" + path; // path는 상대경로
}

msaCommon.sendMessage = function(caller, callerParam, callback, callbackParam, callerContext) {
    try {
        // window.addEventListener("message", msaCommon._onmessage);
        var messageObj = {};
        messageObj._wq_type = "callAPI";
        messageObj.caller = caller;
        if (callerParam) {
            messageObj.callerParam = callerParam;
        }
        if (callback) {
            messageObj.callback = callback;
            if (callbackParam) {
                messageObj.callbackParam = callbackParam;
            }
            if (callerContext) {
                messageObj.callerContext = callerContext;
            }
        }
        opener.postMessage(messageObj, msaCommon.data.origin);
    } catch (e) {
        console.error(e);
    }
};

// =============
//  endode + decode
// =============

msaCommon.text = {};

msaCommon.text.UTF8Decode = function(str) {
    try {
        var output = "",
            i = 0,
            charCode = 0;
        while (i < str.length) {
            charCode = str.charCodeAt(i);
            if (charCode < 128) {
                output += String.fromCharCode(charCode);
                i++;
            } else if ((charCode > 191) && (charCode < 224)) {
                output += String.fromCharCode(((charCode & 31) << 6) | (str.charCodeAt(i + 1) & 63));
                i += 2;
            } else {
                output += String.fromCharCode(((charCode & 15) << 12) | ((str.charCodeAt(i + 1) & 63) << 6) | (str.charCodeAt(i + 2) & 63));
                i += 3;
            }
        }
        return output;
    } catch (e) {
        console.error(e);
    }
};

msaCommon.text.BASE64URLDecoder = function(t) {
    return msaCommon.text.BASE64Decoder(window.decodeURIComponent(t));
};
msaCommon.text.BASE64Decoder = function(t) {
    var b64s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var f64 = new Array(),
        i;
    for (var i = 0; i < b64s.length; i++) {
        f64[b64s.charAt(i)] = i;
    }
    var d = new Array();
    var i = 0;
    t = t.replace(/\n|\r/g, "");
    t = t.replace(/=/g, "");
    var len = parseInt(t.length * 3 / 4) / 2;
    while (i < t.length) {
        d[d.length] = (f64[t.charAt(i)] << 10) | (f64[t.charAt(i + 1)] << 4) | (f64[t.charAt(i + 2)] >> 2);
        d[d.length] = ((f64[t.charAt(i + 2)] & 3) << 14) | (f64[t.charAt(i + 3)] << 8) | (f64[t.charAt(i + 4)] << 2) | (f64[t.charAt(i + 5)]) >> 4;
        d[d.length] = ((f64[t.charAt(i + 5)] & 15) << 12) | (f64[t.charAt(i + 6)] << 6) | f64[t.charAt(i + 7)];
        i += 8;
    }
    d = d.slice(1, len);
    var r = '';
    try {
        r = String.fromCharCode.apply(document, d);
    } catch (e) {
        for (var i = 0; i < d.length; i++) {
            r += String.fromCharCode(d[i]);
        }
    }
    return r;
};

msaCommon.text.BASE64Decode = function(str) {
    try {
        var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var result = '';
        var i = 0;
        do {
            var b1 = characters.indexOf(str.charAt(i++));
            var b2 = characters.indexOf(str.charAt(i++));
            var b3 = characters.indexOf(str.charAt(i++));
            var b4 = characters.indexOf(str.charAt(i++));
            var a = ((b1 & 0x3F) << 2) | ((b2 >> 4) & 0x3);
            var b = ((b2 & 0xF) << 4) | ((b3 >> 2) & 0xF);
            var c = ((b3 & 0x3) << 6) | (b4 & 0x3F);
            result += String.fromCharCode(a) + (b ? String.fromCharCode(b) : '') + (c ? String.fromCharCode(c) : '');
        } while (i < str.length);
        return msaCommon.text.UTF8Decode(result);
    } catch (e) {
        console.error(e);
    }
};

msaCommon.text.UTF8Encode = function(str) {
    try {
        str = str.replace(/\r\n/g, "\n");
        var output = "",
            i = 0,
            charCode;
        for (i; i < str.length; i++) {
            charCode = str.charCodeAt(i);
            if (charCode < 128) {
                output += String.fromCharCode(charCode);
            } else if ((charCode > 127) && (charCode < 2048)) {
                output += String.fromCharCode((charCode >> 6) | 192);
                output += String.fromCharCode((charCode & 63) | 128);
            } else {
                output += String.fromCharCode((charCode >> 12) | 224);
                output += String.fromCharCode(((charCode >> 6) & 63) | 128);
                output += String.fromCharCode((charCode & 63) | 128);
            }
        }
        return output;
    } catch (e) {
        console.error(e);
    }
};

msaCommon.text.BASE64Encode = function(str) {
    try {
        var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
        var result = '';
        var i = 0;
        str = msaCommon.text.UTF8Encode(str);
        do {
            var a = str.charCodeAt(i++);
            var b = str.charCodeAt(i++);
            var c = str.charCodeAt(i++);
            a = a ? a : 0;
            b = b ? b : 0;
            c = c ? c : 0;
            var b1 = (a >> 2) & 0x3F;
            var b2 = ((a & 0x3) << 4) | ((b >> 4) & 0xF);
            var b3 = ((b & 0xF) << 2) | ((c >> 6) & 0x3);
            var b4 = c & 0x3F;
            if (!b) {
                b3 = b4 = 64;
            } else if (!c) {
                b4 = 64;
            }
            result += characters.charAt(b1) + characters.charAt(b2) + characters.charAt(b3) + characters.charAt(b4);
        } while (i < str.length);
        return result;
    } catch (e) {
        console.error(e);
    }
};

msaCommon.text.BASE64Encoder = function(d) {
    var b64s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var b64 = new Array();
    for (var i = 0; i < b64s.length; i++) {
        b64[i] = b64s.charAt(i);
    }
    var r = new Array();
    var i = 0;
    if (d.charCodeAt(0) != 65279) {
        d = String.fromCharCode(65279) + d;
    }
    var dl = d.length;
    if ((dl % 3) == 1) {
        d += String.fromCharCode(0) + String.fromCharCode(0);
    }
    if ((dl % 3) == 2) {
        d += String.fromCharCode(0);
    }
    while ((i + 2) < d.length) {
        r[r.length] = b64[d.charCodeAt(i) >> 10];
        r[r.length] = b64[(d.charCodeAt(i) & 1008) >> 4];
        r[r.length] = b64[(d.charCodeAt(i) & 15) << 2 | (d.charCodeAt(i + 1) >> 14)];
        r[r.length] = b64[(d.charCodeAt(i + 1) & 16128) >> 8];
        if ((r.length % 76) == 0) {
            r[r.length] = "\n";
        }
        r[r.length] = b64[(d.charCodeAt(i + 1) & 252) >> 2];
        r[r.length] = b64[(d.charCodeAt(i + 1) & 3) << 4 | (d.charCodeAt(i + 2) >> 12)];
        r[r.length] = b64[(d.charCodeAt(i + 2) & 4032) >> 6];
        r[r.length] = b64[d.charCodeAt(i + 2) & 63];
        if ((r.length % 76) == 0) {
            r[r.length] = "\n";
        }
        i += 3;
    }
    if ((dl % 3) == 1) {
        r.pop();
        r.pop();
        r.pop();
        r.pop();
        if (dl == 28) {
            r.pop();
        }
        r[r.length - 1] = "=";
    }
    if ((dl % 3) == 2) {
        r[r.length - 1] = r[r.length - 2] = "=";
    }
    var t = r.join("");
    return t;
};

msaCommon.text.BASE64URLEncoder = function(d) {
    return window.encodeURIComponent(msaCommon.text.BASE64Encoder(d));
};

msaCommon.text.URLEncoder = function(str) {
    if (typeof str == "number") {
        return str;
    }
    var ret = "";
    if (str == null || str.length == 0) {
        return ret;
    }
    return window.encodeURIComponent(str);
};

// ==========
//   xml
// ==========

msaCommon.xml = {};
msaCommon.xml.parse = function(obj) {
    var dom = null;
    try {
        if (typeof obj == 'string' && obj.substring(0, "<!DOCTYPE".length) === "<!DOCTYPE") {
            var endDtd = obj.indexOf("<", 9);
            if (endDtd > 0) {
                obj = obj.substring(endDtd);
            }
        }
        var parser = new DOMParser();
        if (typeof obj == 'string') {
            obj = obj.trim();
            if (obj == '') {
                return null;
            } else if (obj.charAt(0) != '<') {
                var str = "<" + obj + "/>";
                dom = parser.parseFromString(str, "text/xml");
            } else {
                dom = parser.parseFromString(obj, "text/xml");
            }
        } else if (obj != null && (obj.nodeType == 9 || obj.nodeType == 1)) {
            dom = parser.parseFromString(xml.serialize(obj), "text/xml");
        }
        dom.async = false;
        return dom;
    } catch (e) {
        return null;
    }
};
