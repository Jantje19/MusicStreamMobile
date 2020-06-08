import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { SubtitleDialogComponent } from './subtitle-dialog/subtitle-dialog.component';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Video, Player, Queue } from '../data-types';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../data.service';

enum videoMenuClickTypes {
	REMOVE_QUEUE = 'removeFromQueue',
	ADD_QUEUE = 'addToQueue',
	PLAY_NEXT = 'playNext',
	PLAY = 'addToQueue',
}

@Component({
	selector: 'app-video',
	templateUrl: './video.component.html',
	styleUrls: ['./video.component.css']
})
export class VideoComponent implements AfterViewInit {
	public title = "MusicStream - BETA - Videos";

	@ViewChild('video') videoElem: ElementRef;

	private selectedQueueMenuItem: number = null;
	private selectedVideoMenuItem: Video = null;
	private tmpQueue = new Queue();
	private loadingState = true;
	private _subtitles: string[] = [];
	private _videos: Video[] = [];
	private _player: Player;

	playbackRate: string = "1";

	get player() {
		return this._player;
	}
	get videos() {
		return this._videos;
	}
	get subtitles() {
		return this._subtitles;
	}
	get pictureInPictureEnabled() {
		// @ts-ignore
		return document.pictureInPictureEnabled;
	}
	get videoMenuClickTypes() {
		return videoMenuClickTypes;
	}

	constructor(
		private dataService: DataService,
		private cd: ChangeDetectorRef,
		private snackBar: MatSnackBar,
		private dialog: MatDialog,
		private http: HttpClient,
	) {
		// @ts-ignore
		const songSort = sortMethod;

		document.title = this.title;
		this.dataService.update(songSort, false);
		this.dataService.load.subscribe(() => {
			this._subtitles = this.dataService.subtitles;
			this._videos = this.dataService.videos;

			this.loadingState = false;
		});
		this.dataService.error.subscribe((err: Error) => {
			this.loadingState = false;
			this.snackBar.open('Unable to fetch the data...', null, {
				duration: 3000
			});
			console.error(err);
		});
	}

	ngAfterViewInit() {
		this._player = new Player(this.videoElem.nativeElement, null, this.http, this.dataService);
		this.player.queue.update.subscribe(() => {
			this.cd.detectChanges();
		});
		this.cd.detectChanges();
	}

	isLoading() {
		return this.loadingState === true && this.player !== undefined;
	}

	getQueue() {
		if (this.player)
			return this.player.queue;

		return this.tmpQueue;
	}

	videoClick(evt, video: Video) {
		if (evt.target.nodeName.toLowerCase() !== 'mat-icon')
			this.player.queue.enqueue(video);
		else
			this.selectedVideoMenuItem = video;
	}

	videoMenuClick(type: videoMenuClickTypes) {
		if (this.selectedVideoMenuItem || this.selectedQueueMenuItem !== null) {
			switch (type) {
				case videoMenuClickTypes.PLAY:
					this.player.queue.enqueue(this.selectedVideoMenuItem);
					this.player.queue.index = this.player.queue.length - 1;
					this.player.play();
					break;
				case videoMenuClickTypes.PLAY_NEXT:
					this.player.queue.addNext(this.selectedVideoMenuItem);
					break;
				case videoMenuClickTypes.ADD_QUEUE:
					this.player.queue.enqueue(this.selectedVideoMenuItem);
					break;
				case videoMenuClickTypes.REMOVE_QUEUE:
					this.player.queue.remove(this.selectedQueueMenuItem);
					break;
			}

			this.selectedVideoMenuItem = null;
			this.selectedQueueMenuItem = null;
		}
	}

	queueClick(evt, index: number) {
		if (evt.target.nodeName.toLowerCase() === 'mat-icon')
			this.selectedQueueMenuItem = index;
		else {
			this.player.queue.index = index;
			this.player.play();
		}
	}

	selectSubtitle() {
		// Remove all existing track elements
		Array.from(this.videoElem.nativeElement.getElementsByTagName('track'))
			.forEach((object: HTMLTrackElement) => {
				window.URL.revokeObjectURL(object.src);
				object.remove();
			});

		this.dialog.open(SubtitleDialogComponent, {
			width: '350px',
			data: this.subtitles
		}).afterClosed().subscribe(result => {
			if (result) {
				let url = environment.apiUrl + '/subtitle/' + result;

				if (result instanceof File)
					url = window.URL.createObjectURL(result);

				const trackElem = document.createElement('track');

				trackElem.src = url;
				trackElem.kind = 'captions';
				trackElem.setAttribute('default', 'true');

				if (result instanceof File)
					trackElem.label = result.name;
				else
					trackElem.label = result;

				this.videoElem.nativeElement.appendChild(trackElem);
			}
		});
	}

	playbackrateChange() {
		this.player.setPlaybackRate(parseFloat(this.playbackRate));
	}

	requestPiP() {
		const displayError = () => {
			// This can have multiple different reasons: your browser rejected it, the video element was not yet loaded, the video was not playing, etc.
			this.snackBar.open('Unable to display PiP', null, {
				duration: 3000
			});
		}

		if (this.videoElem) {
			this.videoElem.nativeElement.requestPictureInPicture()
				.catch(displayError);

			return;
		}

		displayError();
	}
}
