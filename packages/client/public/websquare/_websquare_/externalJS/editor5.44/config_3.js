﻿CKEDITOR.EDITOR_CONFIG = {
	toolbar_default: [
		'sourceEditing','|',
		'undo','redo','selectAll','removeFormat','|',
		'bold','italic','underline','|',
		'strikethrough','subscript','superscript','|',
		'numberedList','bulletedList','|','outdent','indent','blockQuote','|',
		'alignment:left','alignment:center','alignment:right','alignment:justify','|',
		'insertTable','|',
		'horizontalLine','specialCharacters','pageBreak','fontColor','fontBackgroundColor','showBlocks','|',
		'heading','fontFamily','fontSize'
	],
	toolbar_simple: [
		'fontFamily','fontSize','|','insertTable','insertImage','|', 
		'bold','italic','underline','fontColor'
	],
	toolbar_defaultImage: [
		'sourceEditing','|',
		'undo','redo','selectAll','removeFormat','|',
		'bold','italic','underline','|',
		'strikethrough','subscript','superscript','|',
		'numberedList','bulletedList','|','outdent','indent','blockQuote','|',
		'alignment:left','alignment:center','alignment:right','alignment:justify','|',
		'insertTable','insertImage','|',
		'horizontalLine','specialCharacters','pageBreak','fontColor','fontBackgroundColor','showBlocks','|',
		'heading','fontFamily','fontSize'
	],
	wordCount: {
		displayWords: false,
		displayCharacters: true,
	},
	fontFamily: {
	},
	fontSize: {
		options: ['8px','9px','10px','11px','12px','14px','16px','18px','20px','22px','24px','26px','28px','36px','48px','72px']
	},
	image: {
		toolbar: [ 'imageStyle:inline','imageStyle:block','imageStyle:side','|','toggleImageCaption','imageTextAlternative','|','linkImage' ]
	},
	table: {
		contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties', 'toggleTableCaption' ]
	},
	emoji: {
		definitionsUrl: 'cdn'
	},
};
