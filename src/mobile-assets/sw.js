if ('serviceWorker' in navigator) {
	if (window.location.port === '4200') {
		import { Workbox } from 'http://localhost:8000/ServiceWorker/workbox/workbox-window.prod.mjs';
		var wb = new Workbox('http://localhost:8000/service-worker.js', { scope: '/' });
	} else {
		import { Workbox } from '/ServiceWorker/workbox/workbox-window.prod.mjs';
		var wb = new Workbox('/service-worker.js', { scope: '/mobile/' });
	}

	wb.register().catch(console.error);
	// TODO: Add this
	/* wb.addEventListener('waiting', () => {

	});*/
}