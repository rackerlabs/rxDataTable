/* jshint maxlen: 1000 */
var app = angular.module('rxDataTable', []);
/**
 *
 * @ngdoc directive
 * @namespace rxDataTable
 * @name rxDataTable
 * @restrict E
 * @description
 * Directive that creates a data table with responsive design properties. This
 * requires the following directives:
 *
 * - {@link rxDataTable.paginate:rxPaginate rxPaginate} Pagination Directive
 * - {@link rxDataTable.paginate:rxItemsPerPage rxItemsPerPage} Items per Page Directive
 *
 * @param {Object=} pager-object This is the page tracking object for the directive. If
 * no page tracking object is passed in, then the data table will be shown
 * without pagination.
 * @param {Array.<Object>} list-of-data This is the list of data that the data table will represent
 * @param {Array.string=|string=|boolean=} predicate This is the sort predicate. This should be an
 *      array of strings that will be used as sort predicates. (i.e. **`"['-severity']"`**).
 *      You may also pass a value of **`false`** in order to disable sorting on
 *      all columns that don't have a sortField value explicitely defined.
 * @param {string=} row-key This is the attribute of the data objects that will
 *                       be used to attatch a data-value-key paramater to each
 *                       row of the table
 * @param {function=} row-details Setting this attribute to a function will add
 *      a toggle to the end of the right side of the table on each row that
 *      will insert and fill in the result of this function onto the table.
 * @param {expression=} row-details-clause If this attribute is set, it will be
 *      evaluated for every row, and if true, will only apply the row details
 *      function to those rows.
 * @param {string='Items'} item-name This is what the data table will fill in
 *                      to indicate what the items in it really are.
 * @param {number=} notify-duration This is a default notification duration in
 *      milliseconds. This value is 3000 by default.
 * @param {boolean=} data-loading This is a flag that should be passed to the
 *      data table to indicate loading status.
 * @param {string=} row-style This is an object in a string format that is parsed
 *    in the code and applied to each row in the table.
 *
 *    It takes three attributes:
 *
 *    - **`class`** `{string}`: This is the class that gets to the row.
 *    - **`field`** `{string}`: This is the data field that the comparisons will be made against.
 *    - **`bool`** `{boolean}`: If true, then it just checks the field to see if it's truthy and applies the class. If it's false (default), then the value of the field is applied as a class along with the value in the class attribute. To account for non-string data values in the field, this will check to see if the first character in the field value is numerical, if it is, it prepends the value with an underscore (\_).  So, for example, if you have your class as data-service-level and the field value turns out to be a 2, then the class attribute of the row will be **`class="data-service-level _2"`**. This allows you to grab that row with **`.data-service-level._2`** and apply CSS values to it.
 *
 o @param {Object} column-display This object will hold the current display
 *    state of the various columns in the data table. It has/needs two
 *    properties:
 *
 *    - **`index`** `{integer}` This is the current column preset index that is
 *      selected.
 *    - **`config`** `{array.<integer>}` This is the list of the currently displayed
 *      column indices from the `columnConfiguration` object
 * @param {array.<Object>} column-presets This is a list of objects that
 *    configure the available column presets for the data table. The format of
 *    each object should be as follows:
 *
 *    - **`title`** `{string}` This is the title of the preset that will show in the
 *      dropdown
 *    - **`config`** `{array.<integer>}` This is the list of indices from the
 *      columnConfiguration object that will be displayed. Order matters.
 * @param {string=} column-multi-sort This is a string taking value of `true` or
 *    `false`. If `true`, the multi-sorting capabilities of the table will be
 *    enabled. Value is `false` by default.
 * @param {string=} column-reordering This is a string taking value of `true`
 *    or `false`. If `true`, the `columnReordering` and presets are enabled.
 *    Default is `false`.
 * @param {array.<object>} column-configuration This are the available column definitions, see the
 *    extended information for this in the {@link #/guides/rx-data-table#column-object Data Table Guide}
 */
