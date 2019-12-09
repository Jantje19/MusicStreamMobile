import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BgsyncDialogComponent } from './bgsync-dialog.component';

describe('BgsyncDialogComponent', () => {
  let component: BgsyncDialogComponent;
  let fixture: ComponentFixture<BgsyncDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BgsyncDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BgsyncDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
