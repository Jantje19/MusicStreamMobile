import { environment } from 'src/environments/environment';
import { Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

enum repeatMode {
	QUEUE,
	UNSET,
	ONE,
}

enum SWIPE_ACTION {
	RIGHT = 'swiperight',
	LEFT = 'swipeleft',
	DOWN = 'swipedown',
	UP = 'swipeup'
}

class MediaType {

	get name() {
		return this._name;
	}

	constructor(protected _name: string) { }

	public toString(): string {
		return this._name;
	}
}

class Song extends MediaType {
	private _tagsFetched = false;

	get tags() {
		return this._tags;
	}
	get tagsFetched(): boolean {
		return this._tagsFetched;
	}
	get info(): string {
		if (this.tagsFetched && this.tags.title)
			return `${this.tags.title}${this.tags.artist ? ` • ${this.tags.artist}` : ''}`;

		return this.name.replace(/(\.\w+)$/, '');
	}

	get artistAlbumInfo(): string {
		return [this.tags.artist, this.tags.album].filter(val => val).join(' • ');
	}

	constructor(
		name: string,
		private _tags: {
			title: string,
			artist: string,
			album: string,
			image: any
		} = {
				title: "",
				artist: "",
				album: "",
				image: null
			}
	) {
		super(name);
	}

	public fetchTags(http: HttpClient): Promise<{
		title: string,
		artist: string,
		album: string
	}> {
		if (this.tagsFetched)
			return Promise.resolve(this.tags);
		else {
			return new Promise((resolve, reject) => {
				http
					.get(environment.apiUrl + '/songInfo/' + this.name)
					.subscribe((data: any) => {
						this.tags.artist = data.artist;
						this.tags.album = data.album;
						this.tags.title = data.title;
						this.tags.image = data.image;

						if (this.tags.title)
							this._tagsFetched = true;

						resolve(data);
					}, reject);
			});
		}
	}
}

class Video extends MediaType {
	constructor(name: string) {
		super(name);
	}
}

class Playlist {

	get name() {
		return this._name;
	}
	get list() {
		return this._list;
	}

	constructor(private _name, private _list: Song[] = []) { }

	public toString(): string {
		return this._name;
	}
}

class Player {
	public repeatState: repeatMode = repeatMode.UNSET;
	public queue: Queue;

	get playing(): boolean {
		return !this.mediaElem.paused;
	}

	@Output() timeUpdate = new EventEmitter<{ percentage: number, currentTime: number, duration: number }>();
	@Output() songUpdate = new EventEmitter<boolean>();

	constructor(
		private mediaElem: HTMLAudioElement | HTMLVideoElement,
		private http: HttpClient
	) {
		this.queue = new Queue();

		if (this.mediaElem instanceof HTMLAudioElement) {
			this.mediaElem.ontimeupdate = () => {
				this.timeUpdate.emit({
					percentage: this.mediaElem.currentTime / this.mediaElem.duration * 100,
					currentTime: this.mediaElem.currentTime,
					duration: this.mediaElem.duration
				});
			}
		}

		this.mediaElem.onplaying = this.update;
		this.mediaElem.onpause = this.update;
		this.mediaElem.onended = () => {
			if (this.mediaElem instanceof HTMLAudioElement) {
				this.http
					.post(environment.apiUrl + '/updateMostListenedPlaylist', this.queue.selected.name)
					.subscribe((data: { success: boolean, data: any, error: any }) => {
						if (data.success)
							console.log(data.data);
						else
							console.error(data.error);
					}, console.error);
			}

			if (this.repeatState === repeatMode.ONE)
				this.mediaElem.play();
			else if (this.queue.index < this.queue.length - 1) {
				this.queue.index++;
				this.play();
			} else if (this.repeatState === repeatMode.QUEUE) {
				this.queue.index = 0;
				this.play();
			}
		};

		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('play', this.play.bind(this));
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('pause', this.pause.bind(this));
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('seekbackward', () => this.skipXSeconds(-5));
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('seekforward', () => this.skipXSeconds(5));
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('nexttrack', this.next.bind(this));
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.setActionHandler('previoustrack', this.previous.bind(this));
	}

	stop(): Player {
		this.pause();
		this.mediaElem.currentTime = 0;
		this.mediaElem.src = "";
		return this;
	}

	pause(): Player {
		this.mediaElem.pause();
		return this;
	}

	play(): Player {
		if (unescape(this.mediaElem.src).includes(this.queue.selected.name)) {
			this.mediaElem.play();
			this.update();
		} else {
			this.mediaElem.src = environment.apiUrl +
				((this.mediaElem instanceof HTMLAudioElement) ? '/song/' : '/video/')
				+ this.queue.selected.name;

			const returnVal = this.mediaElem.play();
			const fetchTags = () => {
				(<Song>this.queue.selected)
					.fetchTags(this.http)
					.then(this.update.bind(this))
					.catch(console.error);
			}

			if (returnVal.then) {
				returnVal.then(() => {
					this.update();

					if (this.mediaElem instanceof HTMLAudioElement)
						fetchTags();
				}).catch(console.error);
			} else {
				this.update();

				if (this.mediaElem instanceof HTMLAudioElement)
					fetchTags();
			}
		}

		return this;
	}

	toggle(): Player {
		if (this.playing)
			return this.pause();
		else
			return this.play();
	}

	seek(percentage: number): Player {
		if (percentage >= 0 && percentage <= 100 && !Number.isNaN(this.mediaElem.duration))
			this.mediaElem.currentTime = this.mediaElem.duration / 100 * percentage;

		return this;
	}

	skipXSeconds(seconds: number = 5): Player {
		this.mediaElem.currentTime += seconds;
		return this;
	}

	next(): Player {
		if (this.repeatState === repeatMode.ONE)
			this.mediaElem.currentTime = 0;
		else if (this.queue.index < this.queue.length - 1)
			this.queue.next();
		else if (this.repeatState === repeatMode.QUEUE)
			this.queue.index = 0;

		this.play();
		return this;
	}

	previous(): Player {
		if (this.mediaElem.currentTime >= 5)
			this.mediaElem.currentTime = 0;
		else {
			if (this.repeatState === repeatMode.ONE)
				this.mediaElem.currentTime = 0;
			else if (this.queue.index > 0)
				this.queue.previous();
			else if (this.repeatState === repeatMode.QUEUE)
				this.queue.index = this.queue.length - 1;

			this.play();
		}

		return this;
	}

	removeFromQueue(song: Song | number): boolean {
		let index = <number>song;

		if (!Number.isInteger(<any>song))
			index = this.queue.list.indexOf(<Song>song);

		const isPlaying = index === this.queue.index;
		if (isPlaying)
			this.stop();

		this.queue.remove(index);
		return isPlaying;
	}

	static convertToReadableTime(int: number): string {
		if (Number.isNaN(int))
			return '0:00';

		let outp = "";

		const minutes = Math.floor(int / 60);
		const seconds = Math.floor(int % 60);

		outp += minutes + ':';

		if (seconds < 10)
			outp += '0';

		outp += seconds;

		return outp;
	}

	private update() {
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.playbackState = this.playing ? "playing" : "paused";

		if (this.mediaElem) {
			if (this.mediaElem instanceof HTMLAudioElement) {
				const selected = <Song>this.queue.selected;

				// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
				navigator.mediaSession.metadata = new MediaMetadata({
					title: selected.tags.title || selected.info,
					artist: selected.tags.artist || "MusicStream",
					album: selected.tags.album || "",
					artwork: [
						{ src: environment.apiUrl + '/Assets/Icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
						{ src: environment.apiUrl + '/Assets/Icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
						{ src: environment.apiUrl + '/Assets/Icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
						{ src: environment.apiUrl + '/Assets/Icons/icon-128.png', sizes: '128x128', type: 'image/png' },
						{ src: environment.apiUrl + '/Assets/Icons/icon-256.png', sizes: '256x256', type: 'image/png' },
						{ src: environment.apiUrl + '/Assets/Icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					]
				});

				this.songUpdate.emit(this.mediaElem.ended);
			}
		}
	}
}

class Queue {
	private _list: MediaType[] = [];
	private _index: number = 0;

	@Output() update = new EventEmitter();

	get index(): number {
		return this._index;
	}
	set index(index: number) {
		if (index > -1 && index < this.list.length) {
			this._index = index;
			this.update.emit();
		}

		document.title = (
			this.selected && this.selected instanceof Song ?
				' - ' + this.selected.info : ''
		) + "MusicStream";
	}

	get list(): MediaType[] {
		return this._list;
	}
	get length(): number {
		return this._list.length;
	}
	get selected(): MediaType {
		return this._list[this._index];
	}

	public enqueue(media: MediaType | MediaType[]) {
		if (Array.isArray(media))
			this._list.push(...media);
		else
			this._list.push(media);

		this.update.emit();
	}

	public setQueue(media: MediaType[]) {
		this._list = media;
		this.index = 0;

		this.update.emit();
	}

	public addNext(media: MediaType | MediaType[]) {
		if (Array.isArray(media))
			this._list.splice(this.index + 1, 0, ...media);
		else
			this._list.splice(this.index + 1, 0, media);
	}

	public next(): Queue {
		this.index++;

		if (this.index > this.list.length - 1)
			this.index = this.list.length - 1;

		this.update.emit();
		return this;
	}

	public previous(): Queue {
		this.index--;

		if (this.index < 0)
			this.index = 0;

		this.update.emit();
		return this;
	}

	public shuffle() {
		this._list = this.shuffleArray(this.list);
		this.index = 0;

		this.update.emit();
	}

	public remove(index: number) {
		this._list.splice(index, 1);
	}

	private shuffleArray(array: MediaType[]): MediaType[] {
		let currentIndex = array.length, temporaryValue, randomIndex;

		while (0 !== currentIndex) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}
}

export { Song, Video, Playlist, Player, Queue, repeatMode, SWIPE_ACTION };