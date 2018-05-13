/*******************************************************************************

    uBlock Origin - a browser extension to block requests.
    Copyright (C) 2014-2016 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

/* global uDom, uBlockDashboard */

/******************************************************************************/

(function() {

'use strict';

/******************************************************************************/

var messaging = vAPI.messaging,
    cachedClickIgnoreList = '';

/******************************************************************************/

var getTextareaNode = function() {
    var me = getTextareaNode,
        node = me.theNode;
    if ( node === undefined ) {
        node = me.theNode = uDom.nodeFromSelector('#clickIgnoreList textarea');
    }
    return node;
};

var setErrorNodeHorizontalOffset = function(px) {
    var me = setErrorNodeHorizontalOffset,
        offset = me.theOffset || 0;
    if ( px === offset ) { return; }
    var node = me.theNode;
    if ( node === undefined ) {
        node = me.theNode = uDom.nodeFromSelector('#clickIgnoreList textarea + div');
    }
    node.style.right = px + 'px';
    me.theOffset = px;
};

/******************************************************************************/

var clickIgnoreListChanged = (function() {
    var changedClickIgnoreList, changed, timer;

    var updateUI = function(good) {
        uDom.nodeFromId('clickIgnoreListApply').disabled = changed || !good;
        uDom.nodeFromId('clickIgnoreListRevert').disabled = changed;
        uDom.nodeFromId('clickIgnoreList').classList.toggle('invalid', !good);
    };

    var validate = function() {
        timer = undefined;
        messaging.send(
            'dashboard',
            { what: 'validateClickIgnoreListString', raw: changedClickIgnoreList },
            updateUI
        );
    };

    return function() {
        changedClickIgnoreList = getTextareaNode().value.trim();
        changed = changedClickIgnoreList === cachedClickIgnoreList;
        if ( timer !== undefined ) { clearTimeout(timer); }
        timer = vAPI.setTimeout(validate, 251);
        var textarea = getTextareaNode();
        setErrorNodeHorizontalOffset(textarea.offsetWidth - textarea.clientWidth);
    };
})();

/******************************************************************************/

var renderClickIgnoreList = function() {
    var onRead = function(response) {

        //uDom.nodeFromId('clickIgnoreList').value = cachedClickIgnoreList + '\n';
        cachedClickIgnoreList = response.clickIgnoreList.trim();
        getTextareaNode().value = cachedClickIgnoreList + '\n';
        uDom.nodeFromId('effListInput').checked = response.dntEnabled;
        clickIgnoreListChanged();
    };
    messaging.send('dashboard', { what: 'getClickIgnoreList' }, onRead);
};

/******************************************************************************/

var handleImportFilePicker = function() {
    var fileReaderOnLoadHandler = function() {
        var textarea = getTextareaNode();
        textarea.value = [textarea.value.trim(), this.result.trim()].join('\n').trim();
        clickIgnoreListChanged();
    };
    var file = this.files[0];
    if ( file === undefined || file.name === '' ) {
        return;
    }
    if ( file.type.indexOf('text') !== 0 ) {
        return;
    }
    var fr = new FileReader();
    fr.onload = fileReaderOnLoadHandler;
    fr.readAsText(file);
};

/******************************************************************************/

var startImportFilePicker = function() {
    var input = document.getElementById('importFilePicker');
    // Reset to empty string, this will ensure an change event is properly
    // triggered if the user pick a file, even if it is the same as the last
    // one picked.
    input.value = '';
    input.click();
};

/******************************************************************************/

var exportClickIgnoreListToFile = function() {
    var val = getTextareaNode().value.trim();
    if ( val === '' ) { return; }
    var filename = vAPI.i18n('clickIgnoreListExportFilename')
        .replace('{{datetime}}', uBlockDashboard.dateNowToSensibleString())
        .replace(/ +/g, '_');
    vAPI.download({
        'url': 'data:text/plain;charset=utf-8,' + encodeURIComponent(val + '\n'),
        'filename': filename
    });
};

/******************************************************************************/

var applyChanges = function() {
    cachedClickIgnoreList = getTextareaNode().value.trim();
    var request = {
        what: 'setClickIgnoreList',
        clickIgnoreList: cachedClickIgnoreList
    };
    messaging.send('dashboard', request, renderClickIgnoreList);
};

var revertChanges = function() {
    getTextareaNode().value = cachedClickIgnoreList + '\n';
    clickIgnoreListChanged();
};

/******************************************************************************/

var getCloudData = function() {
    return getTextareaNode().value;
};

var setCloudData = function(data, append) {
    if ( typeof data !== 'string' ) {
        return;
    }
    var textarea = getTextareaNode();
    if ( append ) {
        data = uBlockDashboard.mergeNewLines(textarea.value.trim(), data);
    }
    textarea.value = data.trim() + '\n';
    clickIgnoreListChanged();
};

self.cloud.onPush = getCloudData;
self.cloud.onPull = setCloudData;

/******************************************************************************/

uDom('#importClickIgnoreListFromFile').on('click', startImportFilePicker);
uDom('#importFilePicker').on('change', handleImportFilePicker);
uDom('#exportClickIgnoreListToFile').on('click', exportClickIgnoreListToFile);
uDom('#clickIgnoreList textarea').on('input', clickIgnoreListChanged);
uDom('#clickIgnoreListApply').on('click', applyChanges);
uDom('#clickIgnoreListRevert').on('click', revertChanges);

renderClickIgnoreList();

/******************************************************************************/

})();
