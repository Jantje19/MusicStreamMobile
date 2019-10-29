import { SubtitleDialog } from './video/subtitle-dialog/subtitle-dialog.component';
import { PlayerComponent } from './main/player/player.component';
import { BrowserModule } from '@angular/platform-browser';
import { MainComponent } from './main/main.component';
import { AppComponent } from './app.component';
import { NgModule } from '@angular/core';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatRippleModule } from '@angular/material/core';
import { VideoComponent } from './video/video.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@NgModule({
	declarations: [
		AppComponent,
		MainComponent,
		SubtitleDialog,
		VideoComponent,
		PlayerComponent,
	],
	imports: [
		FormsModule,
		RouterModule,
		MatTabsModule,
		BrowserModule,
		MatCardModule,
		MatIconModule,
		MatListModule,
		MatMenuModule,
		MatRadioModule,
		MatDialogModule,
		MatSelectModule,
		MatRippleModule,
		MatButtonModule,
		HttpClientModule,
		AppRoutingModule,
		MatToolbarModule,
		MatDividerModule,
		MatSnackBarModule,
		MatExpansionModule,
		MatFormFieldModule,
		MatProgressBarModule,
		BrowserAnimationsModule,
		MatProgressSpinnerModule,
	],
	entryComponents: [SubtitleDialog],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