app.directive('rxDataTable', function ($http, $timeout, $document, $filter, $parse, PageTracking) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'src/templates/rx-data-table.html',
        scope: {
            pagerObject: '=?',
            loadingData: '&',
            columnConfiguration: '=',
            columnDisplay: '=?',
            columnPresets: '=?',
            rowKey: '@',
            rowStyle: '&',
            itemName: '@',
            listOfData: '&',
            predicate: '=?',
            columnMultiSort: '@',
            notifyDuration: '@',
            columnReordering: '@',
            rowDetails: '&',
            rowDetailsClause: '@',
            rowPrefix: '&',
            rowPrefixClause: '@'
        },
        link: function (scope, element) {
            /* jshint evil: true */
            scope.configurationVisible = false;
            scope.enableColumnMultiSort = (!_.isEmpty(scope.columnMultiSort)) ? scope.columnMultiSort : false;
            scope.enableColumnReordering = (!_.isEmpty(scope.columnReordering)) ? scope.columnReordering : false;

            scope.defaultNotificationDuration = (_.isUndefined(scope.notifyDuration)) ? 3000 : parseInt(scope.notifyDuration, 10);

            scope.isLoading = scope.loadingData;

            if (_.isUndefined(scope.pagerObject)) {
                scope.pagerObject = PageTracking.createInstance();
                scope.pagerObject.showAll = true;
            }

            if (_.isUndefined(scope.columnPresets)) {
                // There aren't any presets defined, so we are going to create
                // a basic default view
                scope.columnPresets = [
                    {
                        'title': 'Default View',
                        'config': _.map(scope.columnConfiguration, 'id')
                    }
                ];
            }

            if (_.isUndefined(scope.columnDisplay)) {
                scope.columnDisplay = {index: 0};
            }

            // Here are the Row Details Things
            scope.showRowDetails = (!_.isUndefined(scope.rowDetails) && _.isFunction(scope.rowDetails()));
            scope.canExpandRow = function (row) {
                if (!_.includes(['IssueTrak', 'ServiceNow-DP', 'ServiceNow-Internal', 'ServiceNow-Global', 'Splunk'], row.system)) {
                    if (scope.showRowDetails && !_.isEmpty(scope.rowDetailsClause)) {
                        return $parse(scope.rowDetailsClause)(row);
                    }

                    return scope.showRowDetails;
                } else {
                    return false;
                }
            };
            scope.currentRow = '';

            scope.toggleRow = function (key) {
                var dataTable = element[0];
                var row = dataTable.querySelector('.data-row[data-row-key="' + key + '"]');
                var detailsDiv;

                if (scope.currentRow !== '') {
                    detailsDiv = dataTable.querySelector('.data-row-details[data-row-key="' + scope.currentRow + '"]');
                    dataTable.removeChild(detailsDiv);
                } else {
                    detailsDiv = document.createElement('div');
                    detailsDiv.classList.add('data-row-details');
                }

                detailsDiv.innerHTML = '';

                if (scope.currentRow === key) {
                    scope.currentRow = '';
                } else {
                    detailsDiv.setAttribute('data-row-key', key);
                    scope.currentRow = key;
                    var rowDetailsFunction = scope.rowDetails();
                    var rowDetailsElement = rowDetailsFunction(key);

                    angular.element(detailsDiv).append(rowDetailsElement);

                    angular.element(row).after(detailsDiv);
                }
            };

            if (scope.showRowDetails) {
                scope.$watch('pagerObject', function () {
                    if (scope.currentRow !== '') {
                        setTimeout(function () {
                            var detailsDiv = element[0].querySelector(
                                '.data-row-details[data-row-key="' + scope.currentRow + '"]');

                            if (!detailsDiv) {
                                scope.currentRow = '';
                            }
                        }, 100);
                    }

                }, true);
            }

            // Here's the row prefix clause
            scope.showRowPrefix = (!_.isUndefined(scope.rowPrefix) && _.isFunction(scope.rowPrefix()));
            scope.shouldHaveRowPrefix = function (row) {
                if (scope.showRowPrefix && !_.isEmpty(scope.rowPrefixClause)) {
                    return $parse(scope.rowPrefixClause)(row);
                }

                return scope.showRowPrefix;
            };

            scope.buildContent = function (row, column) {
                if (_.has(column, 'contentFunction')) {
                    return column.contentFunction(row);
                }
            };

            scope.buildLink = function (row, column) {
                if (_.has(column, 'linkField') && _.has(row, column.linkField)) {
                    return row[column.linkField];
                } else if (_.has(column, 'linkFunction') && _.isFunction(column.linkFunction)) {
                    return column.linkFunction(row);
                }
            };

            scope.getPredicate = function () {
                if (scope.predicate === false) {
                    // This means we're going to be disabling sorting on all
                    // columns unless they have an explicit sort field
                    scope.disableSorting = true;
                    return [];
                } else if (!_.isArray(scope.predicate)) {
                    scope.predicate = [scope.compilePredicateString(scope.getConfig()[0])];
                }

                return scope.predicate;
            };

            scope.canAddNewMultiSort = function () {
                var pred = scope.getPredicate();

                if (_.isEmpty(_.last(pred))) {
                    return false;
                } else {
                    return (pred.length < scope.columnConfiguration.length);
                }
            };
            scope.getSortField = function (column) {
                if (_.isObject(column)) {
                    return (column.sortField||(column.sortField !== false)) && column.sortField || column.dataField;
                }
            };

            scope.allowEditing = function (column, row) {
                return ((_.has(column, 'editable')) && (column.editable.clause(row)));
            };

            scope.getEditType = function (column, row) {
                if (scope.allowEditing(column, row)) {
                    var editable = column.editable;
                    if (_.has(editable, 'data')) {
                        return 'typeahead';
                    } else if (_.has(editable, 'options') || _.has(editable, 'dataOptions')) {
                        return 'select';
                    } else {
                        return 'text';
                    }
                } else {
                    return false;
                }
            };

            scope.getNGClass = function (column, row) {
                var classes = {};
                if (_.has(column, 'editable') && _.has(column.editable, 'nullable')) {
                    classes.nullable = column.editable.nullable;
                }

                if (_.has(column, 'class')) {
                    classes[column.class] = true;
                }

                var sortClass = scope.sortClass(column);

                if (!_.isEmpty(sortClass)) {
                    classes[sortClass] = true;
                }

                if (_.has(column, 'ng-class') && _.isFunction(column['ng-class'])) {
                    var classFunction = column['ng-class'];
                    var classValue = classFunction(row);

                    if (!_.isEmpty(classValue)) {
                        if(_.isArray(classValue)) {
                            _.map(classValue, function (className) {
                                classes[className] = true;
                            });
                        } else {
                            classes[classValue] = true;
                        }
                    }
                } else if (_.has(column, 'ng-class') && _.isObject(column['ng-class'])) {
                    classes = angular.extend(classes, column['ng-class']);
                }

                return classes;
            };

            scope.getEditableOptions = function (column, row, typedValue) {
                if (_.has(column, 'editable')) {
                    var editable = column.editable;
                    var opts;
                    if (_.has(editable, 'data')) {
                        opts = editable.data(row, typedValue);
                        return _.isObject(opts) ? opts : [];
                    } else if (_.has(editable, 'dataOptions')) {
                        opts = editable.dataOptions(row, typedValue);
                        return _.isObject(opts) ? opts : [];
                    } else if (_.has(editable, 'options')) {
                        return editable.options;
                    }
                }

                return [];
            };

            scope.nullField = function (column, row, elementScope) {
                if (_.has(column.editable, 'nullable') && column.editable.nullable) {
                    scope.updateField(column, row, null, elementScope);
                }
            };

            scope.showStatusMessage = function(type, message, duration) {
                if (_.isUndefined(duration)) {
                    duration = scope.defaultNotificationDuration;
                }

                scope.updateFieldStatus = {
                    'status': type,
                    'message': message
                };

                if (_.isNumber(duration)) {
                    $timeout(scope.clearStatusMessage.bind(scope), duration);
                }
            };

            scope.clearStatusMessage = function() {
                scope.updateFieldStatus = undefined;
            };

            scope.updateField = function(column, row, data) {
                if (!_.has(column.editable, 'endpoint')) {
                    // First we're going to see if the user has provided a
                    // custom update method to us instead
                    if (_.has(column.editable, 'method')) {
                        return column.editable.method(column, row, data);
                    } else {
                        return false;
                    }
                }
                scope.showStatusMessage('saving', 'Saving value for "' + column.title + '"', false);

                var updateMethod = $http[column.editable.endpoint.method];
                var updateBody = {};
                updateBody[column.dataField] = data;
                var updateURL = column.editable.endpoint.url;
                var foundElements = /\{(\w+)\}/.exec(updateURL);

                while (foundElements) {
                    updateURL = updateURL.replace(foundElements[0], row[foundElements[1]]);
                    foundElements = /\{(\w+)\}/.exec(updateURL);
                }

                // Now we are going to check to see if there is a
                // pre-update callback that needs to happen.
                if (_.has(column.editable, 'preUpdate') && _.isFunction(column.editable.preUpdate)) {
                    // This will stop updating with a false value returned
                    // from the preUpdate function.
                    if (!column.editable.preUpdate(column, row, data)) {
                        scope.showStatusMessage('error', 'There was an error running the pre update method and the data was not saved.');

                        return;
                    }
                }

                // We'll run the method
                return updateMethod(updateURL, updateBody).then(function () {
                    scope.showStatusMessage('success', 'Saved data for "' + column.title + '" field');
                    row[column.dataField] = _.clone(data);

                    // Now we are going to check to see if there is a
                    // post-update-success callback that needs to happen.
                    if (_.has(column.editable, 'postUpdateSuccess') && _.isFunction(column.editable.postUpdateSuccess)) {
                        column.editable.postUpdateSuccess(column, row, data);
                    }

                    return true;
                }, function (responseData) {
                    var errorMessage = 'Error saving data for "' + column.title + '" field';

                    if (_.has(responseData.data, 'error')) {
                        errorMessage += '\n' + responseData.data.error;
                    }

                    scope.$emit('data-table-error', errorMessage);

                    // Now we are going to check to see if there is a
                    // post-update-error callback that needs to happen.
                    if (_.has(column.editable, 'postUpdateError') && _.isFunction(column.editable.postUpdateError)) {
                        column.editable.postUpdateError(column, row, responseData);
                    }

                    return false;
                }).then(function () {
                    $timeout(scope.clearStatusMessage.bind(scope), scope.defaultNotificationDuration);

                    return true;
                });
            };

            scope.$on('data-table-error', function ($event, errorString, errorDisplayTimeout) {
                if (!_.isNumber(errorDisplayTimeout)) {
                    errorDisplayTimeout = scope.defaultNotificationDuration;
                }

                scope.showStatusMessage('error', errorString, errorDisplayTimeout);

                $timeout(function () {
                    scope.updateFieldStatus = undefined;
                }, errorDisplayTimeout);
            });

            scope.scoreTooltipTemplate = function (row) {
                var template = [
                    row.account_tier || '', //jshint ignore:line
                    row.score.type,
                    ' for ticket is ',
                    $filter('rxAge')(moment().subtract(row.score.maxResponseTime, 'seconds'), 2, true) + '.',
                    '<br/>Waiting on Racker for ',
                    $filter('rxAge')(row.score.lastResponseTime, 3, true) + '.',
                    '<br/><br/>Score: ',
                    row.score.weight,
                    ' * ',
                    row.score.priorityWeight,
                    ' * ',
                    row.score.severityWeight,
                    ' * (',
                    row.score.elapsedTime,
                    '/',
                    row.score.maxResponseTime,
                    ') * (',
                    row.score.elapsedTime,
                    '/',
                    row.score.slMaxResponseTime,
                    ')'
                ];
                return template.join(' ');
            };

            scope.iconUnwrap = function (column, row, type) {
                return _.filter(column.icon, function (icon) {
                    if (_.has(icon, 'fieldValue')) {
                        if (_.isArray(row[icon.field]) && _.includes(row[icon.field], icon.fieldValue)) {
                            return true;
                        } else if (icon.fieldValue === row[icon.field]) {
                            return true;
                        }
                    }

                    if (_.has(icon, 'fieldValues')) {
                        return _.isArray(icon.fieldValues) && _.includes(icon.fieldValues, row[icon.field]);
                    } else if (row[icon.field] === true) {
                        return true;
                    } else if (_.has(icon, 'fieldMinLength') && _.isArray(row[icon.field])) {
                        return row[icon.field].length >= icon.fieldMinLength;
                    } else if (icon.persistent === true) {
                        return true;
                    } else if (_.has(icon, 'editable') && icon.editable === true) {
                        return !_.isUndefined(column.editable) && column.editable.clause(row);
                    }
                }).filter(function (icon) {
                    if ((_.has(icon, 'name') && (type === 'i'))||(_.has(icon, 'class') && (type === 'div'))) {
                        return true;
                    }
                });
            };

            scope.rowClass = function (row) {
                if (!_.isUndefined(scope.rowStyle) &&  _.isFunction(scope.rowStyle())) {
                    return scope.rowStyle()(row);
                }
            };

            scope.hasValue = function(row, column) {
                if (_.isArray(column.dataField)) {
                    return _.some(column.dataField, _.bind(function (fieldName) {
                        return (_.has(this, fieldName) && !_.isEmpty(this, fieldName));
                    }, row));
                } else {
                    return (_.has(row, column.dataField) && !_.isEmpty(row, column.dataField));
                }
            };

            scope.decompilePredicateString = function (pred) {
                if (_.isArray(pred)) {
                    return pred;
                }

                var rev = false;

                if (pred.substr(0,1) === '-') {
                    pred = pred.substr(1);
                    rev = true;
                }

                return {'column': pred, 'reverse': rev};
            };

            scope.getPresetConfiguration = function () {
                // This is here to make sure that there is a value specified in
                // the columnDisplay.index binding. This is used throughout the
                // application and just ensures that things don't go insane.
                if (!_.isNumber(scope.columnDisplay.index)) {
                    scope.columnDisplay.index = 0;
                }

                if (!scope.isPresetCustom()) {
                    scope.columnDisplay.config = _.clone(scope.getColumnPresets()[scope.columnDisplay.index].config);
                }
                return scope.columnDisplay.config;
            };

            scope.getConfig = function () {
                return _.compact(_.map(scope.getPresetConfiguration(), function (columnIndex) {
                    return _.find(scope.columnConfiguration, { id: columnIndex });
                }));
            };

            scope.getColumnPresets = function () {
                // This is to make sure that when I call columnPresets that it
                // actually has something there.
                if (_.isEmpty(scope.columnPresets)) {
                    scope.columnPresets = [];
                }

                return scope.columnPresets;
            };

            scope.markPresetAsCustom = function () {
                var presets = scope.getColumnPresets();
                if (!_.find(presets, {'title': 'User Preset'})) {
                    presets.push({
                        'title': 'User Preset',
                        'config': scope.columnDisplay.config
                    });
                } else {
                    presets[presets.length - 1].config = scope.columnDisplay.config;
                }

                if (_.isNumber(scope.columnDisplay.index)) {
                    scope.columnDisplay.index = presets.length - 1;
                }
            };

            scope.getColumnPresetSelects = _.memoize(function () {
                return _.map(scope.getColumnPresets(), function (preset, index) {
                    return {'text': preset.title, 'value': index};
                });
            }, function () {
                return _.template('<%=length%>|<%=indices%>', {
                    length: scope.getColumnPresets().length,
                    indices: _.last(scope.getColumnPresets()).config
                });
            });

            scope.isPresetCustom = function () {
                return (scope.getColumnPresets()[scope.columnDisplay.index].title == 'User Preset');
            };

            scope.moveColumn = function(currentIndex, destinationIndex) {
                if (!scope.isPresetCustom()) {
                    scope.markPresetAsCustom();
                }

                var columnToMove = scope.columnDisplay.config.splice(currentIndex, 1)[0];
                scope.columnDisplay.config.splice(destinationIndex, 0, columnToMove);
            };

            scope.moveColumnUp = function (columnIndex) {
                if (columnIndex > 0) {
                    scope.moveColumn(columnIndex, columnIndex - 1);
                }
            };

            scope.moveColumnDown = function (columnIndex) {
                if (columnIndex < scope.columnDisplay.config.length - 1) {
                    scope.moveColumn(columnIndex, columnIndex + 1);
                }
            };

            scope.removeColumn = function (columnIndex) {
                if (!scope.isPresetCustom()) {
                    scope.markPresetAsCustom();
                }

                scope.columnDisplay.config.splice(columnIndex, 1);
            };

            scope.showColumn = function (columnIndex) {
                if (!scope.isPresetCustom()) {
                    scope.markPresetAsCustom();
                }

                if (!_.includes(scope.columnDisplay.config, columnIndex)) {
                    scope.columnDisplay.config.push(columnIndex);
                }
            };

            scope.getAvailableColumns = function () {
                return _.filter(scope.columnConfiguration, function (column) {
                    return !_.includes(scope.columnDisplay.config, column.id);
                });
            };

            scope.findColumnFromPredicate = function (pred) {
                var column = _.find(scope.getConfig(), function (column) {
                    return (pred === scope.getSortField(column));
                });

                return column || {};
            };

            scope.parseReverseSort = function (column, rev) {
                if (_.isObject(column)) {
                    return (column.sortReverse) ? !rev : rev;
                } else {
                    return scope.parseReverseSort(scope.findColumnFromPredicate(column), rev);
                }
            };

            scope.compilePredicateString = function (column, rev, fromSortField) {
                var pred = (fromSortField) ? column : scope.getSortField(column);
                return ((scope.parseReverseSort(column, rev)) ? '-' : '') + pred;
            };

            scope.singleColumnSort = function(column) {
                scope.pagerObject.pageNumber = 0;

                if (scope.sortedBy(column)) {
                    scope.predicate = [scope.compilePredicateString(column, true)];
                } else {
                    scope.predicate = [scope.compilePredicateString(column)];
                }

                angular.element(document).data('sortingData', scope.getPredicate());
            };

            scope.addColumnSort = function (column) {
                var sortIndex = scope.getSortedIndex(column);

                if (sortIndex === -1) {
                    sortIndex = scope.getSortedIndex(column, true);

                    if (sortIndex >= 0) {
                        if (scope.getPredicate().length > 1) {
                            scope.predicate.splice(sortIndex, 1);
                        } else {
                            scope.predicate[sortIndex] = scope.compilePredicateString(column);
                        }
                    } else {
                        scope.predicate.push(scope.compilePredicateString(column));
                    }
                } else {
                    scope.predicate[sortIndex] = scope.compilePredicateString(column, true);
                }
            };

            scope.sortable = function (column) {
                if (_.isObject(column)) {
                    if (scope.disableSorting && _.has(column, 'sortField')) {
                        return true;
                    } else if (scope.disableSorting || column.sortField === false) {
                        return false;
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }
            };

            scope.sort = function ($event, column) {
                if (scope.sortable(column)) {
                    if ($event.shiftKey) {
                        scope.addColumnSort(column);
                    } else {
                        scope.singleColumnSort(column);
                    }
                }
            };

            scope.sortClass = function (column) {
                var index = scope.getSortedIndex(column);
                if (index === -1) {
                    index = scope.getSortedIndex(column, true);
                }

                if (index >= 0) {
                    return 'sorted-' + index + '-' + ((scope.sortedBy(column)) ? 'asc' : 'desc');
                }
            };

            scope.getSortedIndex = function (column, inverted) {
                var pred = scope.compilePredicateString(column, inverted);
                return scope.getPredicate().indexOf(pred);
            };

            scope.isOverflowActive = function (dataCell) {
                return (dataCell.offsetWidth < dataCell.scrollWidth);
            };

            scope.hoverTimeouts = {};
            scope.cellMouseEnter = function (enterEvent) {
                var dataCell = enterEvent.target;
                var dataKey = dataCell.parentElement.className + dataCell.className;
                var dataCellContent = dataCell.querySelector('.data-cell-content');

                if (_.has(scope.hoverTimeouts, dataKey)) {
                    $timeout.cancel(scope.hoverTimeouts[dataKey]);
                }

                scope.hoverTimeouts[dataKey] = $timeout(function () {
                    if (!_.isEmpty(dataCellContent) && scope.isOverflowActive(dataCellContent)) {
                        // Overflow is active for this cell, let's allow it to grow
                        var widthDelta = dataCellContent.scrollWidth - dataCellContent.offsetWidth;
                        var heightDelta = dataCellContent.scrollHeight - dataCellContent.offsetHeight;

                        var newCell = dataCell.cloneNode(true);
                        newCell.classList.add('overflow-hover');

                        newCell.style.top = dataCell.offsetTop + 'px';
                        newCell.style.left = dataCell.offsetLeft + 'px';

                        newCell.style.width = dataCell.offsetWidth + 'px';
                        newCell.style.height = dataCell.offsetHeight + 'px';

                        $timeout(function () {
                            newCell.style.top = (dataCell.offsetTop - (heightDelta / 2)) + 'px';
                            newCell.style.left = (dataCell.offsetLeft - (widthDelta / 2)) + 'px';
                            newCell.style.width = (dataCell.offsetWidth + widthDelta) + 'px';
                            newCell.style.height = (dataCell.scrollHeight + heightDelta) + 'px';
                        }, 0);

                        newCell.onmouseleave = function () {
                            dataCell.removeChild(newCell);
                        };

                        dataCell.appendChild(newCell);
                    }
                }, 500);
            };

            scope.cellMouseLeave = function (leaveEvent) {
                var dataCell = leaveEvent.target;
                var dataKey = dataCell.parentElement.className + dataCell.className;
                var subCell = dataCell.querySelector('.data-cell .overflow-hover');

                if (_.has(scope.hoverTimeouts, dataKey)) {
                    $timeout.cancel(scope.hoverTimeouts[dataKey]);
                    delete scope.hoverTimeouts[dataKey];
                }

                if (subCell) {
                    try {
                        dataCell.removeChild(subCell);
                    } catch(err) {
                        // we're going to ignore problems with this.
                    }
                }
            };

            scope.sortedBy = function (column, inverted) {
                return (scope.getSortedIndex(column, inverted) >= 0);
            };

            scope.reversePredicate = function (index) {
                var pred = scope.decompilePredicateString(scope.getPredicate()[index]);
                if (!_.isEmpty(pred.column)) {
                    pred.reverse = scope.parseReverseSort(pred.column, pred.reverse);
                    scope.predicate[index] = scope.compilePredicateString(pred.column, !pred.reverse, true);
                }
            };

            scope.updatePredicate = function (index, selectBoxValue) {
                var column = scope.findColumnFromPredicate(selectBoxValue);
                if (!_.isEmpty(column)) {
                    scope.predicate[index] = scope.compilePredicateString(column);
                }
            };

            scope.removePredicate = function (index) {
                if (scope.getPredicate().length > 1) {
                    scope.predicate.splice(index, 1);
                }
            };

            scope.getSortableColumnSelects = function () {
                var returnSelects = [];

                _.forEach(scope.getConfig(), _.bind(function (column) {
                    this.retObj.push({'text': column.title, 'value': this.getSortField(column)});
                }, {'retObj': returnSelects, 'getSortField': scope.getSortField}));

                return _.filter(_.filter(returnSelects, 'text'), 'value');
            };

            scope.toggleVisibility = function (state) {
                if (state !== undefined) {
                    scope.configurationVisible = state;
                } else {
                    scope.configurationVisible = !scope.configurationVisible;
                }
            };

            scope.menuShown = {};
            scope.toggleMenu = function (row, column) {
                if (scope.isMenuShown(row, column)) {
                    scope.menuShown = {};
                } else {
                    scope.menuShown = {col: column, row: row};
                }
            };

            scope.isMenuShown = function (row, column) {
                if (_.isUndefined(scope.menuShown)) {
                    scope.menuShown = {};
                }

                return (_.isEqual(scope.menuShown, {row: row, col: column}));
            };

            scope.executeAction = function (row, menuItem) {
                if (_.has(menuItem, 'action') && _.isFunction(menuItem.action)) {
                    menuItem.action(row);
                    scope.menuShown = {};
                }
            };

            // Have to a setTimeout so that it's there.
            setTimeout(function () {
                var stopProp = function (e) {
                    e.stopPropagation();
                };

                angular.element(element[0].querySelector('.data-table-config-container')).on('click', stopProp);
                angular.element(element[0].querySelector('.menu-column')).on('click', stopProp);
            }, 1);

            scope.$watch(scope.dataList, function () {
                var stopProp = function (e) {
                    e.stopPropagation();
                };
                angular.element(element[0].querySelector('.menu-column')).on('click', stopProp);
            }, true);

            $document.on('click', function () {
                this.toggleVisibility(false);
            }.bind(scope));

            if(scope.enableColumnReordering) {
                (function InitalizeReorderableColumns() {
                    scope.dragTarget;

                    var isHeaderCell = function (el) {
                        if (!el) {
                            return;
                        }

                        el = angular.element(el);
                        if (_.isUndefined(el.attr('class'))) {
                            return;
                        }

                        var hasHeaderRegex = /data-header-cell/;
                        var hasColumnRegex = /data-column/;

                        var classString = el.attr('class');

                        return hasHeaderRegex.test(classString) && hasColumnRegex.test(classString);
                    };

                    var findCompatibleParent = function (context, where) {
                        var currentElement = angular.element(context);
                        var resultantElement;

                        if (where(currentElement[0])) {
                            return currentElement;
                        }

                        while (!_.isEmpty(currentElement.parent())) {
                            var parent = currentElement.parent();
                            if (!parent) {
                                break;
                            }

                            if (where(parent[0])) {
                                resultantElement = parent;
                                break;
                            }

                            currentElement = parent;
                        }

                        resultantElement = resultantElement ? resultantElement : undefined;

                        return resultantElement;
                    };

                    element.on('dragstart', function (event) {
                        scope.dragTarget = event.target;

                        // FF requires data to be transfered in a drag/drop.
                        event.dataTransfer.setData('text/plain', angular.element(scope.dragTarget).text());
                    });

                    element.on('dragend', function (event) {
                        scope.dragTarget = undefined;
                        event.preventDefault();
                    });

                    element.on('dragover', function (event) {
                        var from = findCompatibleParent(event.target, isHeaderCell);
                        var to = angular.element(event.target);

                        if (!_.isUndefined(from) && (from !== to)) {
                            event.preventDefault();
                        }
                    });

                    element.on('drop', function (event) {
                        event.preventDefault();
                        var toElement = findCompatibleParent(event.target, isHeaderCell);
                        var fromElement = angular.element(scope.dragTarget);

                        if (toElement !== fromElement) {
                            var indicies = {
                                from: undefined,
                                to: undefined
                            };

                            var parseLocation = function (el) {
                                if (!el) {
                                    return;
                                }
                                var regex = /data-column-(\d*)/;

                                if (regex.test(el.attr('class'))) {
                                    return (parseInt(regex.exec(el.attr('class'))[1]) - 1);
                                }
                            };

                            // Grab the FROM index
                            indicies.from = parseLocation(fromElement);

                            // Grab the TO index
                            indicies.to = parseLocation(toElement);

                            scope.moveColumn(indicies.from, indicies.to);

                            scope.$apply();
                        }
                    });
                })();
            }
        }
    };
});

