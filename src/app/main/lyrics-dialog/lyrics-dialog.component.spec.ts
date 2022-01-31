import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LyricsDialogComponent } from './lyrics-dialog.component';

describe('LyricsDialogComponent', () => {
  let component: LyricsDialogComponent;
  let fixture: ComponentFixture<LyricsDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ LyricsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LyricsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
