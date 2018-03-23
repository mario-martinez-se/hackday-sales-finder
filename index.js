const _ = require('underscore')._;
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const rp = require('request-promise');
const express = require('express');
const exphbs  = require('express-handlebars');
const bodyParser = require("body-parser");
require('dotenv').config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/', (request, response) =>{
	response.render('home');
});

app.post('/find', (request, response) => {
	rp(request.body.url_analyse)
	.then(data => rp (getGCPNLRequestForQuery(data))
	)
	.then(results => rp(`https://maps.googleapis.com/maps/api/place/textsearch/json?key=${process.env.GOOGLE_PLACES_API_KEY}&query=${getMostProminentPlace(results)}`))
	.then(data => rp(`https://maps.googleapis.com/maps/api/place/details/json?key=${process.env.GOOGLE_PLACES_API_KEY}&placeid=${JSON.parse(data).results[0].place_id}&language=en`))
	.then(data => {
		const address_components = JSON.parse(data).result.address_components;
		const country = (address_components.find(address_component => _.any(address_component.types, type => type == 'country')) || {long_name: undefined}).long_name;
		const city = _.max(address_components.filter(address_component => _.any(address_component.types, type => /^administrative_area_level_(\d)/g.exec(type) != null)).map(address_component => ({long_name: address_component.long_name, type: address_component.types.find(type => /^administrative_area_level_(\d)/g.exec(type) != null)})), address_component => /^administrative_area_level_(\d)/g.exec(address_component.type)[1]).long_name || undefined;

		var requests = [];
		if (country) {
			requests.push(rp(getSEPostRequestForQuery(city)));
		} else {
			requests.push(Promise.resolve(undefined));
		}

		if (city) {
			requests.push(rp(getSEPostRequestForQuery(country)));
		} else {
			requests.push(Promise.resolve(undefined));
		}

		return  Promise.all(_.union(requests, [Promise.resolve(city), Promise.resolve(country)]));
	})
	.then(data => {
		const salesForCity = (data[0] || {match: undefined}).match;
		const salesForCountry = (data[1] || {match: undefined}).match;
		const city = data[2];
		const country = data[3];
		response.render('find_results', {salesForCity: salesForCity || [], salesForCountry: salesForCountry || [], city: city, country: country})

	})
	.catch(err => {
	console.error('ERROR:', err);
	response.send(`Error happened: ${err}`);
	});
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})

function getGCPNLRequestForQuery(query) {
	return {
		method: 'POST',
		uri: `https://language.googleapis.com/v1beta2/documents:analyzeEntities?key=${process.env.GOOGLE_PLACES_API_KEY}`,
		body: {
			document: {content: query, type: 'HTML'}
		},
		headers: {
			'content-type': 'application/json',
		},
		json: true}
}

function getSEPostRequestForQuery(query) {
	return {
	    method: 'POST',
	    uri: 'https://www.secretescapes.com/v3/search/sales/flash',
	    body: {
		    query: `${query}`
		},
		headers: {
			'content-type': 'application/json',
			'se-api-token': `${process.env.SE_API_TOKEN}`

		},
	    json: true
	}
}

function getMostProminentPlace(results) {
	return results.entities.filter(entity => entity.type == "LOCATION" && _.any(entity.mentions.map(mention => mention.type), type => type == 'PROPER')).slice(0, 1).map(entity => entity.name)[0];
}
