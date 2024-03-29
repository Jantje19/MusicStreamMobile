import {environment} from 'src/environments/environment';
import {Output, EventEmitter, Directive} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DataService} from './data.service';

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
	private _downloaded = false;

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
	get downloaded(): boolean {
		return this._downloaded;
	}

	constructor(
		name: string,
		downloaded: boolean,
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

		this._downloaded = downloaded;
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
					.subscribe((json: any) => {
						if (!json.success)
							reject(json.error);
						else {
							const {tags} = json;
							this.tags.artist = tags.artist;
							this.tags.album = tags.album;
							this.tags.title = tags.title;
							this.tags.image = tags.image;

							if (this.tags.title)
								this._tagsFetched = true;

							resolve(tags);
						}
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

@Directive()
class Player {
	public repeatState: repeatMode = repeatMode.UNSET;
	public queue: Queue;

	get playing(): boolean {
		return !this.mediaElem.paused;
	}

	@Output() timeUpdate = new EventEmitter<{percentage: number, currentTime: number, duration: number}>();
	@Output() songUpdate = new EventEmitter<void>();

	constructor(
		private mediaElem: HTMLAudioElement | HTMLVideoElement,
		private bgSyncLogger: BackgroundsyncLogger = null,
		private http: HttpClient,
		dataService: DataService,
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

		this.mediaElem.onplaying = () => {this.update.bind(this)(true)};
		this.mediaElem.onpause = () => {this.update.bind(this)(true)};
		this.mediaElem.onended = () => {
			if (
				dataService.settings.collectMostListened.val === true &&
				this.mediaElem instanceof HTMLAudioElement
			) {
				const selectedSong = <Song>this.queue.selected;
				const tryBgSync = async () => {
					if (!('SyncManager' in window))
						throw Error('SyncManager is not in window');

					const id = BackgroundsyncLog.newId();
					// @ts-ignore
					await (await navigator.serviceWorker.ready).sync.register(`updatemostlistened-${id}-${selectedSong.name}`);
					return id;
				}

				tryBgSync().then(id => {
					this.bgSyncLogger.add(new BackgroundsyncLog(true, selectedSong, id));
				}).catch(bgSyncError => {
					const id = BackgroundsyncLog.newId();
					const handleError = err => {
						this.bgSyncLogger.add(new BackgroundsyncLog(false, selectedSong, id, bgSyncError, new Error(JSON.stringify(err))));
					}

					this.http
						.post(environment.apiUrl + '/updateMostListenedPlaylist', selectedSong.name)
						.subscribe((data: {success: boolean, data: any, error: any}) => {
							if (data.success) {
								this.bgSyncLogger.add(new BackgroundsyncLog(false, selectedSong, id, bgSyncError));
								console.log(data.data);
							} else
								handleError(data.error);
						}, handleError);
				});
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
			this.update(true);
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

	setPlaybackRate(value: number) {
		this.mediaElem.playbackRate = value;
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

	private update(doNotUpdateMediaSessionMetadata = false) {
		// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
		navigator.mediaSession.playbackState = this.playing ? "playing" : "paused";

		if (this.mediaElem) {
			if (this.mediaElem instanceof HTMLAudioElement) {
				const selected = <Song>this.queue.selected;

				if (!(doNotUpdateMediaSessionMetadata === true)) {
					// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
					navigator.mediaSession.metadata = new MediaMetadata({
						title: selected.tags.title || selected.info,
						artist: selected.tags.artist || "MusicStream",
						album: selected.tags.album || "",
						artwork: [
							{src: environment.apiUrl + '/Assets/Icons/favicon-16x16.png', sizes: '16x16', type: 'image/png'},
							{src: environment.apiUrl + '/Assets/Icons/favicon-32x32.png', sizes: '32x32', type: 'image/png'},
							{src: environment.apiUrl + '/Assets/Icons/favicon-96x96.png', sizes: '96x96', type: 'image/png'},
							{src: environment.apiUrl + '/Assets/Icons/icon-128.png', sizes: '128x128', type: 'image/png'},
							{src: environment.apiUrl + '/Assets/Icons/icon-256.png', sizes: '256x256', type: 'image/png'},
							{src: environment.apiUrl + '/Assets/Icons/icon-512.png', sizes: '512x512', type: 'image/png'},
						]
					});

					this.songUpdate.emit();
				}
			} else if (this.mediaElem instanceof HTMLVideoElement) {
				const selected = <Video>this.queue.selected;

				// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
				navigator.mediaSession.metadata = new MediaMetadata({
					title: selected.name,
					artist: "MusicStream",
					album: "",
					artwork: [
						{src: environment.apiUrl + '/Assets/Icons/favicon-16x16.png', sizes: '16x16', type: 'image/png'},
						{src: environment.apiUrl + '/Assets/Icons/favicon-32x32.png', sizes: '32x32', type: 'image/png'},
						{src: environment.apiUrl + '/Assets/Icons/favicon-96x96.png', sizes: '96x96', type: 'image/png'},
						{src: environment.apiUrl + '/Assets/Icons/icon-128.png', sizes: '128x128', type: 'image/png'},
						{src: environment.apiUrl + '/Assets/Icons/icon-256.png', sizes: '256x256', type: 'image/png'},
						{src: environment.apiUrl + '/Assets/Icons/icon-512.png', sizes: '512x512', type: 'image/png'},
					]
				});
			}
		}
	}
}

@Directive()
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

		if (this.selected && this.selected instanceof Song)
			document.title = this.selected.info + " - MusicStream";
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

class BackgroundsyncLog {
	private static alphabet = 'abcdefghijklmnopqrstuvwxyz';
	private _bgSyncSuccess: boolean = null;
	private _id: string;

	public get id() {
		return this._id;
	}

	public set backgroundSyncSuccess(val: boolean) {
		this._bgSyncSuccess = val;
	}

	constructor(
		private usedBgSync: boolean = false,
		private song: Song,
		id: string,
		private bgSyncError: Error = null,
		private error: Error = null,
		private _timeStamp: Date = new Date()
	) {
		this._id = id;
	}

	public toString(): string {
		const dateStr = this._timeStamp ? this._timeStamp.toLocaleString() : 'Previously registered';

		if (this.error)
			return `(${dateStr}):\t[Error] ${this.song.name} (${this.error})`;
		else if (this.usedBgSync && this._bgSyncSuccess !== null)
			return `(${dateStr}):\t[Background Sync (success: ${this._bgSyncSuccess})] ${this.song.name}`;
		else if (this.usedBgSync)
			return `(${dateStr}):\t[Background Sync] ${this.song.name}`;
		else
			return `(${dateStr}):\t[Fallback method: (${this.bgSyncError})] ${this.song.name}`;
	}

	public static newId(length: number = 10): string {
		const alphabet = this.alphabet + this.alphabet.toUpperCase();
		let returnStr = '';

		for (let i = 0; i < length; i++)
			returnStr += alphabet[Math.floor(Math.random() * alphabet.length)];

		return returnStr;
	}
}

class BackgroundsyncLogger {
	private _log: BackgroundsyncLog[] = [];

	get log() {
		return {
			currentlyRegistered: this._log,
			previouslyRegistered: (async function () {
				// @ts-ignore
				return (await (await navigator.serviceWorker.ready).sync.getTags())
					.map(str => {
						return new BackgroundsyncLog(
							true,
							new Song(str.replace('updatemostlistened-', ''), false),
							BackgroundsyncLog.newId(),
							null, null, null
						);
					});
			})(),
		}
	}

	constructor() {
		(new BroadcastChannel('bgsync-update')).addEventListener('message', async (event: any) => {
			this.findById(event.data.id).backgroundSyncSuccess = event.data.success;
		});
	}

	public add(log: BackgroundsyncLog): BackgroundsyncLog | boolean {
		if (this.findById(log.id))
			return false;

		this._log.push(log);
		return log;
	}

	public findById(id: string): BackgroundsyncLog {
		return this._log.filter(val => val.id === id)[0];
	}
}

export {Song, Video, MediaType, Playlist, Player, Queue, BackgroundsyncLog, BackgroundsyncLogger, repeatMode, SWIPE_ACTION};