app.filter('UnusedSorts', function() {
    return function(configObject, predicates, currentColumn, sortableFunction) {
        return _.filter(configObject, _.bind(function (column) {
            // This is here to find the sortField value
            var sortField = '';
            if (_.isObject(column)) {
                sortField = (column.sortField||(column.sortField !== false)) && column.sortField || column.dataField;
            }

            if (_.isFunction(sortableFunction) && !sortableFunction(column)) {
                return false;
            }
            if (currentColumn == sortField) {
                return true;
            } else {
                return !(_.includes(this.predicate, sortField) || _.includes(this.predicate, '-'+sortField));
            }
        }, {predicate: predicates}));

    };
});

app.filter('ColumnValue', function ($filter) {
    return function (row, column, allowEditing) {
        var columnValue = {value: ''};
        allowEditing = (_.isUndefined(allowEditing)) ? true : allowEditing;

        var field = (_.has(column, 'displayField') && _.has(row, column.displayField)) ? column.displayField : column.dataField;

        if (!_.isArray(field)) {
            field = [field];
        }

        _.forEach(field, _.bind(function (fieldName, fieldIndex, field) {
            if (_.has(this.row, fieldName)) {
                if (_.has(this.column, 'filter')) {
                    if (_.has(this.column, 'filterParameters')) {
                        this.columnValue.value += $filter(this.column.filter).apply(this, [this.row[fieldName]].concat(this.column.filterParameters));
                    } else {
                        this.columnValue.value += $filter(this.column.filter)(this.row[fieldName]);
                    }
                } else {
                    this.columnValue.value += this.row[fieldName];
                }

                if (fieldIndex < field.length - 1) {
                    this.columnValue.value += '\n';
                }

            }
        }, {columnValue: columnValue, column: column, row: row}));

        columnValue = columnValue.value;
        if (allowEditing) {
            columnValue = ((_.isEmpty(columnValue)) && (_.has(column, 'emptyValue'))) ? column.emptyValue : columnValue;
        }

        return columnValue;
    };
});

