(function() {
    var callWithJQuery;
    callWithJQuery = function(pivotModule) {
        if (typeof exports === "object" && typeof module === "object") {
            return pivotModule(require("jquery"));
        } else if (typeof define === "function" && define.amd) {
            return define(["jquery"], pivotModule);
        } else {
            return pivotModule(jQuery);
        }
    };
    callWithJQuery(function($) {
        var koFmt, koFmtInt, koFmtPct, koFmtUnique, nf, tpl;
        nf = $.pivotUtilities.numberFormat;
        tpl = $.pivotUtilities.aggregatorTemplates;
        koFmt = nf({
            thousandsSep: ",",
            decimalSep: "."
        });
        koFmtInt = nf({
            digitsAfterDecimal: 0
        });
        koFmtPct = nf({
            digitsAfterDecimal: 1,
            scaler: 100,
            suffix: "%"
        });
        koFmtUnique = nf({
            thousandsSep: ",",
            decimalSep: "."
        });
        return $.pivotUtilities.locales.ko = {
            localeStrings: {},
            aggregators: { // When adding aggregators, you must add the same as this._aggregatorsName for the user-defined numberFormat to be applied.
                "UniqueValue": tpl.uniqueValue(koFmtUnique),
                "Count": tpl.count(koFmtInt),
                "Count Unique Values": tpl.countUnique(koFmtInt),
                "List Unique Values": tpl.listUnique(", "),
                "Sum": tpl.sum(koFmt),
                "Integer Sum": tpl.sum(koFmtInt),
                "Average": tpl.average(koFmt),
                "Minimum": tpl.min(koFmt),
                "Maximum": tpl.max(koFmt)
            },
            renderers: {
                "Table": $.pivotUtilities.renderers["Table"]
                //,
                //"Table Barchart": $.pivotUtilities.renderers["Table Barchart"],
                //"Heatmap": $.pivotUtilities.renderers["Heatmap"],
                //"Row Heatmap": $.pivotUtilities.renderers["Row Heatmap"],
                //"Col Heatmap": $.pivotUtilities.renderers["Col Heatmap"]
            }
        };
    });
}).call(this);