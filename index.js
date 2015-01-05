// Loading required libs
var _        = require('underscore');
var isObject = require('is-object');
var url      = require('url');



/**
 * Initializes router
 *
 * @constructor
 * @this {YaeRouter}
 * @param {object} routes Route object
 * @param {object} controller Controller object
 */
function YaeRouter (routes, controller) {
	this.controller = controller;
	this.routes = routes;
}



/**
 *
 */
YaeRouter.prototype.Apply = function (expressApp) {
	for (var i=0; i<this.routes.length; i++) {
		var route = this.routes[i];

		var url = route.url;
		var method = 'method' in route
			? route.method.toLowerCase()
			: 'get';
		var controller = this.controller[route.action];

		expressApp[method](url, controller);
	}
}



/**
 * @TODO: Will use url lib to create urls instead
 */
YaeRouter.prototype.CreateUrl = function (routes, name, params) {
	// Get url structure from routing file
	var route = _.findWhere(this.routes, {name: name});
	var url = route.url;
	var defaults = route.defaults !== undefined
		? route.defaults
		: {};

	// To track first extra param with ? and others with &
	var getParamsUsed = false;

	for (paramName in params) {
		// Get parameter value
		var paramValue = params[paramName];

		//if (!paramName in defaults) {
		if (paramValue !== defaults[paramName]) {

			// If parameter exists in the route, put it in the route
			if (url.search(paramName) != -1) {
				url = url.replace(':'+paramName+'?', paramValue);
				url = url.replace(':'+paramName, paramValue);
			}
			// If not, add it to the end
			else {
				url += getParamsUsed
					? '&'
					: '?';
				url += paramName + '=' + paramValue;
				getParamsUsed = true;
			}
		}
	}

	// Removing all unused url parameters
	url = url.replace(/\/:[a-zA-Z]*[\?]?/g, '');

	return url;
}



/**
 *
 */
YaeRouter.prototype.UpdateUrlWithParam = function (routes, baseurl, param, value) {
	var parsedUrl = url.parse(baseurl,true);
	var query = parsedUrl.query;
	var pathname = parsedUrl.pathname;
	var routename = _.findWhere(routes, {url: pathname}).name;

	if ( undefined !== value ) {
		query[param] = value;
	}
	else {
		if (param in query) {
			delete query[param];
		}
	}

	return this.createUrl(routes, routename, query);
}



/**
 * Fetches and merges all params from request and defaults
 * Default is fetched from route object
 * Request param is overriden if exists
 * If values exist in route object, compares request param
 *   and if not valid, overrides with default value
 *
 * @param {object} request Express request object
 * @returns {object} Parameters object
 */
YaeRouter.prototype.FetchRequestAndDefaultParams = function (request) {
	var results = {};

	// Get all request query parameters
	for (queryParamName in request.query) {
		results[queryParamName] = request.query[queryParamName];
	}

	// Fetcing route object
	var routeObject = this.GetRouteObjectFromRequest(request);

	// Get default route params
	var defaultParameters = isObject(routeObject['params'])
		? routeObject['params']
		: {};

	// For each default param
	for (paramName in defaultParameters) {
		var param = defaultParameters[paramName];

		// If this does not exist in request params
		if ( ! isObject(defaultParameters[paramName]) ) {
			// Add to result params
			results[paramName] = param.default;
		}

		// If exists in the request params
		else {
			// If there are standard values
			if ( undefined !== param['values'] ) {
				// If request value does not exist in available values
				if ( ! _.contains(param['values'], results[paramName])) {
					// Change parameter value to route default
					results[paramName] = defaultParameters[paramName]['default'];
				}
			}
		}
	}
	return results;
}



/**
 * Finds a route from routes.
 *
 * @param {object} request Express request object
 * @returns {object} Parameters object
 */
YaeRouter.prototype.GetRouteObjectFromRequest = function (request) {
	// Get base pathname
	var pathname = request._parsedUrl.pathname;

	// Finds and returns route object
	return _.findWhere(this.routes, {url: pathname});
}


module.exports = YaeRouter;