app.filter('rxDataTableSorting', function ($filter) {
    var orderBy = $filter('orderBy');

    return function (data, predicate, pagerObject) {
        return (pagerObject.serverPaging) ? data : orderBy(data, predicate);
    };
});

angular.module('rxDataTable')
/**
 *
 * @ngdoc directive
 * @name rxDataTable.paginate:rxPaginate
 * @restrict E
 * @description
 * Directive that takes in the page tracking object and outputs a page
 * switching controller
 *
 * @param {Object} page-tracking This is the page tracking service instance to
 * be used for this directive
 * @param {number} number-of-pages This is the maximum number of pages that the
 * page object will display at a time.
 */
    .directive('rxDataTablePaginate', function () {
        return {
            templateUrl: 'src/templates/rx-data-table-paginate.html',
            restrict: 'E',
            replace: true,
            scope: {
                pageTracking: '=',
                numberOfPages: '@'
            },
            link: function (scope) {
                scope.$watch(function () {
                    return scope.pageTracking.total;
                }, function () {
                    if (scope.pageTracking.pageNumber >= scope.pageTracking.totalPages) {
                        scope.pageTracking.pageNumber = 0;
                    }
                });
            }
        };
    })
/**
 *
 * @ngdoc service
 * @name rxDataTable.paginate:PageTracking
 * @description
 * This is the data service that can be used in conjunction with the pagination
 * objects to store/control page display of data tables and other items.
 *
 * @property {number} MAX_PER_PAGE This is a value that is used in the
 * iteration function to generate the item size list.
 * @property {number} MIN_PER_PAGE This is a value that is used in the
 * iteration function to generate the item size list.
 * @property {number} ITEMS_PER_PAGE_STEP This is a value that is used in the
 * iteration function to generate the item size list.
 * @property {number} itemsPerPage This is the current setting for the number
 * of items to display per page
 * @property {number} pagesToShow This is the number of pages to show
 * in the pagination controls
 * @property {Array} itemSizeList This is where the
 * {@link rxDataTable.paginate:rxItemsPerPage rxItemsPerPage}
 * Directive will store it's list of items per page
 * @property {number} pageNumber This is where the current page number is
 * stored.
 * @property {boolean} pageInit This is used to determine if the page has been
 * initialzed before.
 * @property {number} total This is the total number of items that are in the
 * data set
 * @property {boolean} showAll This is used to determine whether or not to use
 * the pagination or not.
 *
 * @method createInstance This is used to generate the instance of the
 * PageTracking object.
 */
    .factory('PageTracking', function() {
        function PageTrackingObject(showAll) {
            this.MAX_PER_PAGE = 50;
            this.MIN_PER_PAGE = 10;
            this.ITEMS_PER_PAGE_STEP = 10;
            this.itemsPerPage = 10;
            this.pagesToShow = 5;
            this.itemSizeList = [];
            this.pageNumber = 0;
            this.pageInit = false;
            this.total = 0;
            this.serverPaging = false;
            this.showAll = (showAll) ? true : false;
        }

        return {
            createInstance: function(showAll) {
                return new PageTrackingObject(showAll);
            }
        };
    }).
