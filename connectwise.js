var request  = require('request');
var xml2js   = require('xml2js');
var json2xml = require('json2xml');
var extend   = require('xtend');

var Connectwise = (function () {
  function Connectwise(config) {
    this.credentials    = config.credentials;
    this.baseURL        = config.endpointURL;
    this.xmlDeclaration = '<?xml version="1.0" encoding="utf-16"?>';
    this.xmlNS          = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"';
  }

  Connectwise.prototype.generateActionXML = function(action, object) {
    var xml = [];
    xml.push(this.xmlDeclaration);
    xml.push('<',action,' ',this.xmlNS,'>');
    xml.push(json2xml.toXml("", object));
    xml.push('</',action,'>');
    return xml.join('');
  };

  Connectwise.prototype.executeRequest = function (actionXML, callback) {
    var _this = this;
    var requestOptions = {
      method : 'POST'
    , uri    : this.baseURL
    , form   : {
        actionString : actionXML
      }
    };

    request(requestOptions, function(error, response, body) {
      if (!error){
        _this.responseToObject(body, callback);
      } else {
        callback(error);
      }
    });
  };

  Connectwise.prototype.responseToObject = function (response, callback) {
    var parser = new xml2js.Parser();
    parser.parseString(response, function (err, result) {
      callback(result);
    });
  };

  //Actions

  Connectwise.prototype.genericAction = function(action, options, callback){
    var actionXML = this.generateActionXML(action, extend(options, this.credentials));
    this.executeRequest(actionXML, callback);
  }

  Connectwise.prototype.getRecordsGenericAction = function(action, options, recIDs, callback){
    var accumulatedRecords = [];
    var recordsRequested = 0;
    var recordsLoaded = 0;
    var windowSize = 4;
    var _this = this;

    function loadRecords() {
      while ((recordsRequested - recordsLoaded) < windowSize && recordsRequested < recIDs.length) {
        _this.genericAction(action, extend(options || {}, { 'Id' : recIDs[recordsRequested++] }), onRecordLoad);
      }
    }

    function onRecordLoad(record) {
      accumulatedRecords.push(record);
      if (++recordsLoaded === recIDs.length) {
        callback(accumulatedRecords);
      } else {
        loadRecords();
      }
    }

    loadRecords();
  }

  //Action-specific helpers
  Connectwise.prototype.configurationQuestionsFlatten = function(config) {
    var flattened = {};
    if (typeof(config) === 'object'){
      for (var qa in config) {
        if (config[qa]['Answer'][0].length > 0) {
          flattened[config[qa]['Question']] = config[qa]['Answer'][0];
        }
      };
    }
    return flattened;
  }
  
  return Connectwise;
})();

module.exports = Connectwise;