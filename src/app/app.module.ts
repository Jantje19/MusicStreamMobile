import { HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { PlayerComponent } from './main/player/player.component';
import { BrowserModule } from '@angular/platform-browser';
import { MainComponent } from './main/main.component';
import { AppComponent } from './app.component';
import { NgModule } from '@angular/core';
import * as Hammer from 'hammerjs';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
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

export class HammerConfig extends HammerGestureConfig {
	overrides = <any>{
		'swipe': { direction: Hammer.DIRECTION_ALL }
	};
}

@NgModule({
	declarations: [
		AppComponent,
		VideoComponent,
		PlayerComponent,
		MainComponent,
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
		MatRippleModule,
		MatButtonModule,
		HttpClientModule,
		AppRoutingModule,
		MatToolbarModule,
		MatSnackBarModule,
		MatExpansionModule,
		MatProgressBarModule,
		BrowserAnimationsModule,
		MatProgressSpinnerModule,
	],
	providers: [
		{
			provide: HAMMER_GESTURE_CONFIG,
			useClass: HammerConfig
		}
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
