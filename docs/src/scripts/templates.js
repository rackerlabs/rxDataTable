angular.module('demo').run(['$templateCache', function ($templateCache) {
	$templateCache.put('docs/templates/basic.html', '<h1>{{title}}</h1> <div class="bs-example"> <rx-data-table row-key="colorName" column-configuration="dtConfig" list-of-data="dtData" column-display="dtColumnDisplay" column-presets="dtColumnPresets" predicate="dtDefaultSort"> </rx-data-table> </div> <div class="highlight"> <pre class="html">' +
'        &lt;!--This is your HTML Template for this Table--&gt;' +
'        &lt;rx-data-table' +
'            row-key="colorName"' +
'            column-configuration="dtConfig"' +
'            list-of-data="dtData"' +
'            column-display="dtColumnDisplay"' +
'            column-presets="dtColumnPresets"' +
'            predicate="dtDefaultSort">' +
'        &lt;/rx-data-table&gt;' +
'    </pre> </div> <h3>The Data on the Controller Should look like:</h3> <pre>' +
'$scope.dtConfig = <span ng-bind-html="dtConfig | JSONPrint:true"></span>;' +
'$scope.dtData = <span ng-bind-html="dtData | JSONPrint:true"></span>;' +
'$scope.dtColumnPresets = <span ng-bind-html="dtColumnPresets | JSONPrint:true"></span>;' +
'$scope.dtColumnDisplay = <span ng-bind-html="dtColumnDisplay | JSONPrint:true"></span>;' +
'$scope.dtDefaultSort = <span ng-bind-html="dtDefaultSort | JSONPrint:true"></span>;' +
'</pre> ');
	$templateCache.put('docs/templates/main.html', '<!DOCTYPE html> <html> <head> <meta charset="utf-8"> <title>doc</title> <style>pre code{background:#f8f8ff;color:#333;display:block;padding:.5em}pre .comment,pre .template_comment,pre .diff .header,pre .javadoc{color:#998;font-style:italic}pre .keyword,pre .css .rule .keyword,pre .winutils,pre .javascript .title,pre .nginx .title,pre .subst,pre .request,pre .status{color:#333;font-weight:bold}pre .number,pre .hexcolor,pre .ruby .constant{color:#099}pre .string,pre .tag .value,pre .phpdoc,pre .tex .formula{color:#d14}pre .title,pre .id{color:#900;font-weight:bold}pre .javascript .title,pre .lisp .title,pre .clojure .title,pre .subst{font-weight:normal}pre .class .title,pre .haskell .type,pre .vhdl .literal,pre .tex .command{color:#458;font-weight:bold}pre .tag,pre .tag .title,pre .rules .property,pre .django .tag .keyword{color:#000080;font-weight:normal}pre .attribute,pre .variable,pre .lisp .body{color:#008080}pre .regexp{color:#009926}pre .class{color:#458;font-weight:bold}pre .symbol,pre .ruby .symbol .string,pre .lisp .keyword,pre .tex .special,pre .prompt{color:#990073}pre .built_in,pre .lisp .title,pre .clojure .built_in{color:#0086b3}pre .preprocessor,pre .pi,pre .doctype,pre .shebang,pre .cdata{color:#999;font-weight:bold}pre .deletion{background:#fdd}pre .addition{background:#dfd}pre .diff .change{background:#0086b3}pre .chunk{color:#aaa}</style> </head> <body> <p><a href="https://travis-ci.org/rackerlabs/rxDataTable"><img src="https://api.travis-ci.org/rackerlabs/rxDataTable.png" alt="Build Status"></a> <a href="https://coveralls.io/r/rackerlabs/rxDataTable?branch=master"><img src="https://coveralls.io/repos/rackerlabs/rxDataTable/badge.png?branch=master" alt="Coverage Status"></a> <a href="https://david-dm.org/rackerlabs/rxDataTable.png"><img src="https://david-dm.org/rackerlabs/rxDataTable.png" alt="Dependency Status"></a></p> <h1 id="data-table-directive">Data Table Directive</h1> <h2 id="documentation-live-demo">Documentation &amp; Live Demo</h2> <p><strong><a href="http://rackerlabs.github.io/rxDataTable/">http://rackerlabs.github.io/rxDataTable/</a></strong></p> <h2 id="overview">Overview</h2> <p>The <code>rx-data-table</code> directive is designed to pretty much be a catch-all solution for displaying data in a table format in a basic or extremely complex style. It has some basic CSS styling included, but provides hooks for you to attach conditional styles to each row or column.</p> <h3 id="some-key-features">Some Key Features</h3> <ul> <li>Single or Multi-Column Sorting</li> <li>Column Display Presets</li> <li>Individual Data-Driven Cell Styling</li> <li>CSS FlexBox display for fluid space display</li> <li>Inline Field Editing<ul> <li>Text Editing</li> <li>Multi-Option Selects</li> <li>Typeahead auto-complete</li> </ul> </li> </ul> <h2 id="get-started">Get started</h2> <ol> <li>You must already have an angular project set up.</li> <li>Install via <a href="http://bower.io">bower</a>:<pre><code>bower install angular-rx-data-table</code></pre> </li> <li>Include angular-rx-data-table in your code<pre><code>&lt;link href=&quot;bower_components/angular-rx-data-table/dist/styles/rx-data-table.min.css&quot; rel=&quot;stylesheet&quot;&gt;' +
'&lt;script src=&quot;bower_components/angular-rx-data-table/dist/scripts/rx-data-table.min.js&quot;&gt;&lt;/script&gt;</code></pre> </li> <li>Add the module to your app&#39;s dependencies:<pre><code>var app = angular.module(&quot;app&quot;, [&quot;rxDataTable&quot;]);</code></pre> </li> <li>For further instructions on how to use the directive, view the full documentation <a href="http://rackerlabs.github.io/rxDataTable">here</a>.</li> </ol> <h2 id="modifying-rxdatatable">Modifying rxDataTable</h2> <p>To speed up development of rxDataTable changes, use <a href="https://bower.io/docs/api/#link">bower link</a> to see your changes on the encore UI.</p> <p>To get this working, you&#39;ll need to run bower link in rxDataTable and set up grunt to refresh on changes:</p> <pre><code>bower link' +
'grunt watch</code></pre> <p>After this, go to the encore UI project folder, and enter:</p> <pre><code>bower link tq-rx-data-table</code></pre> <p>After this, you should see your data table changes reflected on page refreshes.</p> <p>When you&#39;re done making your changes and wish to revert to the bower deployed version of rxDataTable, you can return to it by entering:</p> <pre><code>bower uninstall tq-rx-data-table</code></pre> <h2 id="dependencies">Dependencies</h2> <p>Obviously this requires you to have an <a href="http://angularjs.org/">angularjs</a> project to use this.</p> <p>This project uses the <a href="http://vitalets.github.io/angular-xeditable/" title="angular-xeditable homepage">angular-xeditable</a> for it&#39;s inline editing capabilities.</p> <h2 id="todo">TODO</h2> <p>...</p> <h2 id="license">License</h2> <p><a href="./LICENSE.md">MIT</a></p> </body> </html> ');
	$templateCache.put('docs/templates/simple.html', '<h1>{{title}}</h1> <div class="bs-example"> <rx-data-table column-configuration="dtConfig" list-of-data="dtData"></rx-data-table> </div> <div class="highlight"> <pre class="html">' +
'        &lt;!--This is your HTML Template for this Table--&gt;' +
'        &lt;rx-data-table' +
'           column-configuration="dtConfig"' +
'           list-of-data="dtData"' +
'        &lt;/rx-data-table&gt;' +
'    </pre> </div> <h3>The Data on the Controller Should look like:</h3> <pre class="json">' +
'$scope.dtConfig = <span ng-bind-html="dtConfig | JSONPrint:true"></span>;' +
'' +
'<span ng-bind-html="\'// This is generated via a function\' | CodeHighlight:js"></span>' +
'$scope.dtData = <span ng-bind-html="dtData | JSONPrint:true"></span>;' +
'</pre> ');
	$templateCache.put('docs/templates/typical.html', '<h1>{{title}}</h1> <div class="bs-example"> <rx-data-table row-key="ref_no" visibilty="true" column-configuration="dtConfig" list-of-data="dtData" column-display="dtColumnDisplay" column-presets="dtColumnPresets" predicate="dtDefaultSort" row-style="{class: \'item-color-mapping\', field: \'severity\', bool: false}" checkbox-event="checkEvent"> </rx-data-table> </div> <div class="highlight"> <pre class="html">' +
'        &lt;!--This is your HTML Template for this Table--&gt;' +
'        &lt;rx-data-table' +
'           row-key="ref_no"' +
'           visibilty="true"' +
'           column-configuration="dtConfig"' +
'           list-of-data="dtData"' +
'           column-display="dtColumnDisplay"' +
'           column-presets="dtColumnPresets"' +
'           predicate="dtDefaultSort"' +
'           row-style="{class: \'item-color-mapping\', field: \'severity\', bool: false}"' +
'           checkbox-event="checkEvent"&gt;' +
'        &lt;/rx-data-table&gt;' +
'    </pre> </div> <h3>The Data on the Controller Should look like:</h3> <pre>' +
'$scope.dtConfig = <span ng-bind-html="dtConfig | JSONPrint:true"></span>;' +
'$scope.dtData = <span ng-bind-html="dtData | JSONPrint:true"></span>;' +
'$scope.dtColumnPresets = <span ng-bind-html="dtColumnPresets | JSONPrint:true"></span>;' +
'$scope.dtColumnDisplay = <span ng-bind-html="dtColumnDisplay | JSONPrint:true"></span>;' +
'$scope.dtDefaultSort = <span ng-bind-html="dtDefaultSort | JSONPrint:true"></span>;' +
'</pre> ');
}]);