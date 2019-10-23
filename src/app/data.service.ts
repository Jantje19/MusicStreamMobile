import { Injectable, EventEmitter, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Song, Playlist } from './data-types';
import { MainComponent } from './main/main.component';

@Injectable({
	providedIn: 'root'
})
export class DataService {
	private _playlists: Playlist[];
	private _settings: {} = null;
	private _songs: Song[];

	get songs() {
		return this._songs;
	}
	get playlists() {
		return this._playlists;
	}
	get settings() {
		return this._settings;
	}

	@Output() load = new EventEmitter<{ songs: Song[], playlists: Playlist[], settings: {} }>();
	@Output() error = new EventEmitter<Error>();

	constructor(private http: HttpClient) { }

	update(sortMethod: string, onlyData = true) {
		const promiseArr = [
			new Promise((resolve, reject) => {
				this.http
					.get(environment.apiUrl + '/data/?sort=' + sortMethod)
					.subscribe(({ audio }: any) => {
						const { songs, playlists } = audio;

						this._playlists = playlists.map(val => new Playlist(val));
						this._songs = songs.map(val => new Song(val));

						resolve();
					}, reject);
			})
		];

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

		Promise.all(promiseArr).then(() => {
			this.load.emit({
				playlists: this._playlists,
				settings: this._settings,
				songs: this._songs,
			});
		}).catch(this.error.emit.bind(this));
	}
}
