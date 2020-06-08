import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject, ElementRef, ViewChild } from '@angular/core';

@Component({
	styleUrls: ['./subtitle-dialog.component.css'],
	templateUrl: 'subtitle-dialog.component.html',
	selector: 'subtitle-dialog',
})
export class SubtitleDialogComponent {

	selectedFileName: string = "No file chosen";
	selectValue: string;

	@ViewChild('fileInput') fileInput: ElementRef;

	constructor(
		public dialogRef: MatDialogRef<SubtitleDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public subtitles: string[],
	) { }

	cancelClick(): void {
		this.dialogRef.close();
	}

	selectClick(): void {
		if (this.fileInput.nativeElement.files.length > 0)
			this.dialogRef.close(this.fileInput.nativeElement.files[0]);
		else if (this.selectValue)
			this.dialogRef.close(this.selectValue);
		else
			this.dialogRef.close();
	}

	selectFile() {
		this.fileInput.nativeElement.click();
	}

	fileSelectChange() {
		if (this.fileInput.nativeElement.files.length > 0)
			this.selectedFileName = this.fileInput.nativeElement.files[0].name;
		else
			this.selectedFileName = "No file chosen";
	}
}