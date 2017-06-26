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