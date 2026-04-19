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
<title id="file_title">FILE UPLOAD</title>
<script language="JavaScript">
    var osName = "";
    var vActionUrl		= "";
    var vCallbackMethod	= "";
    var domain = "";
    var processMsg = "";
    var columnIds = "";
    var status = "";
    var gridID = "";
    var maxFileSize = -1;
    var useModalDisable = "";
    var frameModal = "";
    var frameId = "";
    var useMaxByteLength = "";
    var dateFormat = "";
    var byteCheckEncoding = "";
    var columnOrder = "";
    var chunkNum = 0;
    var activeSheet = false;
    var trimFlag = false;
    var useXHR = false;
    var uploadType = 0;
    var filePath = "";
    var useDialog = "";
    var countSkipRow = "";
    var readUntilEmptyRow = "";

    var Upload_ignore_spaces = "";
    var Upload_include_spaces = "";
    var Upload_advanced = "";
    var Upload_include = "";
    var Upload_not_include = "";
    var Upload_fill_hidden = "";
    var Upload_sheet_no = "";
    var Upload_starting_row = "";
    var Upload_starting_col = "";
    var Upload_header = "";
    var Upload_footer = "";
    var Upload_file = "";
    var Upload_file_title = "";
    var Upload_file_header = "";
    var Upload_file_choose = "";
    var Upload_file_span = "";
    var Upload_pwd = "";

    var Upload_msg2 = "";
    var Upload_msg3 = "";
    var Upload_msg4 = "";
    var Upload_msg5 = "";
    var Upload_msg8 = "";
    var Upload_msg9 = "";
    var Upload_msg10 = "";
    var Upload_msg11 = "";
    var Upload_msg12 = "";
    var Upload_msg13 = "";
    var Upload_msg14 = "";
    var Upload_msg15 = "";
    var Upload_msg16 = "";
    var Upload_msg17 = "";
    var Upload_msg18 = "";
    var Grid_warning9 = "";
    
    window.onload = doInit;
    window.onbeforeunload = doFinish;
    
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
            opener.WebSquare.exception.printStackTrace(e)
        }
    }
    
    function doInit() {

        var uploadInfo;
        try {
            domain = getParameter("domain");
            if( domain ) {
                document.domain = domain;
            }

            if(navigator.userAgent.indexOf("Windows") != -1) {
                osName = "window";
            } else if(navigator.userAgent.indexOf("Macintosh") != -1) {
                osName = "mac";
            }

            gridID = getParameter("gridID");
            uploadInfo = opener.JSON.parse( opener[gridID]._excelUploadInfo );

            var sizeInfo = crossBrowserSize();
            var height = sizeInfo.height;
            var width = sizeInfo.width;
            if (uploadInfo.userFeatures) {
                if (uploadInfo.userFeatures.height) {
                    var featuresHeight = parseInt(uploadInfo.userFeatures.height);
                    if (!isNaN(featuresHeight) && featuresHeight > 0) {
                        height = featuresHeight;
                    }
                }
                if (uploadInfo.userFeatures.width) {
                    var featuresWidth = parseInt(uploadInfo.userFeatures.width);
                    if (!isNaN(featuresWidth) && featuresWidth > 0) {
                        width = featuresWidth;
                    }
                }
            }
            window.resizeTo(width, height );
        	

            if(uploadInfo.postMsg) {
                if(uploadInfo.postMsg == "true") {
                    if(window.addEventListener) {
                        window.addEventListener ("message", receiveMessage, false);
                    } else {
                        if(window.attachEvent) {  
                            window.attachEvent("onmessage", receiveMessage);
                        }
                    }
                }
            }
            if (uploadInfo.frameModal == "true" && uploadInfo.frameId) {
                frameId = uploadInfo.frameId;
                var modalFrame = opener.WebSquare.util.getComponentById(uploadInfo.frameId);
                if (modalFrame) {
                    var info = {
                        className : "w2modal_excelUploadPopup",
                        popupModal : true,
                        stackComponents : {
                            popup : {
                                id:frameId
                            }
                        }
                    };
                    modalFrame.showFrameModal(info);
                    frameModal = "true"
                }
            }
            if (uploadInfo.useModalDisable == "true" && frameModal != "true") {
                opener.WebSquare.layer.showModal();
                useModalDisable = "true";
            }

            Upload_ignore_spaces = opener.WebSquare.language.getMessage( "Upload_ignore_spaces" ) || "Ignore blank spaces";
            Upload_include_spaces = opener.WebSquare.language.getMessage( "Upload_include_spaces" ) || "Include blank spaces";
            Upload_advanced = opener.WebSquare.language.getMessage( "Upload_advanced" ) || "Advanced";
            Upload_hidden_values = opener.WebSquare.language.getMessage( "Upload_hidden_values" ) || "Hidden values";
            Upload_include = opener.WebSquare.language.getMessage( "Upload_include" ) || "Include";
            Upload_not_include = opener.WebSquare.language.getMessage( "Upload_not_include" ) || "Not include";
            Upload_fill_hidden = opener.WebSquare.language.getMessage( "Upload_fill_hidden" ) || "Fill Hidden";
            Upload_sheet_no = opener.WebSquare.language.getMessage( "Upload_sheet_no" ) || "Sheet No";
            Upload_starting_row = opener.WebSquare.language.getMessage( "Upload_starting_row" ) || "Start row";
            Upload_starting_col = opener.WebSquare.language.getMessage( "Upload_starting_col" ) || "Start col";
            Upload_header = opener.WebSquare.language.getMessage( "Upload_header" ) || "Header";
            Upload_footer = opener.WebSquare.language.getMessage( "Upload_footer" ) || "Footer";
            Upload_file = opener.WebSquare.language.getMessage( "Upload_file" ) || "File Upload";
            Upload_file_title = opener.WebSquare.language.getMessage( "Upload_file_title" ) || "File Upload";
            Upload_file_header = opener.WebSquare.language.getMessage( "Upload_file_header" ) || "File Upload";
            Upload_file_choose = opener.WebSquare.language.getMessage( "Upload_file_choose" ) || "Choose File";
            Upload_file_span = opener.WebSquare.language.getMessage( "Upload_file_span" ) || "No file chosen";
            Upload_fill = opener.WebSquare.language.getMessage( "Upload_fill" ) || "Fill";
            Upload_ignore = opener.WebSquare.language.getMessage( "Upload_ignore" ) || "Ignore";
            Upload_pwd = opener.WebSquare.language.getMessage( "Upload_pwd" ) || "Password";

            Upload_msg2 = opener.WebSquare.language.getMessage( "Upload_msg2" ) || "File size exceeding the limit.";
            Upload_msg3 = opener.WebSquare.language.getMessage( "Upload_msg3" ) || "Normal processing failed.";
            Upload_msg4 = opener.WebSquare.language.getMessage( "Upload_msg4" ) || "Check the file extension.";
            Upload_msg5 = opener.WebSquare.language.getMessage( "Upload_msg5" ) || "Failed to reflect on the grid.";
            Upload_msg8 = opener.WebSquare.language.getMessage( "Upload_msg8" ) || "The password is incorrect.";
            Upload_msg9  = opener.WebSquare.language.getMessage( "Upload_msg9" ) || "Check the file extension.";
            Upload_msg10 = opener.WebSquare.language.getMessage( "Upload_msg10" ) || "An error occurred during DRM.";
            Upload_msg11 = opener.WebSquare.language.getMessage( "Upload_msg11" ) || "Row count exceeding the limit.";
            Upload_msg12 = opener.WebSquare.language.getMessage( "Upload_msg12" ) || "Invalid file format.";
            Upload_msg13 = opener.WebSquare.language.getMessage( "Upload_msg13" ) || "Invalid cell format";
            Upload_msg14 = opener.WebSquare.language.getMessage( "Upload_msg14" ) || "Cell count exceeding the limit.";
            Upload_msg15 = opener.WebSquare.language.getMessage( "Upload_msg15" ) || "This file is encryped.";
            Upload_msg16 = opener.WebSquare.language.getMessage( "Upload_msg16" ) || "Not support Excel 5.0/7.0";
            Upload_msg17 = opener.WebSquare.language.getMessage( "Upload_msg17" ) || "Does not sheet number.";
            Upload_msg18 = opener.WebSquare.language.getMessage( "Upload_msg18" ) || "It is a write-only file or an unreadable file.";

            maxFileSize = uploadInfo.maxFileSize;
            maxFileSize = parseInt( maxFileSize, 10 );
            Grid_warning9 = opener.WebSquare.language.getMessage( "Grid_warning9", maxFileSize ) || "Data size exceeding the limit.\n limit : %1 byte";

            document.getElementById( "setting" ).textContent = Upload_advanced;
            document.getElementById( "sub" ).setAttribute( "summary", Upload_ignore_spaces + "," + Upload_hidden_values + "," + Upload_fill_hidden + "," + Upload_footer );
            document.getElementById( "advaned" ).textContent = Upload_advanced;
            document.getElementById( "space_option" ).textContent = Upload_ignore_spaces;
            document.getElementById( "file_title" ).textContent = Upload_file_title;
            document.getElementById( "file_header" ).textContent = Upload_file_header;
            document.getElementById( "choose_file" ).textContent = Upload_file_choose;
            document.getElementById( "choose_span" ).textContent = Upload_file_span;
            var sel1 = document.getElementById( "spaceSelect" );
            sel1.options[0].text = Upload_ignore_spaces;
            sel1.options[1].text = Upload_include_spaces;
            document.getElementById( "start_option" ).textContent = Upload_starting_row;
            document.getElementById( "hidden_option").textContent = Upload_hidden_values;
            var sel2 = document.getElementById( "hiddenSelect" );
            sel2.options[0].text = Upload_include;
            sel2.options[1].text = Upload_not_include;
            document.getElementById( "start_col").textContent = Upload_starting_col;
            document.getElementById( "hidden_fill").textContent = Upload_hidden_values;
            var sel3 = document.getElementById( "fillHidden" );
            sel3.options[0].text = Upload_fill;
            sel3.options[1].text = Upload_ignore;
            document.getElementById( "sheet_no").textContent = Upload_sheet_no;
            document.getElementById( "isHeader").textContent = Upload_header;
            var sel4 = document.getElementById( "header" );
            sel4.options[0].text = Upload_include;
            sel4.options[1].text = Upload_not_include;
            document.getElementById( "isFooter").textContent = Upload_footer;
            var sel5 = document.getElementById( "footer" );
            sel5.options[0].text = Upload_include;
            sel5.options[1].text = Upload_not_include;
            document.getElementById( "sendFILE").value =  Upload_file;
            document.getElementById( "isPwd").textContent = Upload_pwd;

        } catch (e) {
            opener.WebSquare.exception.printStackTrace(e);
        }

        //  header, append, hidden, columnNum, hiddenColumns, action
        var advancedHidden = getParameter("advancedHidden");

        vheader = uploadInfo.header;
        vfooter = uploadInfo.footer;
        vappend = uploadInfo.append;
        vhidden = uploadInfo.hidden;
        vcolumnNum = uploadInfo.columnNum;
        vhiddenColumns = uploadInfo.hiddenColumns;
        vremoveColumns = uploadInfo.removeColumns;
        vheaderRows = uploadInfo.headerRows;
        actionUrl = uploadInfo.action;
        delim = uploadInfo.delim;
        gridID = uploadInfo.gridID;
        fillHidden = uploadInfo.fillHidden;
        gridStartRow = uploadInfo.gridStartRow;
        gridStartCol = uploadInfo.gridStartCol;
        gridEndCol = uploadInfo.gridEndCol;
        ignoreStartRowIndexInSAX = uploadInfo.ignoreStartRowIndexInSAX;
        ignoreStartColumnIndexInSAX = uploadInfo.ignoreStartColumnIndexInSAX;
        gridSheetNo = uploadInfo.gridSheetNo;
        gridSheetName = uploadInfo.gridSheetName;
        activeSheet = !!uploadInfo.activeSheet;
        expressionColumns = uploadInfo.expressionColumns;
        type = uploadInfo.type;
        uploadType = uploadInfo.uploadType;
        skipSpace = uploadInfo.skipSpace;
        readUntilEmptyRow = uploadInfo.readUntilEmptyRow;
        var insertColumns = uploadInfo.insertColumns;
        processMsg = uploadInfo.processMsg;
        processMsg = opener.WebSquare.text.BASE64URLDecoder(processMsg );
        dataList = uploadInfo.dataList;
        instanceBind = uploadInfo.instanceBind;
        columnIds = uploadInfo.columnIds;
        status = uploadInfo.status;
        pwdStr = uploadInfo.pwd;
        loadingMode = uploadInfo.loadingMode;
        optionParam = uploadInfo.optionParam;
        cellDataConvertor = uploadInfo.cellDataConvertor;
        decimal = uploadInfo.decimal;
        applyDecimal = uploadInfo.applyDecimal;
        useMaxByteLength = uploadInfo.useMaxByteLength;
        dateFormat = uploadInfo.dateFormat;
        byteCheckEncoding = uploadInfo.byteCheckEncoding;
        columnOrder = uploadInfo.columnOrder;
        chunkNum = uploadInfo.chunkNum || 0;
        trimFlag = uploadInfo.trim || false;
        useXHR = uploadInfo.useXHR || false;
        filePath = uploadInfo.filePath || "";
        useDialog = uploadInfo.useDialog || false;
        countSkipRow = uploadInfo.countSkipRow || "";

        var header_Exist =document.getElementsByName("header");
        if( typeof vheader == "string" ) {
            vheader  = opener.WebSquare.util.getBoolean(vheader);
        }
		
        if( vheader ) {
            header_Exist[0].options[0].selected = true;
        } else {
            header_Exist[0].options[1].selected = true;
        }

        document.getElementById("columnNum").value = vcolumnNum;
        document.getElementById("hiddenColumns").value = vhiddenColumns;
        document.getElementById("removeColumns").value = vremoveColumns;
        document.getElementById("headerRows").value = vheaderRows;
        document.getElementById("domain").value = domain;

        var advancedHidden = getParameter("advancedHidden");
        // advancedHidden
        var advancedSetting = document.getElementById("advancedSetting");
        if( typeof advancedHidden == "string") {
            advancedHidden = opener.WebSquare.util.getBoolean(advancedHidden);
        }

        if( advancedHidden ) {
            advancedSetting.style.display = 'none';
            advancedSetting.style.visibility = 'hidden';
        }

        var el = opener.WebSquare.xml.getElementsByTagName(opener[gridID].element, "w2:gBody");
        var rows =opener.WebSquare.xml.getElementsByTagName(el[0],"w2:row");
        var myrows = rows.length;
        document.getElementById("bodyRows").value = myrows;
        var myhidden =document.getElementsByName("hidden");
	
        if( typeof vhidden == "string") {
            vhidden  = opener.WebSquare.util.getBoolean(vhidden);
        }
		
        if( vhidden ) {
            myhidden[0].options[0].selected = true;
        } else {
            myhidden[0].options[1].selected =true;
        }

        document.getElementById("delim").value = delim;
        //document.getElementById("fillHidden").value = fillHidden;
        var myfillHidden =document.getElementsByName("fillHidden");
        if( typeof fillHidden == "string" ) {
            fillHidden  = opener.WebSquare.util.getBoolean(fillHidden);
        }

        if( fillHidden ) {
            myfillHidden[0].options[0].selected = true;
        } else {
            myfillHidden[0].options[1].selected =true;
        }
		
        var skip_space =document.getElementsByName("skip_space");
        if( typeof skipSpace == "string" ) {
            skipSpace  = opener.WebSquare.util.getBoolean(skipSpace);
        }
		
        if( skipSpace ) {
            skip_space[0].options[0].selected = true;
        } else {
            skip_space[0].options[1].selected = true;
        }

        var footer_Exist =document.getElementsByName("footer");
        if( typeof vfooter == "string" ) {
            vfooter  = opener.WebSquare.util.getBoolean(vfooter);
        }
		
        if( vfooter ) {
            footer_Exist[0].options[0].selected = true;
        } else {
            footer_Exist[0].options[1].selected = true;
        }

        document.getElementById("gridStartRow").value = gridStartRow;
        document.getElementById("gridStartCol").value = gridStartCol;
        document.getElementById("gridEndCol").value = gridEndCol;
        document.getElementById("ignoreStartRowIndexInSAX").value = ignoreStartRowIndexInSAX;
        document.getElementById("ignoreStartColumnIndexInSAX").value = ignoreStartColumnIndexInSAX;
        document.getElementById("gridSheetNo").value = gridSheetNo;
        document.getElementById("gridSheetName").value = gridSheetName;
        document.getElementById("activeSheet").value = String(activeSheet);
		
        document.getElementById("expressionColumns").value = expressionColumns;
        var gridStyle = "";
        var elemType = opener[gridID].element._elementType;

        if (elemType === "json") {
            gridStyle = opener.WebSquare.xmljs.json2xml(opener[gridID].element._element, {
                "changeKey" : {
                    "w2:select" : "w2:column" 
                } 
            });
        } else {
            gridStyle = opener.WebSquare.xml.noNameSpaceSerialize(opener[gridID].element._element);
        }
        document.getElementById("gridStyle").value = gridStyle;
        document.getElementById("insertColumns").value = insertColumns;
        if( pwdStr != "" ) {
            document.getElementById("pwd").value = opener.WebSquare.text.BASE64Decoder( pwdStr );
        }
        document.getElementById("loadingMode").value = loadingMode;
        document.getElementById("optionParam").value = optionParam;
        document.getElementById("cellDataConvertor").value = cellDataConvertor;
        document.getElementById("decimal").value = decimal;
        document.getElementById("applyDecimal").value = applyDecimal;
        document.getElementById("useMaxByteLength").value = useMaxByteLength;
        document.getElementById("dateFormat").value = dateFormat;
        document.getElementById("byteCheckEncoding").value = byteCheckEncoding;
        document.getElementById("columnOrder").value = columnOrder;
        document.getElementById("chunkNum").value = chunkNum;
        document.getElementById("trim").value = trimFlag;
        document.getElementById("uploadType").value = uploadType;
        document.getElementById("filePath").value = filePath;
        document.getElementById("useDialog").value = useDialog;
        document.getElementById("countSkipRow").value = countSkipRow;
        document.getElementById("readUntilEmptyRow").value = readUntilEmptyRow;

        with( document.__uploadForm__ ) {
            action = actionUrl;
        }
    }

    function doFinish() {
        if (frameModal == "true") {
            opener.WebSquare.layer._hideFrameModal(frameId);
        } else if (useModalDisable == "true") {
        	opener.WebSquare.layer.hideModal();
    	}
    }

    function upload( thisForm ) {
        try {
            var filename = document.getElementById("filename").value;
            if( !filename || filename =="" ) {
                return false;
            }

            if( maxFileSize != -1 ) {
                var uploadFile = document.getElementById( "filename" );
                if( uploadFile && uploadFile.files ) {
                    if( maxFileSize < uploadFile.files[0].size ) {
                        alert( Grid_warning9 );
                        return;
                    }
                }
            }
	         
            var encPwd = "";
            var pwdStr = document.getElementById("pwd").value;
            if( pwdStr != "" ) {
                encPwd = opener.WebSquare.text.BASE64Encoder( pwdStr );
            }
            document.getElementById("pwd").value = encPwd;
			
            var isXlsFile = filename.toLowerCase().indexOf(".xls") >= 0 || filename.toLowerCase().indexOf(".cell") >= 0 || filename.toLowerCase().indexOf(".ods") >= 0 || filename.toLowerCase().indexOf(".odt") >= 0 || filename.toLowerCase().indexOf(".docx") >= 0 || filename.toLowerCase().indexOf(".doc") >= 0 || filename.toLowerCase().indexOf(".hwp") >= 0;
            var isCSVFile = endsWith(filename.toLowerCase(), ".csv") || endsWith(filename.toLowerCase(), ".txt");
            var isCSVType = document.__uploadForm__.action.indexOf("csvToXML") >= 0;
            if( !isXlsFile && !(isCSVFile && isCSVType) ) {
                alert( Upload_msg4 );
                return false;
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
                //alert(layerUP);
                layerUP.style.border="1px solid blue";
                layerUP.style.width="100px";
                layerUP.style.height="100px";
                layerUP.style.visibility = "hidden";
                document.body.appendChild(layerUP);
                src = opener.WebSquare.net.getSSLBlankPage();
                _safeInnerHTML(layerUP, "<iframe frameborder='0px' name='" + thisForm.target + "' scrolling='no' style='width:100px; height:100px' " + src + "></iframe>");
            }
			
            showProcessMessage( processMsg );
			
            if (useXHR) {
                var form = document.getElementsByName("__uploadForm__");
                fileSelected = form[0].filename.files[0];

                var formData = new FormData();
                formData.append("filename", fileSelected);

                var paramList = form[0].getElementsByTagName("input");
                for (var i=0; i<paramList.length; i++) {
                    formData.append(paramList[i].name, paramList[i].value);
                }

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        var result = xhr.responseText;

                        var idx1 = result.indexOf("'");
                        var idx2 = result.lastIndexOf("'");
                        result = result.substring(idx1+1, idx2);

                        returnData(result);
                    }
                };
                xhr.open("POST", actionUrl, true);
                var fileName = encodeURIComponent(fileSelected.name);
                xhr.setRequestHeader("X-File-Name", fileName);

                var reqHeaderFuncName = opener.WebSquare.core.getConfiguration("/WebSquare/handler/requestHeaderFunction/@value");
                if(reqHeaderFuncName != "") {
                    var reqHeaderFunc = opener.WebSquare.util.getGlobalFunction(reqHeaderFuncName);
                    if (reqHeaderFunc) {
                        reqHeaderFunc(xhr, "excelupload");
                    }
                }

                xhr.send(formData);
            } else {
                thisForm.submit();
            }

            var sendBtn = document.getElementById("sendFILE");
            sendBtn.disabled = true;
        } catch(e) {
            alert(e.description);
        }
    }

    function returnData( vData ) {
        if( processMsg != "" ) {
            hideProcessMessage();
        }

        var sendBtn = document.getElementById("sendFILE");
        sendBtn.disabled = false;

        if(chunkNum > 0) {
            vappend = true;
        }

        var decPwd = "";
        var pwdStr = document.getElementById("pwd").value;
        if( pwdStr != "" ) {
            decPwd = opener.WebSquare.text.BASE64Decoder( pwdStr );	
        }
        document.getElementById("pwd").value = decPwd;

        var doc = opener.WebSquare.xml.parse( vData );
        var exception = doc.getElementsByTagName("Exception");

        if( exception.length > 0) {
            var code = getTextNodeValue( doc.getElementsByTagName("deniedCodeList")[0] );
            if( typeof code == "undefined" || code == null || code == "" ) {
                code = "";	
            }

            if( code == "102" ) {
                msg = Upload_msg2;
            } else if( code == "101" ) {
                msg = Upload_msg9;
            } else if( code == "200" ) {
                msg = Upload_msg10;
            } else if( code == "201" ) {
                msg = Upload_msg11;
            } else if( code == "202" ) {
                msg = Upload_msg8;
            } else if( code == "203" ) {
                msg = Upload_msg12;
            } else if( code == "204" ) {
                msg = Upload_msg13;
            } else if( code == "205" ) {
                msg = Upload_msg14;
            } else if( code == "206" ) {
                msg = Upload_msg15;
            } else if( code == "207" ) {
                msg = Upload_msg16;
            } else if( code == "208" ) {
                msg = Upload_msg17;
            } else if( code == "209" ) {
                msg = Upload_msg18;
            } else {
                var msg = getTextNodeValue( doc.getElementsByTagName("message")[0] );
                if( typeof msg == "undefined" || msg == null || msg == "" ) {
                    msg = Upload_msg3;
                }
            }
			
            alert(msg);
        } else { 
            var child = (doc.getElementsByTagName("array"))[0].firstChild.nodeValue;
            child = child.replaceAll("\\n", "\n");
			
            if( typeof vappend =="string" ) {
                vappend = opener.WebSquare.util.getBoolean(vappend);
            }
			
            try {

                var jsonArray = {
                    columnInfo:columnIds.split(","),
                    data:child
                }

                if( dataList != "" ) {	
                    var dcComp = opener.WebSquare.util.getComponentById(dataList);
                    var preCnt = dcComp.getRowCount();
                        if( uploadType == 1 || uploadType == 2 ) {
                        if( delim != "," ) {
                            dcComp.setArrayFile(jsonArray, vappend, gridID, uploadType, delim);
                        } else {
                            dcComp.setArrayFile(jsonArray, vappend, gridID, uploadType);
                        }
                    } else if( uploadType == 0 ) {
                        if( delim != "," ) {
                            dcComp.setArray(jsonArray, vappend, null, null, delim);
                        } else {
                            dcComp.setArray(jsonArray, vappend);
                        }
                    }

                    if( status == "C" ) {
                        var postCnt = dcComp.getRowCount();
                        if( vappend ) {
                            dcComp.modifyRangeStatus( preCnt, postCnt, "C" );
                        } else {
                            dcComp.modifyRangeStatus( 0, postCnt, "C" );
                        }
                    }
                } else {
                    var compId = gridID;
                    var gridObj = opener.window[compId];
                    var preCnt = gridObj.getRowCount();

                    if(gridObj.options.ref && (instanceBind == true || instanceBind == 'true')) {
                        gridObj.options.instanceBindBySetData = true;
                        if( uploadType == 1 || uploadType == 2 ) {
                            gridObj.setDataFile(child, vappend);
                        } else if( uploadType == 0 ) {
                            gridObj.setData(child, vappend);
                        }
                        gridObj.options.instanceBindBySetData = false;
                    } else {
                        if( uploadType == 1 || uploadType == 2 ) {
                            gridObj.setDataFile(child, vappend);
                        } else if( uploadType == 0 ) {
                            gridObj.setData(child, vappend);
                        }
                    }

                    if( status == "C" ) {
                        var postCnt = gridObj.getRowCount()
                        if( vappend ) {
                            gridObj.modifyRangeStatus( preCnt, postCnt, "C" );
                        } else {
                            gridObj.modifyRangeStatus( 0, postCnt, "C" );
                        }
                    }
                }

                opener[gridID]._excelUploadInfo = "";

                var fileNameDom = document.getElementById("filename");
                var fileName = fileNameDom.value;
                var fileNameArr = fileName.split("\\");
                opener.window[gridID].fireFileReadEnd( fileNameArr[fileNameArr.length-1] );

                var extension = fileName.substring( fileName.lastIndexOf(".") + 1);
                if(loadingMode == "POI" || chunkNum == 0 || extension == "xls") {
                    window.self.close();
                }

            } catch (e) {
                opener.WebSquare.exception.printStackTrace(e);
                alert( Upload_msg5 );
            }
        }
    }
	
    function windowClose() {
        var form = document.getElementsByName("__uploadForm__")[0];
        if (form) {
            form.reset();
        }
        window.self.close();
    }
	
    function receiveMessage(retObj) {
        try {
            returnData(retObj.data);
        } catch (e) {
            opener.WebSquare.exception.printStackTrace(e);
            alert( Upload_msg5 );
        }
    }

    function getTextNodeValue(element) {
        var returnValue = null;
        var retValue = "";
        for(var child=element.firstChild; child!=null; child=child.nextSibling){
            if ( child.nodeType == 3 ) {
                retValue += child.nodeValue;
            }
        }

        if( retValue != "" ) {
            returnValue = retValue;
        }

        return returnValue;
    }

    function crossBrowserSize() {
        try {
            var sizeInfo = {
                "height": 204,
                "width": 462
            };
            var pObj = opener || parent.opener;
            if (pObj.WebSquare.util.isIE(6)) {
                sizeInfo.height = 212;
                sizeInfo.width = 456;
            } else if (pObj.WebSquare.util.isIE(7)) {
                sizeInfo.height = 218;
                sizeInfo.width = 457;
            } else if (pObj.WebSquare.util.isIE(8)) {
                sizeInfo.height = 218;
                sizeInfo.width = 457;
            } else if (pObj.WebSquare.util.isIE(9)) {
                sizeInfo.height = 204;
                sizeInfo.width = 446;
            } else if (pObj.WebSquare.util.isIE(10)) {
                sizeInfo.height = 204;
                sizeInfo.width = 446;
            } else if (pObj.WebSquare.util.isIEAllVersion(11)) {
                sizeInfo.height = 195;
                sizeInfo.width = 458;
            } else if (pObj.WebSquare.util.isSpartan()) {
                sizeInfo.height = 178;
                sizeInfo.width = 446;
            } else if (typeof pObj.WebSquare.util.isChromeEdge === "function" && pObj.WebSquare.util.isChromeEdge()) {
                if (navigator.userAgent.indexOf("OPR") != -1) { //opera
                    if (osName == "window") {
                        sizeInfo.height = 226;
                        sizeInfo.width = 462;
                    } else if (osName == "mac") {
                        sizeInfo.height = 189;
                        sizeInfo.width = 446;
                    }
                } else { //chrome
                    if (osName == "window") {
                        sizeInfo.height = 204;
                        sizeInfo.width = 462;
                    } else if (osName == "mac") {
                        sizeInfo.height = 192;
                        sizeInfo.width = 446;
                    }
                }
            } else if (pObj.WebSquare.util.isChrome()) {
                if (navigator.userAgent.indexOf("OPR") != -1) { //opera
                    if (osName == "window") {
                        sizeInfo.height = 226;
                        sizeInfo.width = 462;
                    } else if (osName == "mac") {
                        sizeInfo.height = 189;
                        sizeInfo.width = 446;
                    }
                } else { //chrome
                    if (osName == "window") {
                        sizeInfo.height = 202;
                        sizeInfo.width = 460;
                    } else if (osName == "mac") {
                        sizeInfo.height = 192;
                        sizeInfo.width = 446;
                    }
                }
            } else if (pObj.WebSquare.util.isFF()) {
                if (osName == "window") {
                    sizeInfo.height = 213;
                    sizeInfo.width = 462;
                } else if (osName == "mac") {
                    sizeInfo.height = 191;
                    sizeInfo.width = 446;
                }
            } else if (pObj.WebSquare.util.isSafari()) {
                if (osName == "window") {
                    sizeInfo.height = 155;
                    sizeInfo.width = 446;
                } else if (osName == "mac") {
                    sizeInfo.height = 155;
                    sizeInfo.width = 446;
                }
            } else if (pObj.WebSquare.util.isOpera()) {
                if (osName == "window") {
                    sizeInfo.height = 189;
                    sizeInfo.width = 446;
                } else if (osName == "mac") {
                    sizeInfo.height = 189;
                    sizeInfo.width = 446;
                }
            }
        } catch (e) {
        	opener.WebSquare.exception.printStackTrace(e);
        }
        return sizeInfo;
    }
    
    function crossBrowserHeight() {
        try {
            var widthSize = 145;
            var pObj = opener || parent.opener;
            if (pObj.WebSquare.util.isIE(6)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isIE(7)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isIE(8)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isIE(9)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isIE(10)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isIEAllVersion(11)) {
                widthSize = 145;
            } else if (pObj.WebSquare.util.isFF()) {
                if (osName == "window") {
                    widthSize = 145;
                } else if (osName == "mac") {
                    widthSize = 145;
                }
            } else if (pObj.WebSquare.util.isChrome()) {
                if (osName == "window") {
                    widthSize = 145;
                } else if (osName == "mac") {
                    widthSize = 145;
                }
            } else if (pObj.WebSquare.util.isSafari()) {
                if (osName == "mac") {
                    widthSize = 145;
                }
            } else if (pObj.WebSquare.util.isOpera()) {
                if (osName == "window") {
                    widthSize = 145;
                } else if (osName == "mac") {
                    widthSize = 145;
                }
            }
        } catch (e) {
        	opener.WebSquare.exception.printStackTrace(e);
        }
        return widthSize;
    }

    var preChecked = false;
    function check_fun() {
        var checkfun = document.getElementById('subcheck').checked;
        if( checkfun == preChecked ) {
            return;
        }

        if( checkfun == true ) {
            document.getElementById('sub').style.display='block';
            var height = crossBrowserHeight();
            window.resizeBy(0 , height);//resizeBy ff7.0
        } else {
            document.getElementById('sub').style.display='none';
            var height = crossBrowserHeight();
            window.resizeBy(0 ,-1 * parseInt(height));//resizeBy ff7.0
        }
        preChecked = checkfun;
    }
	
    function showProcessMessage( processMsg ) {
		
        try {
            if(!processMsg || processMsg == "" ) { 
                return;
            }

            var processbar2_main = document.getElementById( "___processbar2" );
            var processbar2 = document.getElementById( "___processbar2_i" );
            var processMsgURL = opener.WebSquare.core.getConfiguration( "processMsgURL" );
            var processMsgHeight = opener.WebSquare.core.getConfiguration( "processMsgHeight" );
            var processMsgWidth = opener.WebSquare.core.getConfiguration( "processMsgWidth" );
            var processMsgBackground = opener.WebSquare.core.getConfiguration( "processMsgBackground" );
            var processMsgBackgroundColor = opener.WebSquare.core.getConfiguration( "/WebSquare/processMsgBackground/@backgroundColor" );
            if (processMsgBackgroundColor == ""){
                processMsgBackgroundColor = "#112233";	
            }
            if( processMsgURL == "" ) {
                processMsgURL = opener.WebSquare.baseURI + opener.WebSquare.BootLoader.inquiresPath("message/processMsg.html");
            }
			
            processMsgURL = processMsgURL + "?param=" + opener.WebSquare.text.URLEncoder(processMsg);
			
            if( processMsgHeight == "" || processMsgWidth == "" ) {
                processMsgHeight = "74";
                processMsgWidth = "272";
            }

            WebSquare = opener.WebSquare;
            WebSquare.layer.processMsg = processMsg;
			
            if(!processbar2_main){
                var node2Main = document.createElement( "div" );
                node2Main.id = "___processbar2";
                node2Main.className = "w2modal";
                node2Main.style.backgroundColor = processMsgBackgroundColor;
                node2Main.tabIndex = 1;
                if(processMsgBackground == "true"){
                    node2Main.style.visibility = "visible";
                } else{
                    node2Main.style.visibility = "hidden";
                }
				
                node2Main.style.height = document.documentElement.clientHeight + "px";
                document.body.appendChild( node2Main );
				
                var e = e || event;
                if( e.preventDefault ) {
                    if( e.type == "keydown" ) {
                        e.preventDefault();
                    }
                } else {
                    if( e.type == "keydown" ) {
                        e.returnValue = false;
                    }
                }
				
            } else {
                processbar2_main.tabIndex = 1;
                processbar2_main.style.zIndex = 10000;
                processbar2_main.style.display = "block";
                processbar2_main.style.top = "0px";
                processbar2_main.style.left = "0px";
            }

            if( !processbar2 ) {
                var nTop = document.documentElement.scrollTop + document.documentElement.clientHeight/2 - parseInt(processMsgHeight)/2;
                var nLeft = document.documentElement.scrollLeft + document.documentElement.clientWidth/2 - parseInt(processMsgWidth)/2;

                var node2 = document.createElement("div");
                node2.id = "___processbar2_i";
                node2.style.position = "absolute";
                node2.style.top = parseInt(nTop) + "px";
                node2.style.left = parseInt(nLeft) + "px";
                node2.style.overflow = "hidden";
                node2.style.zIndex = 10001;
                node2.style.visibility = "visible";
                node2.style.height = processMsgHeight + "px";
                node2.style.width = processMsgWidth + "px";

                document.body.appendChild( node2 );
                _safeInnerHTML(node2, "<iframe frameborder='0' scrolling='no' name='__processbarIFrame' style='position:absolute; width:"+processMsgWidth+"px; height:"+ processMsgHeight +"px; top:0px; left:0px' src='" + processMsgURL + "'></iframe>");
				
            } else {
                var nTop = document.documentElement.scrollTop + document.documentElement.clientHeight/2 - parseInt(processMsgHeight)/2;
                var nLeft = document.documentElement.scrollLeft + document.documentElement.clientWidth/2 - parseInt(processMsgWidth)/2;
                processbar2.style.top = parseInt(nTop) + "px";
                processbar2.style.left = parseInt(nLeft) + "px";
                processbar2.style.zIndex = 10001;
                window.frames["__processbarIFrame"].location.replace( processMsgURL );
                processbar2.style.display = "block";
            }
        } catch( e ) {
            opener.WebSquare.exception.printStackTrace(e);
        }
    }
	
    function hideProcessMessage() {
        try {
            var processbar2 = document.getElementById( "___processbar2" );
            var processbar2i = document.getElementById( "___processbar2_i" );
            if( typeof processbar2 != "undefined" && processbar2 != null ) {
                processbar2.style.zIndex = -1;
                processbar2.style.display = "none";
                processbar2.tabIndex = "-1";
                processbar2.textContent = '';
            }
            if( typeof processbar2i != "undefined" && processbar2i != null ) {
                processbar2i.style.zIndex = -1;
                processbar2i.style.display = "none";
            }
        } catch( e ) {
            opener.WebSquare.exception.printStackTrace(e);
        }
    }

    function toArray( str, delim ) {
        if( delim == undefined ) {
            delim = "\",\"";
        } else {
            delim = "\"" + delim + "\"";
        }

        if( typeof str != "string") {
            if( str === null ) {
            } else {
            }
            return [];
        }

        var re = /^\[\s*\]$/g;
			
        if( str.match( re) != null ){
            return (new Array());
        }
		
        var splitDataIn = str.split( delim );
        splitDataIn[0] = splitDataIn[0].substr(2);
        splitDataIn[splitDataIn.length-1] = splitDataIn[splitDataIn.length-1].substr(0,((splitDataIn[splitDataIn.length-1]).length-2));	
        return splitDataIn;
    }

    function getParameter(param) {
        var ret = "";
        var paramObj = {};
        try {
            var srch = location.search.substring(1);
            var arrayOfSrch = srch.split("&");
            for (var i = 0; i < arrayOfSrch.length; i++) {
                var tmpArray = arrayOfSrch[i].split("=");
                if (tmpArray.length == 2) {
                    paramObj[trim(tmpArray[0])] = trim(tmpArray[1]);
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
</script>

<style>
    html, body {margin:0px; padding:0px; font-family:"Malgun Gothic"; font-size:11px;}
    p {margin:0px; padding:0px;}
        img, fieldset {border:0;}
        table {width:100%; background:#fff; border-collapse:collapse; border-spacing:0; empty-cells:show;}
        table caption, table summary {width:0; height:0; font-size:0; line-height:0; overflow:hidden; visibility:hidden;}
	
        .none {display:none;}
        .block {display:block;}

        .wrap {width:444px; min-height:106px; border:1px solid #b3b3b3;}
        .header {height:27px; background:url(../../uiplugin/grid/upload/images/bg_header.gif) repeat-x left top;}
        .header .title {padding-left:28px; font-weight:bold; line-height:23px; background:url(../../uiplugin/grid/upload/images/bul_title.gif) no-repeat 11px 6px; float:left;}
        .header .title2 {padding-left:28px; font-weight:bold; line-height:23px; float:left;}
        .header span {padding-right:20px; float:right; display:block;}
        .header span input[type=checkbox] {position:relative; top:1px;}

        .content {padding:15px 10px 12px;}
        .content .filebox {padding:8px 0 0 11px; width:408px; height:33px; border:1px solid #d3d3d3; background:#f6f6f6;}
        .content .filebox span {display:inline-block; width:300px; height:21px; font-family:Verdana; font-size:12px; background:#fff;}

        .tbl {margin:15px auto 0; width:400px;}
        .tbl th, .tbl td {min-width:100px; height:24px; text-align:left;}
        .tbl th .dot {padding-left:14px; background:url(../../uiplugin/grid/upload/images/dot.gif) no-repeat left center;}
        .tbl td .ipt {width:74px; height:16px; /*bordeR:1px solid #abadb3;*/}
        .tbl td .sel {width:80px; height:20px;}
        .btn_file {margin-bottom:14px; width:90px; position:relative; left:333px;}
</style>
</head>
<body style="overflow: hidden;">
<form name="__uploadForm__" method="post" action="" enctype="multipart/form-data" target="__targetFrame__">
	
    <div class="wrap">
        <div class="header">
            <p class="title" id="file_header">File Upload</p>
            <span id="advancedSetting"><input type="checkbox" onclick="check_fun();" id="subcheck" /><label for="subcheck"><p id="setting" class="title2">Advanced</p></label></span>
        </div>
        <div class="content">
            <div class="filebox">
                <button type="button" id="choose_file">Choose File</button>
                <span class="fileName" id="choose_span">No file chosen</span>
                <input type="file" id="filename" name="filename" style="display:none;">
            </div>
            <table id="sub" class="tbl none" summary="Ignore blank spaces,Hidden values,Fill Hidden,Footer,Start Row,Start col,Sheet no">
                <caption id="advaned">Advanced</caption>
                <tr>
                    <th><label id="space_option" for="spaceSelect" class="dot">Ignore blank spaces</label></th>
                    <td>
                        <select name="skip_space" class="sel" id="spaceSelect">
                            <option value="true">Ignore blank spaces</option>
                            <option value="false">Include blank spaces</option>
                        </select>
                    </td>
                    <th><label id="start_option" for="gridStartRow" class="dot">Start Row :</label></th>
                    <td>
                        <input type="text" id="gridStartRow" name="gridStartRow" class="ipt" />
                    </td>
                </tr>
                <tr>
                    <th><label id="hidden_option" for="hiddenSelect" class="dot">Hidden values :</label></th>
                    <td><select name="hidden" id="hiddenSelect" class="sel">
                        <option value="true">Include</option>
                        <option value="false">Not include</option>
                        </select>
                    </td>
                    <th><label id="start_col" for="gridStartCol" class="dot">Start Col :</label></th>
                    <td>
                        <input type="text" class="ipt" name="gridStartCol" id="gridStartCol" />
                    </td>
                </tr>
                <tr>
                    <th><label id="hidden_fill" for="fillHidden" class="dot">Fill Hidden :</label></th>
                    <td>
                        <select name="fillHidden" id="fillHidden">
                            <option value="true">Fill</option>
                            <option value="false">Ignore</option>
                        </select>
                    </td>
                    <th><label id="sheet_no" for="gridSheetNo" class="dot">Sheet No :</label></th>
                    <td><input type="text" class="ipt" name="gridSheetNo" id="gridSheetNo" /></td>
                </tr>  
                <tr>
                    <th><label id="isHeader" for="header" class="dot">Header :</label></th>
                    <td>
                        <select name="header" id="header">
                            <option value="true">Include</option>
                            <option value="false">Not include</option>
                        </select>
                    </td>
                    <th><label id="isFooter" for="footer" class="dot">Footer :</label></th>
                    <td>
                        <select name="footer" id="footer">
                            <option value="true">Include</option>
                            <option value="false">Not nclude</option>
                        </select>
                    </td>
                </tr> 
                <tr>
                    <th><label id="isPwd" for="pwd" class="dot">Password :</label></th>
                    <td colSpan="2"><input type="password" class="ipt" name="pwd" id="pwd" autocomplete="off" /></td>
                </tr> 
            </table>
        </div>
		
        <div class="foot">
            <p><input type="button" id="sendFILE" name="sendFILE" class="btn_file" value="File Upload" onclick="return upload(this.form)" /></p>
        </div>

    </div>
  <!-- working start -->
    <input type="hidden" id="domain" name="domain" value="" />
    <input type="hidden" id="columnNum" name="columnNum" value="" />
    <input type="hidden" id="hiddenColumns" name="hiddenColumns" value="" />
    <input type="hidden" id="removeColumns" name="removeColumns" value="" />
    <input type="hidden" id="headerRows" name="headerRows" value="" />
    <input type="hidden" id="bodyRows" name="bodyRows" value="" />
    <!-- input type="hidden" id="hidden" name="hidden" value=""/ -->
    <input type="hidden" id="delim" name="delim" value="" />
    <input type="hidden" id="expressionColumns" name="expressionColumns" value="CC" />
    <input type="hidden" id="gridStyle" name="gridStyle" value="" />
    <input type="hidden" id="insertColumns" name="insertColumns" value="" />
    <input type="hidden" id="gridEndCol" name="gridEndCol" value="" />
    <input type="hidden" id="ignoreStartRowIndexInSAX" name="ignoreStartRowIndexInSAX" value="" />
    <input type="hidden" id="ignoreStartColumnIndexInSAX" name="ignoreStartColumnIndexInSAX" value="" />
    <input type="hidden" id="loadingMode" name="loadingMode" value="" />
    <input type="hidden" id="optionParam" name="optionParam" value="" />
    <input type="hidden" id="cellDataConvertor" name="cellDataConvertor" value="" />
    <input type="hidden" id="decimal" name="decimal" value="" />
    <input type="hidden" id="applyDecimal" name="applyDecimal" value="" />
    <input type="hidden" id="useMaxByteLength" name="useMaxByteLength" value="" />
    <input type="hidden" id="dateFormat" name="dateFormat" value="" />
    <input type="hidden" id="byteCheckEncoding" name="byteCheckEncoding" value="" />
    <input type="hidden" id="columnOrder" name="columnOrder" value="" />
    <input type="hidden" id="gridSheetName" name="gridSheetName" value="" />
    <input type="hidden" id="activeSheet" name="activeSheet" value="" />
    <input type="hidden" id="chunkNum" name="chunkNum" value="" />
    <input type="hidden" id="trim" name="trim" value="" />
    <input type="hidden" id="uploadType" name="uploadType" value="" />
    <input type="hidden" id="filePath" name="filePath" value="" />
    <input type="hidden" id="useDialog" name="useDialog" value="" />
    <input type="hidden" id="countSkipRow" name="countSkipRow" value="" />
    <input type="hidden" id="readUntilEmptyRow" name="readUntilEmptyRow" value="" />
</form>
<script>
    var file = document.getElementById("filename");
    var fileBtn = document.getElementById("choose_file");
    var fileName = document.querySelector(".fileName");
    fileBtn.addEventListener("click", function() {
        file.click();
    });
    file.addEventListener("change", function() {
        if (file.value) {
            var name = file.value.split("\\").pop();
            fileName.textContent = name;
        }
    });
</script>
</body>
</html>