/**
 *
 * @ngdoc directive
 * @name rxDataTable.paginate:rxItemsPerPage
 * @restrict E
 * @description
 * Directive that takes in a page-tracking object and a label for what to call
 * items and outputs a select box that allows you to change how many items in
 * the list to show at a time
 *
 * @param {Object} pager-object This is the page tracking service instance to
 * be used for this directive
 * @param {string='Items'} label This is the name of the items that you are
 * restricting. It defaults to 'Items' and thus outputs 'Items per page'
 */
    directive('rxDataTableItemsPerPage', function(PageTracking) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'src/templates/rx-data-table-itemsPerPage.html',
            link: function(scope) {
                if (_.isUndefined(scope.pagerObject)) {
                    scope.pagerObject = PageTracking.createInstance();
                }

                if (!scope.pagerObject.pageInit) {
                    scope.pagerObject.pageInit = true;
                }

                try {
                    scope.updatePaging = function (value) {
                        if (!_.isUndefined(value)) {
                            scope.pagerObject.itemsPerPage = parseInt(value);
                        } else {
                            scope.pagerObject.itemsPerPage = parseInt(scope.pagerObject.itemsPerPage, 10);
                        }
                        scope.pagerObject.pageNumber = 0;
                    }.bind(scope);
                } catch (err) {
                    // This is here because the tests are being weird.
                }

                scope.pagerObject.itemSizeList = _.range(scope.pagerObject.MIN_PER_PAGE,
                    scope.pagerObject.MAX_PER_PAGE + scope.pagerObject.ITEMS_PER_PAGE_STEP,
                    scope.pagerObject.ITEMS_PER_PAGE_STEP);
            }
        };
    })

