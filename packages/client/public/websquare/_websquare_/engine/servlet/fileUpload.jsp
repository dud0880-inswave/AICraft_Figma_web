<%@ page contentType="text/html; charset=UTF-8" language="java" errorPage="" %><%
String ref = request.getHeader("referer");
String param = request.getParameter("gridID");
if(ref == null || ref.equals("") || param == null || param.equals("")) {
	response.setStatus(HttpServletResponse.SC_NOT_FOUND);
	return;
}

%>
<!DOCTYPE html>
<html>
<head>
<meta http-equiv=Content-Type content="text/html;charset=UTF-8" />
<meta http-equiv=Cache-Control content=No-Cache />
<meta http-equiv=Pragma	content=No-Cache />
<title>FILE UPLOAD</title>
<script src="../../../message/htmlCommon.js"></script>
<script>
	var vActionUrl		= "";
	var vCallbackMethod	= "";
	var domain = "";
	window.onload = doInit;
	
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
	
	function doInit() {
	    try {
	        domain = getParameter("domain");  
	        if(domain) {
	            document.domain = domain;   
	        }
	    } catch (e) {
	    	opener.WebSquare.exception.printStackTrace(e);
	    }

	    //  header, append, hidden, columnNum, hiddenColumns, action
		vheader = getParameter("header");
		vappend = getParameter("append");
		vhidden = getParameter("hidden");
		vcolumnNum = getParameter("columnNum");
		vhiddenColumns = getParameter("hiddenColumns");
		vheaderRows = getParameter("headerRows");
		actionUrl = getParameter("action");
		delim = getParameter("delim");
		gridID = getParameter("gridID");
		fillHidden = getParameter("fillHidden");
		gridStartRow = getParameter("gridStartRow");
		expressionColumns = getParameter("expressionColumns");
		type = getParameter("type");
		
		document.getElementById("header").value = vheader;
		document.getElementById("columnNum").value = vcolumnNum;
		document.getElementById("hiddenColumns").value = vhiddenColumns;
		document.getElementById("headerRows").value = vheaderRows;
		document.getElementById("hidden").value = vhidden;
		document.getElementById("delim").value = delim;
		document.getElementById("fillHidden").value = fillHidden;
		document.getElementById("gridStartRow").value = gridStartRow;
		document.getElementById("expressionColumns").value = expressionColumns;
		document.getElementById("domain").value = domain;
		
		with( document.__uploadForm__ ) {
			action = actionUrl;
		}
		
        if(isSafari) {
            setTimeout(function() {
                var bottomMargin = parseInt(document.height - document.documentElement.offsetHeight, 10) * -1||0;     
                if( bottomMargin != 0 ) {
                    self.resizeBy(0, bottomMargin);
                }
            }, 1);
        }
	}
	function upload( thisForm ) {
		try {
			// file type check
			var filename = document.getElementById("filename").value;
			if( !filename )
				return;
			
			var isXlsFile = filename.toLowerCase().indexOf(".xls") >= 0;
			var isXlsType = document.__uploadForm__.action.indexOf("excelToGrid") >= 0;
			
			var isCSVFile = endsWith(filename.toLowerCase(), ".csv") >= 0 ||
							endsWith(filename.toLowerCase(), ".txt") >= 0;
			var isCSVType = document.__uploadForm__.action.indexOf("csvToXML") >= 0;

			if( !(isXlsFile && isXlsType) && !(isCSVFile && isCSVType) ){
				var errorMsg = opener.WebSquare.language.getMessage("Upload_msg4") || "Check the file extension.";
				alert( errorMsg );
				return;
			}
			
			var frm = window.frames;
			var find = false;
			for( var i = 0; i < frm.length; i++ ) {
			    if( frm[i].name == thisForm.target ) {
			    	find = true;
			    }
			}
			if( !find ) {
				var layerUP= document.createElement("div");
				var src = "";
				layerUP.style.border="1px solid blue";
				layerUP.style.width="100px";
				layerUP.style.height="100px";
				layerUP.style.visibility = "hidden";
				document.body.appendChild(layerUP);
				src = opener.WebSquare.net.getSSLBlankPage();
				_safeInnerHTML(layerUP, "<iframe frameborder='0px' name='" + thisForm.target + "' scrolling='no' style='width:100px; height:100px' " + src + "></iframe>");
			}
			thisForm.submit();
		} catch(e) {
			alert(e.description);
		}
	}

	function returnData( vData ) {
		
		var doc = opener.WebSquare.xml.parse( vData );

		var exception = doc.getElementsByTagName("Exception");
		if(exception.length > 0) {
			var msg = doc.getElementsByTagName("message")[0].firstChild.nodeValue;
			alert(msg);
		} else {

			if( typeof vappend =="string"){
				vappend = opener.WebSquare.util.getBoolean(vappend);
			}
			var child = (doc.getElementsByTagName("array"))[0].firstChild.nodeValue;

			try {
				if (type == "true" ){
					opener.window[gridID].setDataFile(child, vappend);
				}else{
					opener.window[gridID].setData(child, vappend);
				}

				var fileNameDom = document.getElementById("filename")
				var fileName = fileNameDom.value;
				var fileNameArr = fileName.split("\\");
				opener.window[gridID].fireFileReadEnd( fileNameArr[fileNameArr.length-1] );
				window.self.close();
			} catch (e) {
				opener.WebSquare.exception.printStackTrace(e);
				var errorMsg = opener.WebSquare.language.getMessage("Upload_msg5") || "Failed to reflect on the grid.";
				alert( errorMsg );
			}
		}
	}
</script>

</head>
<body style='margin : 0px 0px 3px 0px;'>
	<form name="__uploadForm__" method="post" action="" enctype="multipart/form-data" target="__targetFrame__">
		<table width="400">
			<tr style="height:30px">
				<td colspan="2">
					<input type="file" id="filename" name="filename" style="margin-left:8px; width:380px; font-family:Verdana; font-size:12px;" />
				</td>
			</tr>
	
			<tr style="height:30px">
				<td style="font-family:Verdana; font-size:12px;">
					option: <select name="skip_space" style="font-family:Verdana; font-size:12px;">
						<option value="true">Ignore blank spaces</option>
						<option value="false">Include blank spaces</option>
					</select>		
				</td>
				<td align="right">
					<input type="button" name="sendFILE" style="width:90px; height:20px;  font-family:Verdana; font-size:12px;" value="File Upload" onclick="javascript:upload(this.form)" />
				</td>
			</tr>
		</table>
		<!-- working start -->
        <input type="hidden" id="domain" name="domain" value="" />
		<input type="hidden" id="header" name="header" value="1" />
		<input type="hidden" id="columnNum" name="columnNum" value="" />
		<input type="hidden" id="hiddenColumns" name="hiddenColumns" value="" />
		<input type="hidden" id="headerRows" name="headerRows" value="" />
		<input type="hidden" id="hidden" name="hidden" value="" />
		<input type="hidden" id="delim" name="delim" value="" />
		<input type="hidden" id="fillHidden" name="fillHidden" value="" />		
		<input type="hidden" id="gridStartRow" name="gridStartRow" value="" />		
		<input type="hidden" id="expressionColumns" name="expressionColumns" value="" />		
	</form>
</body>
</html>