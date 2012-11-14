define(
  ['./platform', './util'],
  function (platform, util) {

    "use strict";

    var logger = util.getLogger('getputdelete');

    var defaultContentType = 'application/octet-stream';

    function doCall(method, url, body, mimeType, token, deadLine) {
      return util.makePromise(function(promise) {
        logger.debug(method, url);
        var platformObj = {
          url: url,
          method: method,
          timeout: deadLine || 5000,
          headers: {}
        };
        //   error: function(err) {
        //     if(err == 404) {
        //       promise.fulfill(undefined);
        //     } if(err == 401) {
        //       err = 'unauthorized';
        //     }
        //     throw err;
        //   },
        //   success: function(data, headers) {
        //     //logger.debug('doCall cb '+url, 'headers:', headers);
        //   },
        // };

        if(token) {
          platformObj.headers['Authorization'] = 'Bearer ' + token;
        }
        if(mimeType) {
          if(typeof(body) == 'object' && body instanceof ArrayBuffer) {
            mimeType += '; charset=binary';
          }
          platformObj.headers['Content-Type'] = mimeType;
        }

        platformObj.fields = {withCredentials: 'true'};
        if(method != 'GET') {
          platformObj.data = body;
        }
        //logger.debug('platform.ajax '+url);
        platform.ajax(platformObj).
          then(function(data, headers) {
            var contentType = headers['content-type'] || defaultContentType;
            var mimeType = contentType.split(';')[0]

            if(contentType.match(/charset=binary/)) {
              data = util.rawToBuffer(data);
            } else if(mimeType === 'application/json') {
              try {
                data = JSON.parse(data);
              } catch(exc) {
                // ignore invalid JSON
              }
            }

            promise.fulfill(data, mimeType);            
          }, function(error) {
            if(error === 404) {
              return promise.fulfill(undefined);
            } else if(error === 401) {
              error = 'unauthorized'
            };
            promise.fail(error);
          });
      });
    }

    function get(url, token) {
      return doCall('GET', url, null, null, token);
    }

    function put(url, value, mimeType, token, cb) {
      if(! (typeof(value) === 'string' || (typeof(value) === 'object' &&
                                           value instanceof ArrayBuffer))) {
        cb(new Error("invalid value given to PUT, only strings allowed, got "
                     + typeof(value)));
      }
        /// TODO:
// typeof(params.data) === 'object' &&
//               params.data instanceof ArrayBuffer
      doCall('PUT', url, value, mimeType, token, function(err, data) {
        //logger.debug('cb from PUT '+url);
        cb(err, data);
      });
    }

    function set(url, valueStr, mimeType, token, cb) {
      if(typeof(valueStr) == 'undefined') {
        doCall('DELETE', url, null, null, token, cb);
      } else {
        put(url, valueStr, mimeType, token, cb);
      }
    }

    // Namespace: getputdelete
    return {
      //
      // Method: get
      //
      // Send a GET request to a given path.
      //
      // Parameters:
      //   url      - url to send request to
      //   token    - bearer token used to authorize the request
      //   callback - callback called to signal success or failure
      //
      // Callback parameters:
      //   err      - error message(s). if no error occured, err is null.
      //   data     - raw response data
      //   mimeType - value of the response's Content-Type header. If none was returned, this defaults to application/octet-stream.
      get:    get,

      //
      // Method: set
      //
      // Send a PUT or DELETE request to given path.
      //
      // Parameters:
      //   url      - url to send request to
      //   data     - optional data to send. if data is undefined (not null!), a DELETE request is used.
      //   mimeType - MIME type to set for the data via the Content-Type header. Only relevant for PUT.
      //   token    - bearer token used to authorize the request
      //   callback - callback called to signal success or failure
      //
      // Callback parameters:
      //   err      - error message(s). if no error occured, err is null.
      //   data     - raw response data
      //   mimeType - value of the response's Content-Type header. If none was returned, this defaults to application/octet-stream.
      //
      set:    set
    };
});
