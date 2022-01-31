import { VideoComponent } from './video/video.component';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { NgModule } from '@angular/core';

const routes: Routes = [
	{ path: 'videos', component: VideoComponent },
	{ path: '', component: MainComponent },
];

@NgModule({
	imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
	exports: [RouterModule]
})
export class AppRoutingModule { }
