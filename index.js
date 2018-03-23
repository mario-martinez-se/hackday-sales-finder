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
app.use(express.static('static'))
app.engine('handlebars', exphbs({defaultLayout: 'main', partialsDir: 'views/partials'}));
app.set('view engine', 'handlebars');

app.get('/', (request, response) =>{
	response.render('home');
});
app.get('/sales', (request, response) => {
  const query = request.query.query;
  if (query !== undefined) {
    console.log(`Searching ${query} in SE API`);
    rp(getSEPostRequestForQuery(query))
    .then(data => console.log(`Found ${data.match.length} sales for ${query}`) && response.send(data));
  } else {
    response.send("Error: Query was empty");
  }
});
app.get('/find', (request, response) => {
  console.log(`Analysing url: ${request.query.url_analyse}`);
	rp(request.query.url_analyse)
	.then(data => rp (getGCPNLRequestForQuery(data))
	)
	.then(results => rp(`https://maps.googleapis.com/maps/api/place/textsearch/json?key=${process.env.GOOGLE_PLACES_API_KEY}&query=${getMostProminentPlace(results)}`))
	.then(data => rp(`https://maps.googleapis.com/maps/api/place/details/json?key=${process.env.GOOGLE_PLACES_API_KEY}&placeid=${(JSON.parse(data).results[0]).place_id}&language=en`))
	.then(data => {
		const address_components = JSON.parse(data).result.address_components;
    console.log(`Address components found: ${JSON.stringify(address_components)}`);
		const country = (address_components.find(address_component => _.any(address_component.types, type => type == 'country')) || {long_name: undefined}).long_name;
		const city = _.max(address_components.filter(address_component => _.any(address_component.types, type => /^administrative_area_level_(\d)/g.exec(type) != null)).map(address_component => ({long_name: address_component.long_name, type: address_component.types.find(type => /^administrative_area_level_(\d)/g.exec(type) != null)})), address_component => /^administrative_area_level_(\d)/g.exec(address_component.type)[1]).long_name || undefined;

    response.render('find_results', {city: city, country: country})
	})
	.catch(err => {
	console.error('ERROR:', err);
	response.render('find_results', {});
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
  const result = results.entities.filter(entity => entity.type == "LOCATION" && _.any(entity.mentions.map(mention => mention.type), type => type == 'PROPER')).slice(0, 1).map(entity => entity.name)[0];
  console.log(`Place found: ${result}`);
	return result;
}
