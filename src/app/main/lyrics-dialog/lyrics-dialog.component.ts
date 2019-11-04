import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { Song } from 'src/app/data-types';

@Component({
	selector: 'app-lyrics-dialog',
	templateUrl: './lyrics-dialog.component.html',
	styleUrls: ['./lyrics-dialog.component.css']
})
export class LyricsDialogComponent {

	private _loading = true;
	private _lyrics = '';

	get lyrics() {
		return this._lyrics;
	}
	get loading() {
		return this._loading;
	}

	constructor(
		private dialogRef: MatDialogRef<LyricsDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public selectedSong: Song,
		http: HttpClient,
	) {
		http.get(environment.apiUrl + `/getLyrics/${selectedSong.tags.artist}/${selectedSong.tags.title}`)
			.subscribe((resp: any) => {
				if (resp.success)
					this._lyrics = resp.lyrics.trim();
				else
					this._lyrics = resp.error;

				this._loading = false;
			}, err => {
				this._lyrics = 'Unable to fetch lyrics';
				this._loading = false;
			});
	}

	close() {
		this.dialogRef.close();
	}
}
