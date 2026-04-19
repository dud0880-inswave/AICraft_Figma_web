﻿
CKEDITOR.editorConfig = function( config )
{

	config.toolbar_default = [
	                                  	['Source','DocProps','-','NewPage','Preview','-'],
	                                  	['Cut','Copy','Paste','PasteText','PasteFromWord','-','Print'],
	                                  	['Undo','Redo','SelectAll','RemoveFormat'],
	                                  	['Bold','Italic','Underline'],
	                                  	['StrikeThrough','Subscript','Superscript'],
	                                  	['OrderedList','UnorderedList','-','Outdent','Indent','Blockquote'],
	                                  	['JustifyLeft','JustifyCenter','JustifyRight','JustifyFull'],
	                                  	['Anchor','Table'],
	                                  	['Rule','SpecialChar','PageBreak','TextColor','BGColor','ShowBlocks'],
	                                  	['Styles','Format','Font','FontSize']		// No comma for the last row.
	                                  ] ;
	config.toolbar_simple = [
	                                	['Font','FontSize','Table','Image'],
	                                  	['Bold','Italic','Underline','TextColor']
	                                  ];
	config.toolbar_defaultImage = [
	                                  	['Source','DocProps','-','NewPage','Preview','-'],
	                                  	['Cut','Copy','Paste','PasteText','PasteFromWord','-','Print'],
	                                  	['Undo','Redo','SelectAll','RemoveFormat'],
	                                  	['Bold','Italic','Underline'],
	                                  	['StrikeThrough','Subscript','Superscript'],
	                                  	['OrderedList','UnorderedList','-','Outdent','Indent','Blockquote'],
	                                  	['JustifyLeft','JustifyCenter','JustifyRight','JustifyFull'],
	                                  	['Anchor','Table','Image'],
	                                  	['Rule','SpecialChar','PageBreak','TextColor','BGColor','ShowBlocks'],
	                                  	['Styles','Format','Font','FontSize']		// No comma for the last row.
	                                  ] ;
	config.font_names	 = 'Gulim;Dotum;Batang;Arial;Comic Sans MS;Courier New;Tahoma;Times New Roman;Verdana' ; 
	config.fullPage = false;    // With these settings in place, CKEditor will output the entire HTML page, including the elements outside the <body> section.
	config.enterMode = CKEDITOR.ENTER_BR;    // Enter Tag (BR P DIV)
	config.fontSize_sizes = '8/8px;9/9px;10/10px;11/11px;12/12px;14/14px;16/16px;18/18px;20/20px;22/22px;24/24px;26/26px;28/28px;36/36px;48/48px;72/72px';    // font size
	config.startupFocus = false;    // When setting this option to "true", the editor will force the cursor focus inside the editing area when the page is loaded.
	                                // This is useful on pages where you have only one editor instance without other fields, so the user can start typing right away.
	config.skin ="moono-lisa";
	config.allowedContent = true;
	config.clipboard_handleImages = false;

	config.pasteFromWordPromptCleanup = true;
	config.pasteFromWordRemoveFontStyles = false;
	config.pasteFromWordRemoveStyles = false;
	
	config.extraPlugins = 'resize';
	config.removePlugins = 'exportpdf';
	//config.resize_dir = 'both'; both || vertical || horizontal

	config.filebrowserUploadMethod = 'form';
};
