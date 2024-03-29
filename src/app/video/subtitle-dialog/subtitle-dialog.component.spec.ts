import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SubtitleDialogComponent } from './subtitle-dialog.component';

describe('SubtitleDialogComponent', () => {
	let component: SubtitleDialogComponent;
	let fixture: ComponentFixture<SubtitleDialogComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [SubtitleDialogComponent]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(SubtitleDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
