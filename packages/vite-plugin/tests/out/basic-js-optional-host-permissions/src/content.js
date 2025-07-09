console.log('content script')

const requesting = browser.permissions.request({
    permissions: ['tabs'],
});
requesting.then(
    function (result) {
        if (result) {
            console.log('Permission granted. Opening a tab');
            browser.tabs.open({
                url: 'https://example.com',
                active: true,
            });
        } else {
            console.log('Permission denied');
        }
    },
    function () {
        console.error('Error requesting permissions');
    }
);