/**
 *
 * @ngdoc filter
 * @name rxDataTable.paginate:Paginate
 * @description
 * This is the pagination filter that is used to calculate the division in the
 * items list for the paging.
 *
 * @param {Object} items The list of items that are to be sliced into pages
 * @param {Object} pager-object The instance of the PageTracking service. If not
 * specified, a new one will be created.
 *
 * @returns {Object} The list of items for the current page in the PageTracking object
 */
    .filter('Paginate', function (PageTracking) {
        return function (items, pagerObject) {
            if (!pagerObject) {
                pagerObject = PageTracking.createInstance();
            }
            if (pagerObject.showAll) {
                pagerObject.total = items.length;
                return items;
            }
            if (items) {
                if (!pagerObject.serverPaging) {
                    pagerObject.total = items.length;
                } else if (!_.isNumber(pagerObject.total)) {
                    pagerObject.total = 0;
                }

                pagerObject.totalPages = Math.ceil(pagerObject.total / pagerObject.itemsPerPage);

                var modifier = (pagerObject.serverPaging) ? 1 : 0;
                var first = pagerObject.pageNumber * pagerObject.itemsPerPage;
                var added = first + pagerObject.itemsPerPage;
                var last = ((added > items.length) ? items.length : added) - modifier;

                pagerObject.first = parseInt(first + 1, 10);
                pagerObject.last = parseInt(last, 10);
                if (pagerObject.serverPaging) {
                    pagerObject.last += pagerObject.first;
                }

                return (pagerObject.serverPaging) ? items : items.slice(first, last);
            }
        };
    })
/**
 *
 * @ngdoc filter
 * @name rxDataTable.paginate:Page
 * @description
 * This is the pagination filter that is used to limit the number of pages
 * shown
 *
 * @param {Object} pager-object The instance of the PageTracking service. If not
 * specified, a new one will be created.
 *
 * @returns {Array} The list of page numbers that will be displayed.
 */
    .filter('Page', function (PageTracking) {
        return function (pagerObject) {
            if (!pagerObject) {
                pagerObject = PageTracking.createInstance();
            }

            var displayPages = [],
                // the next four variables determine the number of pages to show ahead of and behind the current page
                pagesToShow = pagerObject.pagesToShow || 5,
                pageDelta = (pagesToShow - 1) / 2,
                pagesAhead = Math.ceil(pageDelta),
                pagesBehind = Math.floor(pageDelta);

            if ( pagerObject && pagerObject.length !== 0) {
                    // determine starting page based on (current page - (1/2 of pagesToShow))
                var pageStart = Math.max(Math.min(pagerObject.pageNumber - pagesBehind, pagerObject.totalPages - pagesToShow), 0),

                    // determine ending page based on (current page + (1/2 of pagesToShow))
                    pageEnd = Math.min(Math.max(pagerObject.pageNumber + pagesAhead, pagesToShow - 1), pagerObject.totalPages - 1);

                for (pageStart; pageStart <= pageEnd; pageStart++) {
                    // create array of page indexes
                    displayPages.push(pageStart);
                }
            }

            return displayPages;
        };

    });

