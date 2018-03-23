# hackday-sales-finder
This project uses several Google API in order to analyse a given html page and extract from it a city and a country using a Natural Language engine. Then, it makes two searches in Secret Escapes API in these locations and shows the results.

# How to run it locally
This project runs on Node.js + Express, so you will need to have installed node.js and npm.

1. Clone the repo in your local machine.
2. Navigate to the project folder.
3. Run `npm install`.
4. Run `node index.js`

# Glitch
You can also remix the following glitch project [https://bronze-canoe.glitch.me](https://bronze-canoe.glitch.me)

# Bookmarklet
You can also create a [bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) that will send the current url to the app. For that, you just need to create a new bookmark and paste the following in the location field:
`javascript:(function(){window.location.assign("https://bronze-canoe.glitch.me/find?url_analyse="+document.URL);})();`

