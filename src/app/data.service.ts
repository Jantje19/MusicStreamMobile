import { Injectable, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Song, Playlist } from './data-types';

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

	set sortType(type: string) {
		if ((<any>this.settings).audioDefaultSortType.options.includes(type))
			(<any>this.settings).audioDefaultSortType.val = type;
	}

	@Output() load = new EventEmitter<{ songs: Song[], playlists: Playlist[], settings: {} }>();
	@Output() error = new EventEmitter<Error>();

	constructor(private http: HttpClient) {
		this.update();
	}

	update() {
		if (this._settings)
			this.getData((<any>this.settings).audioDefaultSortType.val);
		else {
			this.http
				.get('http://localhost:8000/getSettings/')
				.subscribe((settings: any) => {
					this._settings = settings;
					this.getData(settings.audioDefaultSortType.val);
				}, this.error.emit.bind(this));
		}
	}

	private getData(sortType: string) {
		this.http
			.get('http://localhost:8000/data/?sort=' + sortType)
			.subscribe(({ audio }: any) => {
				const { songs, playlists } = audio;

				this._playlists = playlists.map(val => new Playlist(val));
				this._songs = songs.map(val => new Song(val));

				this.load.emit({
					playlists: this._playlists,
					settings: this._settings,
					songs: this._songs,
				});
			}, this.error.emit.bind(this));
	}
}
