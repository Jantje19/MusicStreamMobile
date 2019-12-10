import { Injectable, EventEmitter, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Song, Playlist, Video } from './data-types';
import { HttpClient } from '@angular/common/http';
import SWHandler from './sw-handler';

@Injectable({
	providedIn: 'root'
})
export class DataService {
	private swHandler: SWHandler;
	private _playlists: Playlist[] = [];
	private _subtitles: string[] = [];
	private _videos: Video[] = [];
	private _songs: Song[] = [];
	private _settings: any = {};

	get songs() {
		return this._songs;
	}
	get videos() {
		return this._videos;
	}
	get playlists() {
		return this._playlists;
	}
	get settings() {
		return this._settings;
	}
	get subtitles() {
		return this._subtitles;
	}

	@Output() error = new EventEmitter<Error>();
	@Output() load = new EventEmitter<void>();

	constructor(private http: HttpClient) {
		this.swHandler = new SWHandler();
	}

	update(sortMethod: string, onlyData = true, force = false) {
		this.swHandler.getDownloaded().then(downloaded => {
			const addDataFetch = () => {
				const promiseArr = [];

				promiseArr.push(new Promise((resolve, reject) => {
					this.http
						.get(environment.apiUrl + '/data/?sort=' + sortMethod)
						.subscribe(resolve, reject);
				}));

				if (!onlyData) {
					promiseArr.push(new Promise((resolve, reject) => {
						this.http
							.get('/getSettings/')
							.subscribe((resp: any) => {
								if (!resp.success)
									reject('Unable to fetch settings');
								else {
									this._settings = resp.data;
									resolve();
								}
							}, reject);
					}));
				}

				return promiseArr;
			}

			if (navigator.onLine && force === true || !(
				Object.keys(this.settings).length > 0 ||
				this.subtitles.length > 0 ||
				this.videos.length > 0 ||
				this.songs.length > 0
			)) {
				Promise.all(addDataFetch())
					.then(([dataObj]) => {
						const { audio, video } = <any>dataObj;
						const { videos, subtitles } = video;
						const { songs, playlists } = audio;

						this._subtitles = subtitles;
						this._playlists = playlists.map(val => new Playlist(val));
						this._songs = songs.map(val => {
							return new Song(val, downloaded.songs.includes(val));
						});

						// TODO: Fix this
						// Temporarily put them all in one array
						Object.keys(videos).forEach(folder => {
							this._videos.push(...videos[folder].map(vid => new Video(vid)));
						});

						this.load.emit();
					})
					.catch(() => {
						this._playlists = downloaded.playlists.map(val => new Playlist(val));
						this._songs = downloaded.songs.map(str => new Song(str, true));
						this.load.emit();
					});
			}
		}).catch(this.error.emit.bind(this));
	}
}