angular.module('rxDataTable').run(['$templateCache', function ($templateCache) {
	$templateCache.put('src/templates/htmlPopover.html', '<div class="popover {{placement}}" ng-class="{ in: isOpen(), fade: animation() }"> <div class="arrow"></div> <div class="popover-inner"> <h3 class="popover-title" bind-html-unsafe="title" ng-show="title"></h3> <div class="popover-content" bind-html-unsafe="content"></div> </div> </div> ');
	$templateCache.put('src/templates/rx-data-table-itemsPerPage.html', '<span class="pagination-items-per-page"> Show: <a ng-repeat-start="i in pagerObject.itemSizeList" ng-click="updatePaging(i)" ng-class="{ disabled: pagerObject.itemsPerPage===i }">{{ i }}</a> <span ng-repeat-end ng-show="!$last">|</span> </span> ');
	$templateCache.put('src/templates/rx-data-table-paginate.html', '<ul class="pagination"> <li ng-class="{disabled: pageTracking.pageNumber==0}" class="pagination-first"> <a ng-click="pageTracking.pageNumber=0" ng-hide="pageTracking.pageNumber==0">First</a> <span ng-show="pageTracking.pageNumber==0">First</span> </li> <li ng-class="{disabled: pageTracking.pageNumber==0}" class="pagination-prev"> <a ng-click="pageTracking.pageNumber=(pageTracking.pageNumber - 1)" ng-hide="pageTracking.pageNumber==0">« Prev</a> <span ng-show="pageTracking.pageNumber==0">« Prev</span> </li> <li ng-repeat="n in pageTracking | Page " ng-class="{active: n==pageTracking.pageNumber, \'page-number-last\': n==pageTracking.totalPages - 1}" class="pagination-page"> <a ng-click="pageTracking.pageNumber=n">{{n + 1}}</a> </li> <li ng-class="{disabled: pageTracking.pageNumber==pageTracking.totalPages - 1 || pageTracking.total==0}" class="pagination-next"> <a ng-click="pageTracking.pageNumber=(pageTracking.pageNumber + 1)" ng-hide="pageTracking.pageNumber==pageTracking.totalPages - 1 || pageTracking.total==0"> Next »</a> <span ng-show="pageTracking.pageNumber==pageTracking.totalPages - 1">Next »</span> </li> <li ng-class="{disabled: pageTracking.pageNumber==pageTracking.totalPages - 1}" class="pagination-last"> <a ng-click="pageTracking.pageNumber=pageTracking.totalPages - 1" ng-hide="pageTracking.pageNumber==pageTracking.totalPages - 1">Last</a> <span ng-show="pageTracking.pageNumber==pageTracking.totalPages - 1">Last</span> </li> </ul> ');
	$templateCache.put('src/templates/rx-data-table.html', '<div class="data-table"> <div class=\'alert\' ng-show="updateFieldStatus" ng-class="{\'loading\': updateFieldStatus.status==\'saving\', \'success\': updateFieldStatus.status==\'success\', \'error\': updateFieldStatus.status==\'error\'}"> {{ ::updateFieldStatus.message }} </div> <div class="data-info-row"> <div class="data-table-config-container" ng-if="enableColumnReordering||enableColumnMultiSort" ng-class="{\'dropdown-shown\': configurationVisible}"> <button class="btn-link" ng-click="toggleVisibility()"> <i class="fa fa-table data-table-config-icon" title="Configure Data Table"></i> </button> <div class="data-table-config reveal-animation" ng-show="configurationVisible"> <div class="header" ng-if="enableColumnMultiSort">Sorting</div> <div class="data-table-multi-sort" ng-if="enableColumnMultiSort"> <div class="data-config-row"> <div class="multi-sort-select header">Column</div> <div class="multi-sort-reverse-icon header">Dir</div> <div class="multi-sort-remove-icon header"><span ng-show="predicate.length> 1">Rem</span></div> </div> <div class="data-config-row" ng-repeat="pred in ::predicate" ng-init="predColumn=decompilePredicateString(pred)"> <div class="multi-sort-select"> <select rx-select name="sort-{{::$index}}" ng-model="predColumn.column" ng-change="updatePredicate($index, predColumn.column)"> <option ng-repeat="column in getConfig() | UnusedSorts:predicate:predColumn.column:sortable" value="{{ getSortField(column) }}" ng-selected="getSortField(column)==predColumn.column">{{ ::column.title }}</option> </select> </div> <button class="btn-link multi-sort-reverse-icon" ng-click="reversePredicate($index)"> <i class="fa" ng-class="{\'fa-sort-amount-asc\': !parseReverseSort(predColumn.column, predColumn.reverse), \'fa-sort-amount-desc\': parseReverseSort(predColumn.column, predColumn.reverse)}"></i> </button> <div class="multi-sort-remove-icon"> <button class="btn-link" ng-click="removePredicate($index)"> <i class="fa fa-times" ng-if="::predicate.length> 1"></i> </button> </div> </div> <button class="btn-link multi-sort-add" ng-if="canAddNewMultiSort()" ng-click="predicate.push(\'\')"> Add New Sort </button> </div> <div class="header" ng-if="enableColumnReordering">Column Configuration</div> <div class="data-table-column-display" ng-if="enableColumnReordering"> <div class="data-config-row"> <div class="header">Column Presets</div> </div> <div class="data-config-row column-preset-row"> <select rx-select ng-options="getColumnPresets().indexOf(preset) as preset.title for preset in getColumnPresets()" ng-model="columnDisplay.index"></select> </div> <div class="data-config-row"> <div class="header">Column Order</div> </div> <div class="data-config-row" ng-repeat="column in ::getConfig()"> <div class="data-config-column-title"> {{ ::column.title }} </div> <div class="column-order-arrows"> <button class="btn-link btn-move-down" ng-if="!$last" ng-click="moveColumnDown($index)"> <i class="fa fa-arrow-down"></i> </button> <button class="btn-link btn-move-up" ng-if="!$first" ng-click="moveColumnUp($index)"> <i class="fa fa-arrow-up"></i> </button> </div> <div class="column-hide-display"> <button class="btn-link" ng-click="removeColumn($index)"> <i class="fa fa-times"></i> </button> </div> </div> <div class="data-config-row" ng-if="getAvailableColumns().length> 0"> <div class="header">Available Columns</div> </div> <div class="data-config-row column-show-columns" ng-if="getAvailableColumns().length> 0"> <select rx-select ng-model="addColumn.index" ng-options="column.id as column.title for column in ::getAvailableColumns()"> </select> <button ng-click="showColumn(addColumn.index)" class="button button-tiny">add</button> </div> </div> </div> </div> </div> <div class="data-header"> <div class="data-header-cell data-column-{{ ($index + 1) }} flex-columns-{{ column.cols }}" ng-repeat="column in getConfig()" data-title="{{ column.title && column.title || column.dataField }}" ng-class="sortClass(column, $index)" draggable="true" ng-click="sort($event, column)" popover="{{ ::column.help.body }}" popover-append-to-body="true" popover-popup-delay="1500" popover-title="{{ ::column.help.title }}" popover-trigger="mouseenter" popover-placement="bottom"> <span class="checkbox-span" ng-if="column.checkbox && column.checkAll"> <input ng-click="checkAll(this)" type="checkbox" id="check_all_checkbox"> </span> <span ng-if="!column.checkbox" class="btn-link data-link" style="text-decoration: none"> <span class=\'data-header-cell-content\'>{{ column.title }}</span> <i ng-if="column.help" class="fa fa-question-circle"></i> <i class="fa fa-chevron-down" ng-show="sortedBy(column, true)"></i> <i class="fa fa-chevron-up" ng-show="sortedBy(column)"></i> </span> </div> <div class="data-header-cell data-header-expander" ng-if="showRowDetails"></div> </div> <div class="data-loader" ng-if="loadingData()"> <div class="spinner-container"> <div class="spinner"></div> <div class="loader-text">Loading...</div> </div> </div> <div class="data-row data-row-{{ $index + 1}}" ng-repeat="row in listOfData() | rxDataTableSorting:predicate:pagerObject | Paginate:pagerObject track by row[rowKey]||$index" data-row-key="{{row[rowKey]}}" ng-class="rowClass(row)"> <div class="data-row-prefix" ng-if="rowPrefixClause===\'true\'"> <div class="prefix-container" ng-if="shouldHaveRowPrefix(row)" ng-bind-html="::rowPrefix()(row)"> </div> </div> <div class="data-cell flex-columns-{{ ::column.cols }}" ng-repeat="column in getConfig()" data-title="{{ ::column.title }}" ng-class="getNGClass(column, row)" ng-mouseenter="cellMouseEnter($event)" ng-mouseleave="cellMouseLeave($event)"> <div ng-if="column.checkbox" class="checkbox"> <input type="checkbox" value="{{ ::row[column.dataField] }}" ng-click="clickAction(\'{{ row[column.dataField] }}\')" id="checkbox_{{ row[column.dataField] }}"> </div> <div ng-if="column.menu" class="menu-column"> <button class="menu-toggle btn-link" ng-click="toggleMenu(row, column)"> <i ng-if="!column.menu.icon" class="fa fa-cog fa-lg"></i> <i ng-if="column.menu.icon" class="fa" ng-class="column.menu.icon"></i> </button> <ul class="menu-items" ng-show="isMenuShown(row, column)"> <li class="menu-item" ng-repeat="menuItem in ::column.menu.items"> <button class="btn-link" ng-class="::menuItem.class" ng-click="executeAction(row, menuItem)"> <i ng-if="menuItem.icon" class="fa" ng-class="::menuItem.icon"></i> <span class="menu-item-text">{{ ::menuItem.text }}</span> </button> </li> </ul> </div> <div ng-if="!column.checkbox && !column.menu"> <i ng-repeat="icon in ::iconUnwrap(column, row, \'i\')" class="data-table-cell-icon {{ ::icon.name }}" tooltip="{{ ::icon.tooltip.text }}" tooltip-append-to-body="true" tooltip-placement="{{ ::((icon.tooltip.placement) ? icon.tooltip.placement : \'top\') }}"></i> <div ng-repeat="icon in ::iconUnwrap(column, row, \'div\')" class="data-table-cell-icon {{ ::icon.class }}" alt="{{ ::icon.alt }}" tooltip="{{ ::icon.tooltip.text }}" tooltip-append-to-body="true" tooltip-placement="{{ ::((icon.tooltip.placement) ? icon.tooltip.placement : \'top\') }}"></div> <span ng-if="buildContent(row, column)" class="data-cell-content" ng-bind-html="buildContent(row, column)"></span> <a ng-if="!buildContent(row, column) && buildLink(row, column) && hasValue(row, column)" href="{{ buildLink(row, column) }}" class="data-cell-content" target="{{ ::((column.linkTarget) ? column.linkTarget : \'_blank\') }}">{{ row | ColumnValue:column }}</a> <span ng-if="!buildContent(row, column) && !buildLink(row, column) && hasValue(row, column)" class="data-cell-content"> <span ng-if="!allowEditing(column,row) && column.dataField !=\'score\'">{{ row | ColumnValue:column:false }}</span> <span ng-if="!allowEditing(column,row) && column.dataField===\'score\'" popover-html="scoreTooltipTemplate(row)" popover-title="Prioritization Score" popover-placement="right" popover-trigger="mouseenter">{{ row | ColumnValue:column }}</span> <span ng-if="allowEditing(column,row)" class="data-editable"> <span ng-switch="getEditType(column, row)"> <span ng-switch-when="select" class="data-editable-field" editable-select="row[column.dataField]" e-ng-options="o.value as o.text for o in ::getEditableOptions(column, row)" buttons="no" onbeforesave="updateField(column, row, $data, this)">{{ row | ColumnValue:column }}</span> <span ng-switch-when="typeahead" class="data-editable-field" editable-text="row[column.dataField]" e-typeahead="o.value as o.text for o in ::getEditableOptions(column, row, $viewValue) | filter:$viewValue" e-typeahead-on-select="updateField(column, row, $data, this)" buttons="no" onshow="getEditableOptions(column, row)">{{ row | ColumnValue:column }}</span> <span ng-switch-default class="data-editable-field" editable-text="row[column.dataField]" onbeforesave="updateField(column, row, $data, this)">{{ row | ColumnValue:column }}</span> <button class="data-table-field-nullable btn-link" ng-if="column.editable.nullable" ng-click="nullField(column, row, this)" title="Remove {{ column.title }} Value"> <i class="fa fa-times fa-lg"></i> </button> </span> </span> </span> </div> </div> <div class="data-row-expander" ng-if="showRowDetails"> <button class="data-row-expansion" ng-show="canExpandRow(row)" ng-click="toggleRow(row[rowKey])" ng-class="{\'expanded\': currentRow==row[rowKey]}"> <div class="expander-icon"></div> &nbsp; </button> </div> </div> <div ng-if="!pagerObject.showAll" class="pagination-container" ng-show="pagerObject.total> 0"> <div class="cell"><rx-paginate page-tracking="pagerObject"></rx-paginate></div> </div> </div> ');
}]);
// Add ability to use html within popovers. Introduced in versions above angularui 0.13
angular.module('ui.bootstrap.popover')
    .directive('popoverHtmlUnsafePopup', function () {
        return {
            restrict: 'A',
            replace: true,
            scope: {
                title: '@',
                content: '@',
                placement: '@',
                animation: '&',
                isOpen: '&'
            },
            templateUrl: 'src/templates/htmlPopover.html'
        };
    })
    .directive('popoverHtmlUnsafe', ['$tooltip', function ($tooltip) {
        return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
    }]);