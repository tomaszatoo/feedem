import {
  Component,
  Input,
  ElementRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild
} from '@angular/core';


@Component({
  selector: 'app-value-indicator',
  imports: [],
  templateUrl: './value-indicator.component.html',
  styleUrl: './value-indicator.component.scss'
})
export class ValueIndicatorComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('indicator') indicatorElm!: ElementRef;
  @ViewChild('slider') sliderElm!: ElementRef;

  @Input() range: [number, number] = [-1, 1]; // default
  @Input() set value(value: number) {
    this._value = value;
    this.setIndicatorPosition();
  }
  get value(): number {
    return this._value;
  }
  private _value: number = 0;
  @Input() label: string = '';

  private elmSize: {width: number, height: number} = {width: 0, height: 0}

  constructor(
    private readonly elm: ElementRef
  ){}

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {
    this.setIndicatorPosition();
  }

  ngOnDestroy(): void {
    
  }

  private setIndicatorPosition(): void {
    if (this.elm) {
      const rect = this.elm.nativeElement.getBoundingClientRect();
      this.elmSize.width = rect.width;
      this.elmSize.height = rect.height;
      // console.log('elmSize', this.elmSize);
    }
    if (this.indicatorElm) {
      const indicatorPosition = this.mapValueToElementPosition(this.value, this.range[0], this.range[1], this.elmSize.width);
      // console.log('indicatorPosition', indicatorPosition);
      this.indicatorElm.nativeElement.style.transform = `translateX(${indicatorPosition - 6}px)`;
    }
  }

  private mapValueToElementPosition(
    value: number,
    min: number,
    max: number,
    elementWidth: number
  ): number {
    if (min === max) return 0; // avoid division by zero
    const clampedValue = Math.min(Math.max(value, min), max);
    const normalized = (clampedValue - min) / (max - min); // 0 to 1
    return normalized * elementWidth;
  }
}
