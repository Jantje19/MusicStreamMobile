import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Player, repeatMode, SWIPE_ACTION, Song } from '../../data-types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';

enum songMenuClickTypes {
	REMOVE_QUEUE = 'removeFromQueue',
	ADD_QUEUE = 'addToQueue',
	PLAY_NEXT = 'playNext',
	EDIT_TAGS = 'editTags'
}

@Component({
	selector: 'app-player',
	templateUrl: './player.component.html',
	styleUrls: ['./player.component.css', './seekbarStyle.css']
})
export class PlayerComponent implements AfterViewInit {
	queueState = false;
	openState = false;

	songMenuClickTypes = songMenuClickTypes;
	repeatModes = repeatMode;

	selectedMenuItem: Song;

	public player: Player;

	@ViewChild('shufflebutton', { static: false }) shuffleElem: ElementRef;
	@ViewChild('bottomsheet', { static: false }) sheetElem: ElementRef;
	@ViewChild('seekbar', { static: false }) seekbarElem: ElementRef;
	@ViewChild('curTime', { static: false }) curTimeElem: ElementRef;
	@ViewChild('durTime', { static: false }) durTimeElem: ElementRef;
	@ViewChild('content', { static: false }) contentElem: ElementRef;
	@ViewChild('container', { static: false }) topElem: ElementRef;
	@ViewChild('albumart', { static: false }) albumArt: ElementRef;
	@ViewChild('playbtn', { static: false }) playElem: ElementRef;
	@ViewChild('queue', { static: false }) queueElem: ElementRef;

	get isOpen(): boolean {
		return this.openState;
	}

	constructor(http: HttpClient, private snackBar: MatSnackBar) {
		const worker = new Worker('../../main-image-color.worker', { type: 'module' });
		worker.onmessage = this.handleWorkerMessage.bind(this);

		this.player = new Player(http);
		this.player.songUpdate.subscribe(() => {
			if (!this.player.queue.selected.tags.image) {
				this.resetStyle();
				this.handleWorkerMessage({
					data: {
						r: 39,
						g: 54,
						b: 66,
						darker: {
							r: 14,
							g: 28,
							b: 41
						}
					}
				});
			} else {
				const blob = new Blob([new Uint8Array(this.player.queue.selected.tags.image.imageBuffer.data)], { type: 'image/png' });
				const blobUrl = URL.createObjectURL(blob);
				const image = new Image();

				this.albumArt.nativeElement.style.backgroundImage = `url('${blobUrl}')`;
				image.onload = () => {
					worker.postMessage({ blob, width: image.width, height: image.height });

					// @ts-ignore TypeScript does not know about the Media Session API: https://github.com/Microsoft/TypeScript/issues/19473
					navigator.mediaSession.metadata.artwork = [
						{ src: blobUrl, sizes: `${image.width}x${image.height}`, type: 'image/png' }
					];
				}
				image.src = blobUrl;
			}
		});
		this.player.timeUpdate.subscribe(({ percentage, currentTime, duration }) => {
			this.durTimeElem.nativeElement.innerText = Player.convertToReadableTime(duration - currentTime);
			this.curTimeElem.nativeElement.innerText = Player.convertToReadableTime(currentTime);
			this.seekbarElem.nativeElement.value = percentage;
		});
		// Queue scroll
		(function () {
			let index = this.player.queue.index + 1;
			let elem;

			const observer = new MutationObserver(() => {
				observer.disconnect();
				elem
					.children[index]
					.scrollIntoView();
			});

			this.player.queue.update.subscribe(() => {
				if (this.queueElem) {
					elem = this.queueElem.nativeElement.children[1];

					let index = this.player.queue.index + 1;

					if (index > this.player.queue.length - 1)
						index--;

					if (elem.children[index])
						elem
							.children[index]
							.scrollIntoView();
					else
						observer.observe(elem, { childList: true });
				}
			});
		}).bind(this)();
	}

	ngAfterViewInit() {
		const buttonRect = (<any>this.playElem)._elementRef.nativeElement.getBoundingClientRect();
		const containerRect = this.sheetElem.nativeElement.getBoundingClientRect();

		this.sheetElem.nativeElement.style.setProperty('--btn-y', buttonRect.y - containerRect.y + buttonRect.height / 2);
	}

	toggle(): boolean {
		if (this.openState)
			this.close();
		else
			this.open();

		return this.isOpen;
	}

	open(): void {
		if (this.player.queue.length > 0)
			this.openState = true;
	}

	close(): void {
		this.openState = false;
	}

