import { Injectable, EventEmitter, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Song, Playlist, Video } from './data-types';
import { HttpClient } from '@angular/common/http';

@Injectable({
	providedIn: 'root'
})
export class DataService {
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

	constructor(private http: HttpClient) { }

	update(sortMethod: string, onlyData = true, force = false) {
		const promiseArr = [];
		const addDataFetch = () => {
			promiseArr.push(new Promise((resolve, reject) => {
				this.http
					.get(environment.apiUrl + '/data/?sort=' + sortMethod)
					.subscribe(({ audio, video }: any) => {
						const { videos, subtitles } = video;
						const { songs, playlists } = audio;

						this._playlists = playlists.map(val => new Playlist(val));
						this._songs = songs.map(val => new Song(val));
						this._subtitles = subtitles;

						// TODO: Fix this
						// Temporarily put them all in one array
						Object.keys(videos).forEach(folder => {
							this._videos.push(...videos[folder].map(vid => new Video(vid)));
						});

						resolve();
					}, reject);
			}));

			if (!onlyData) {
				promiseArr.push(new Promise((resolve, reject) => {
					this.http
						.get(environment.apiUrl + '/getSettings/')
						.subscribe((settings: any) => {
							this._settings = settings;
							resolve();
						}, reject);
				}));
			}
		}

		if (force === true || !(
			Object.keys(this.settings).length > 0 ||
			this.subtitles.length > 0 ||
			this.videos.length > 0 ||
			this.songs.length > 0
		))
			addDataFetch();

		Promise.all(promiseArr)
			.then(() => {
				this.load.emit();
			})
			.catch(this.error.emit.bind(this));
	}
}
