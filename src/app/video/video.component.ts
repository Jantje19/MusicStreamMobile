import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SubtitleDialog } from './subtitle-dialog/subtitle-dialog.component';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Video, Player } from '../data-types';
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

	@ViewChild('video', { static: false }) videoElem: ElementRef;

	videoMenuClickTypes = videoMenuClickTypes;
	selectedQueueMenuItem: number = null;
	selectedVideoMenuItem: Video = null;
	subtitles: string[] = [];
	videos: Video[] = [];
	loadingState = true;
	player: Player;

	constructor(
		private snackBar: MatSnackBar,
		private dialog: MatDialog,
		private http: HttpClient,
		dataService: DataService,
	) {
		// @ts-ignore
		const songSort = sortMethod;

		document.title = this.title;
		dataService.update(songSort, false);
		dataService.load.subscribe(() => {
			this.subtitles = dataService.subtitles;
			this.videos = dataService.videos;

			this.loadingState = false;
		});
		dataService.error.subscribe((err: Error) => {
			this.loadingState = false;
			this.snackBar.open('Unable to fetch the data...', null, {
				duration: 3000
			});
			console.error(err);
		});
	}

	ngAfterViewInit() {
		this.player = new Player(this.videoElem.nativeElement, this.http);
	}

	videoClick(evt, video: Video) {
		if (evt.target.nodeName.toLowerCase() !== 'mat-icon')
			this.player.queue.enqueue(video);
		else
			this.selectedVideoMenuItem = video;
	}

	videoMenuClick(type: videoMenuClickTypes) {
		if (this.selectedVideoMenuItem) {
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

		this.dialog.open(SubtitleDialog, {
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
}
