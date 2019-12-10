const exportObj = {};
const paths = ['/service-worker-mobile.js', '/manifest.json', '/favicon.ico', '/ServiceWorker/*', '/getSettings/'];
const configObj = {
	"secure": false,
	target: 'http://localhost:8000',
	changeOrigin: true
}

paths.forEach(val => {
	exportObj[val] = configObj;
});

module.exports = exportObj;