	toggleQueue(evt): void {
		if (evt.target.nodeName.toLowerCase() === 'mat-icon')
			this.selectedMenuItem = this.player.queue.selected;
		else
			this.queueState = !this.queueState;
	}

	getSongInfo(): string {
		if (this.player.queue.selected)
			return this.player.queue.selected.info;
		else
			return "";
	}

	shuffleQueue() {
		this.shuffleElem.nativeElement.setAttribute('fade', false);
		this.player.queue.shuffle();
		setTimeout(() => {
			this.shuffleElem.nativeElement.setAttribute('fade', true);
		}, 500);
	}

	cycleRepeat() {
		if (this.player.repeatState === repeatMode.UNSET)
			this.player.repeatState = repeatMode.QUEUE;
		else if (this.player.repeatState === repeatMode.QUEUE)
			this.player.repeatState = repeatMode.ONE;
		else if (this.player.repeatState === repeatMode.ONE)
			this.player.repeatState = repeatMode.UNSET;
	}

	seek() {
		this.player.seek(this.seekbarElem.nativeElement.value);
	}

	swipeHandler(action: SWIPE_ACTION, type = null) {
		switch (action) {
			case SWIPE_ACTION.LEFT:
				this.player.next();
				break;
			case SWIPE_ACTION.RIGHT:
				this.player.previous();
				break;
			case SWIPE_ACTION.DOWN:
				if (type === 'queue')
					this.queueState = false;
				else
					this.close();
				break;
			case SWIPE_ACTION.UP:
				if (type === 'queue')
					this.queueState = true;
				else
					this.open();
				break;
		}
	}

	queueClick(evt, index: number) {
		if (evt.target.nodeName.toLowerCase() === 'mat-icon')
			this.selectedMenuItem = this.player.queue.list[index];
		else {
			this.player.queue.index = index;
			this.queueState = false;
			this.player.play();
		}
	}

	emptyQueue() {
		this.topElem.nativeElement.addEventListener('transitionend', function handler() {
			this.topElem.nativeElement.removeEventListener('transitionend', handler);
			this.resetStyle();
		}.bind(this), { passive: true, once: true });
		this.player.queue.setQueue([]);
		this.openState = false;
	}

	songMenuClick(type: songMenuClickTypes) {
		if (this.selectedMenuItem) {
			switch (type) {
				case songMenuClickTypes.PLAY_NEXT:
					this.player.queue.addNext(this.selectedMenuItem);
					break;
				case songMenuClickTypes.ADD_QUEUE:
					this.player.queue.enqueue(this.selectedMenuItem);
					break;
				case songMenuClickTypes.EDIT_TAGS:
					// TODO: Make this work
					this.snackBar.open('Not available (yet).', null, {
						duration: 3000
					});
					break;
				case songMenuClickTypes.REMOVE_QUEUE:
					if (
						this.player.removeFromQueue(this.selectedMenuItem) &&
						this.player.queue.length < 1
					)
						this.emptyQueue();
					break;
			}

			this.selectedMenuItem = null;
		}
	}

	private handleWorkerMessage({ data }) {
		const elem = this.contentElem.nativeElement;

		elem.style.setProperty('--background-color-darker', `rgb(${data.darker.r}, ${data.darker.g}, ${data.darker.b})`);

		if (!('paintWorklet' in CSS))
			elem.style.setProperty('--background-color', `rgb(${data.r}, ${data.g}, ${data.b})`);
		else {
			const contentElem = this.contentElem.nativeElement;
			const elem = this.sheetElem.nativeElement;
			const start = performance.now();

			elem.style.setProperty('--color', `rgb(${data.r}, ${data.g}, ${data.b})`);

			requestAnimationFrame(function raf(now) {
				const count = Math.floor(now - start);
				elem.style.setProperty('--animation-tick', count.toString());
				if (count > 1000) {
					contentElem.style.setProperty('--background-color', `rgb(${data.r}, ${data.g}, ${data.b})`);
					elem.style.setProperty('--animation-tick', count.toString());
					return;
				}
				requestAnimationFrame(raf);
			});
		}
	}

	private resetStyle() {
		this.contentElem.nativeElement.style.setProperty('--background-color-darker', '#0e1c29');
		this.contentElem.nativeElement.style.setProperty('--background-color', '#273642');
		this.albumArt.nativeElement.style.backgroundImage = 'url(/assets/Record.png)';
		this.sheetElem.nativeElement.style.setProperty('--animation-tick', 0);
	}
}
