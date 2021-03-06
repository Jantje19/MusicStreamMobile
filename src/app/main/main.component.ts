import { BgsyncDialogComponent } from './bgsync-dialog/bgsync-dialog.component';
import { Component, ViewChild, ViewChildren, ElementRef } from '@angular/core';
import { Song, Playlist, SWIPE_ACTION } from '../data-types';
import { PlayerComponent } from './player/player.component';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatTab } from '@angular/material/tabs';
import { DataService } from '../data.service';

enum songMenuClickTypes {
	ADD_QUEUE = 'addToQueue',
	PLAY_NEXT = 'playNext',
	EDIT_TAGS = 'editTags',
	PLAY = 'play',
}
enum playlistMenuClickTypes {
	ADD_QUEUE = 'addToQueue',
	PLAY_NEXT = 'playNext',
	PLAY = 'play',
}

@Component({
	selector: 'app-main',
	templateUrl: './main.component.html',
	styleUrls: ['./main.component.css']
})
export class MainComponent {
	public title = 'MusicStream - BETA';

	@ViewChild(PlayerComponent) private _player: PlayerComponent;
	@ViewChild('searchInp') private searchInp: ElementRef;
	@ViewChildren(MatTab) private tabs;

	private selectedPlaylistMenuItem: Playlist;
	private _playlists: Playlist[] = [];
	private selectedSongMenuItem: Song;
	private _loadingState = true;
	private _songSortTypes = [];
	private _songs: Song[] = [];

	public songSort: string = null;
	selectedTabIndex = 0;
	isSearching = false;
	searchValue = "";

	get songs() {
		return this._songs;
	}
	get player() {
		return this._player;
	}
	get playlists() {
		return this._playlists;
	}
	get loadingState() {
		return this._loadingState;
	}
	get songSortTypes() {
		return this._songSortTypes;
	}
	get playlistMenuClickTypes() {
		return playlistMenuClickTypes;
	}
	get songMenuClickTypes() {
		return songMenuClickTypes;
	}

	constructor(
		private dataService: DataService,
		private snackBar: MatSnackBar,
		private dialog: MatDialog,
		private http: HttpClient,
	) {
		// @ts-ignore
		this.songSort = sortMethod;

		document.title = this.title;
		this.dataService.update(this.songSort, false);
		this.dataService.load.subscribe(() => {
			if (this.dataService.settings.audioDefaultSortType && navigator.onLine)
				this._songSortTypes = this.dataService.settings.audioDefaultSortType.options;
			else
				this._songSortTypes = [this.songSort];

			this._playlists = this.dataService.playlists;
			this._songs = this.dataService.songs;

			this._loadingState = false;
		});
		this.dataService.error.subscribe((err: Error) => {
			this._loadingState = false;
			this.snackBar.open('Unable to fetch the data...', null, {
				duration: 3000
			});
			console.error(err);
		});
	}

	swipeHandler(type: SWIPE_ACTION) {
		switch (type) {
			case SWIPE_ACTION.LEFT:
				if (this.selectedTabIndex < this.tabs.length)
					this.selectedTabIndex++;
				break;
			case SWIPE_ACTION.RIGHT:
				if (this.selectedTabIndex > 0)
					this.selectedTabIndex--;
				break;
		}
	}

	playlistClick(evt, playlist: Playlist) {
		if (evt.target.nodeName.toLowerCase() !== 'mat-icon')
			this.playPlaylist(playlist.name);
		else
			this.selectedPlaylistMenuItem = playlist;
	}

	addPlaylist() {
		this.snackBar.open('Not available (yet).', 'Open in desktop', {
			duration: 3000
		}).onAction().subscribe(() => {
			window.location.href = environment.apiUrl + '/createPlaylist.html';
		});
	}

	songClick(evt, song: Song) {
		if (evt.target.nodeName.toLowerCase() !== 'mat-icon')
			this.player.player.queue.enqueue(song);
		else
			this.selectedSongMenuItem = song;
	}

	songMenuClick(type: songMenuClickTypes) {
		if (this.selectedSongMenuItem) {
			switch (type) {
				case songMenuClickTypes.PLAY_NEXT:
					this.player.player.queue.addNext(this.selectedSongMenuItem);
					break;
				case songMenuClickTypes.ADD_QUEUE:
					this.player.player.queue.enqueue(this.selectedSongMenuItem);
					break;
				case songMenuClickTypes.PLAY:
					this.player.player.queue.enqueue(this.selectedSongMenuItem);
					this.player.player.queue.index = this.player.player.queue.length - 1;
					this.player.player.play();
					break;
				case songMenuClickTypes.EDIT_TAGS:
					// TODO: Make this work
					this.snackBar.open('Not available (yet).', null, {
						duration: 3000
					});
					break;
			}

			this.selectedSongMenuItem = null;
		}
	}

	playlistMenuClick(type: playlistMenuClickTypes) {
		if (this.selectedPlaylistMenuItem) {
			if (type === playlistMenuClickTypes.PLAY)
				this.playPlaylist(this.selectedPlaylistMenuItem.name);
			else {
				this.getPlaylist(this.selectedPlaylistMenuItem.name)
					.then(songs => {
						if (type === playlistMenuClickTypes.PLAY_NEXT)
							this.player.player.queue.addNext(songs);
						else if (type === playlistMenuClickTypes.ADD_QUEUE)
							this.player.player.queue.enqueue(songs);
					})
					.catch(err => {
						console.error(err);
						this.snackBar.open("Unable to get playlist information", null, {
							duration: 3000
						});
					}).finally(() => {
						this.selectedPlaylistMenuItem = null;
					});
			}
		}
	}

	updateLibrary() {
		const handleError = () => {
			this.snackBar.open("Unable to update the library", null, {
				duration: 3000
			});
		}

		this.http.post(environment.apiUrl + '/updateJSON/', null)
			.subscribe((data: any) => {
				if (data.success !== true)
					handleError();
				else {
					this.snackBar.open("Successfully updated the library", "Update list", {
						duration: 3000
					}).onAction().subscribe(() => {
						this._loadingState = true;
						this.dataService.update(this.songSort);
					});
				}
			}, handleError);
	}

	formatSortTypeString(str: String) {
		return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
	}

	sortChange() {
		this._loadingState = true;
		this.dataService.update(this.songSort, true, true);
	}

	useDesktop() {
		document.cookie = 'use-desktop=true;path=/';
		window.location.href = '/';
	}

	allSongs2Queue() {
		this.player.emptyQueue();
		this.player.player.queue.enqueue(this.songs);
	}

	setSearching(value: boolean) {
		this.isSearching = value;

		if (!value)
			this.searchValue = "";
		else {
			setTimeout(() => {
				if (this.searchInp)
					this.searchInp.nativeElement.focus();
			}, 100);
		}
	}

	viewBgSyncLog() {
		this.dialog.open(BgsyncDialogComponent, {
			data: this.player.bgSyncLogger,
			width: '350px',
		});
	}

	private getPlaylist(name: string): Promise<Song[]> {
		return new Promise((resolve, reject) => {
			this.http.get(environment.apiUrl + '/playlist/' + name)
				.subscribe(data => {
					resolve(this.songs.filter(song => {
						return (<any>data).songs.includes(song.name);
					}));
				}, reject);
		});
	}

	private playPlaylist(name: string) {
		this.getPlaylist(name)
			.then(songs => {
				this.player.player.queue.setQueue(songs);
				this.player.player.play();
			})
			.catch(() => {
				this.snackBar.open("Unable to get playlist information", null, {
					duration: 3000
				});
			});
	}
}