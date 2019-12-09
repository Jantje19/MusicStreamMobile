import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BackgroundsyncLogger, Song } from 'src/app/data-types';
import { Component, Inject } from '@angular/core';

@Component({
	selector: 'app-bgsync-dialog',
	templateUrl: './bgsync-dialog.component.html',
	styleUrls: ['./bgsync-dialog.component.css']
})
export class BgsyncDialogComponent {
	public swInstalled = (navigator.serviceWorker && navigator.serviceWorker.controller);
	public bgSyncAvailable = ('SyncManager' in window);

	constructor(
		@Inject(MAT_DIALOG_DATA) public bgSyncLog: BackgroundsyncLogger,
		private dialogRef: MatDialogRef<BgsyncDialogComponent>
	) { }

	close() {
		this.dialogRef.close();
	}
}
