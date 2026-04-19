<%@ page contentType="text/html; charset=UTF-8" language="java" errorPage="" %><%
String ref = request.getHeader("referer");
if(ref == null || ref.equals("")) {
	response.setStatus(HttpServletResponse.SC_NOT_FOUND);
	return;
}

%>
<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<META http-equiv="X-UA-Compatible" content="IE=Edge" />
<script>
	
	var dataLoadStr = "";
	var dataLoadedStr = "";
	window.onload = doInit;
	function doInit() {
		dataLoadStr = opener.WebSquare.language.getMessage( "Upload_msg6" ) || "Collecting data..";
		dataLoadedStr = opener.WebSquare.language.getMessage( "Upload_msg7" ) || "Data conversion completed.";
		var textlayer = document.getElementById("textLayer");
		textlayer.textContent = dataLoadStr;
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

	init = function (){
		parentObj = opener || parent;
		if(parentObj.WebSquare) {
			gridObj = parentObj.WebSquare.util.getComponentById(parentObj.window['downloadGridId']);
		} else {
			gridObj = parentObj[parentObj.window['downloadGridId']];
		}
		
		gridObj.downloadInit = true;
	}
	checkUpload = function(uploadPercent){
		if(uploadPercent === "end" ) {
			excelDone()
		} else {
			var textLayer = document.getElementById("textLayer");
			textLayer.textContent = dataLoadStr + Math.round(uploadPercent * 1000) /10  + "%";
		}
	}
	sendData = function(){
		gridObj.sendExcelData(gridObj.excelOptions,gridObj.excelInfoArr,gridObj.excelFinalStr);	
	} 
	cancle = function(){
		gridObj.cancleDownload();
	}
	excelDone = function(){
		var textLayer = document.getElementById("textLayer");
		textLayer.textContent = dataLoadedStr;
		var downloadButton = document.getElementById("downloadButton");
		downloadButton.disabled = false;
	}
	initialize = function() {
		var textLayer = document.getElementById("textLayer");
		textLayer.textContent = dataLoadStr + " 0%";
		var downloadButton = document.getElementById("downloadButton");
		downloadButton.disabled = true;
		init();
	}
</script>
<style>
	body {
		font-family: "dotum";
		font-size: 11px;
		font-weight: bold;
	}
</style>
</head>
<body style="background-color:#ffffff" onload="init()"> 
<img style="position:absolute;left:15px;top:15px;" src="../../message/images/progressingbar.gif" /><br />
<div id="textLayer" style="position:absolute;left:15px;width:150px;top:30px;height:15px;text-align:center;"></div>
	<input id='downloadButton' type='button' disabled="disabled" style="position:absolute;right:55px;width:85px;top:60px;height:30px;text-align:center;word-wrap:break-word;" onclick="sendData()" value="download" />
	<input id='cancelButton' type='button'  style="position:absolute;left:55px;width:85px;top:60px;height:30px;text-align:center;word-wrap:break-word;" onclick="cancle()" value="cancel" />
</body>
</html>