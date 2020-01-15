import { BackgroundsyncLogger, BackgroundsyncLog } from 'src/app/data-types';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';

@Component({
	selector: 'app-bgsync-dialog',
	templateUrl: './bgsync-dialog.component.html',
	styleUrls: ['./bgsync-dialog.component.css']
})
export class BgsyncDialogComponent {
	public swInstalled = (navigator.serviceWorker && navigator.serviceWorker.controller);
	public bgSyncAvailable = ('SyncManager' in window);
	public log: BackgroundsyncLog[] = [];

	constructor(
		@Inject(MAT_DIALOG_DATA) bgSyncLog: BackgroundsyncLogger,
		private dialogRef: MatDialogRef<BgsyncDialogComponent>
	) {
		this.log = bgSyncLog.log.currentlyRegistered;

		bgSyncLog.log.previouslyRegistered
			.then(items => this.log.push(...items))
			.catch(console.error);
	}

	close() {
		this.dialogRef.close();
	}
}
