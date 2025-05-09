import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
// uuid
import { v4 as uuidv4 } from 'uuid';
// d3
import * as d3 from 'd3';

// export type D3Event<T extends Event, E extends Element> = T & { currentTarget: E }

export interface RadarDataItem {
  name: string,
  value: number, // float 0-1
  color?: string
}

export interface RadarData {
  id: string,
  items: RadarDataItem[],
  name: string,
  color?: string
}

export interface ColorScheme {
  color: string,
  background: string,
  colors?: string[]
}

@Component({
  selector: 'app-radar',
  imports: [ CommonModule ],
  templateUrl: './radar.component.html',
  styleUrl: './radar.component.scss'
})
export class RadarComponent implements AfterViewInit, OnDestroy {

  @Input('size') set size(size: number) {
    this._size = size;
    if (this.svgElm) {
      // this.log('svgElm on data set', this.svgElm);
      this.initRadar();
    }
  };

  private _size: number = 360;
  get size(): number {
    return this._size;
  }
  @Input('colorScheme') set colorScheme(scheme: ColorScheme)  {
    // console.log('set colorScheme', scheme);
    if (scheme) {
      this._colorScheme = scheme;
    }
  }
  get colorScheme(): ColorScheme {
    return this._colorScheme;
  }
  @Input('data') set data(radarData: RadarData[]) {
    // console.log('set radarData', radarData);
    if (radarData.length) {
      this._data = radarData;
      // console.log('is radar initialised?', this.radarInitialized);
      // this.log('DATA', this._data);
      if (this.svgElm/*  && !this.radarInitialized */) {
        // this.log('svgElm on data set', this.svgElm);
        this.initRadar();
      }

      // if (this.svgElm && this.radarInitialized) {
      //   this.chart();
      // }

      

    }
  }
  @ViewChild('svg') svgElm!: ElementRef;

  get data(): RadarData[] {
    return this._data;
  }

  private _colorScheme: ColorScheme = {
    color: 'white',
    background: 'blue',
    colors: ['red', 'green', 'blue', 'yellow', 'pink']
  }


  get config(): any {
    return {
      w: this.size,				//Width of the circle
      h: this.size,				//Height of the circle
      margin: { top: 20, right: 20, bottom: 20, left: 20 }, // The margins of the SVG
      levels: 4,				// How many levels or inner circles should there be drawn
      maxValue: 0, 			// What is the value that the biggest circle will represent
      labelFactor: 1.25, 	// How much farther than the radius of the outer circle should the labels be placed
      wrapWidth: 60, 		// The number of pixels after which a label needs to be given a new line
      opacityArea: 0.35, 	// The opacity of the area of the blob
      dotRadius: 4, 			// The size of the colored circles of each blog
      opacityCircles: 0.0, 	// The opacity of the circles of each blob
      strokeWidth: 1, 		// The width of the stroke around each blob
      roundStrokes: false,	// If true the area and stroke will follow a round path (cardinal-closed)
      color: d3.scaleOrdinal(this.colorScheme.colors),	// Color function
      showLabels: true
    }
  }

  private _data: RadarData[] = [];
  private radarInitialized: boolean = false;
  // private get id(): string {
  //   return uuidv4();
  // }
  private id: string = uuidv4();

  private maxValue: number = 0;
  private allAxis!: string[];
  private total!: number;
  private radius!: number;
  private format!: any;
  private angleSlice!: number;
  private rScale: any;

  constructor(
    private elm: ElementRef
  ) { }

  // ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.svgElm && this._data.length && !this.radarInitialized) {
      this.log('svgElm after view init', this.svgElm);
      this.initRadar();
    }

  }

  ngOnDestroy(): void {

  }

  private setElmSizes(): void {
    this.elm.nativeElement.style.width = `${this.size}px`;
    this.elm.nativeElement.style.height = `${this.size}px`;
    this.svgElm.nativeElement.style.width = `${this.size}px`;
    this.svgElm.nativeElement.style.height = `${this.size}px`;
  }

  private initRadar(): void {
    this.log('INIT RADAR');
    this.setElmSizes();
    // this.config.w = this.size;
    // this.config.h = this.size;
    // console.log('data', this._data);
    for (const dataItem of this._data) {
      for (const item of dataItem.items) {
        const value = item.value;
        if (value > this.maxValue) this.maxValue = value;
      }
    }
    // this.log('maxValue', this.maxValue);
    this.allAxis = this._data[0].items.map((i: RadarDataItem, j: number) => i.name);
    // this.log('allAxis', this.allAxis);
    this.total = this.allAxis.length;
    this.radius = Math.min(this.config.w / 2.5, this.config.h / 2.5);
    this.format = d3.format('.0%') // rounded percentage, '12%';
    // this.log('format', this.format);
    this.angleSlice = Math.PI * 2 / this.total;
    this.rScale = d3.scaleLinear()
      .range([0, this.radius])
      .domain([0, this.maxValue]);
    // Remove whatever chart was present before
    d3.select(`#radar-${this.id}.radar-chart g`).remove();
    // chart
    this.chart();
    this.radarInitialized = true;
  }

  private chart(): void {
    // this.log('config.w', this.config.w);
    
    // const scope = this;
    const svg = d3.select(this.svgElm.nativeElement)
      .attr('width', this.config.w)
      .attr('height', this.config.h)
      .attr('id', 'radar-' + this.id)
      .attr('class', 'radar-chart');
    // Append a g element		
    const g = svg.append('g')
      .attr('transform', `translate(${this.config.w / 2}, ${this.config.h / 2})`); // center radar

    /////////////////////////////////////////////////////////
    ////////// Glow filter for some extra pizzazz ///////////
    /////////////////////////////////////////////////////////

    // Filter for the outside glow
    // const filter = g.append('defs').append('filter').attr('id', 'glow'),
    //   feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur'),
    //   feMerge = filter.append('feMerge'),
    //   feMergeNode_1 = feMerge.append('feMergeNode').attr('in', 'coloredBlur'),
    //   feMergeNode_2 = feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /////////////////////////////////////////////////////////
    /////////////// Draw the Circular grid //////////////////
    /////////////////////////////////////////////////////////
    // Wrapper for the grid & axes
    const axisGrid = g.append('g').attr('class', 'axisWrapper');
    // Draw the background circles
    axisGrid.selectAll('.levels')
      .data(d3.range(1, (this.config.levels + 1)).reverse())
      .enter()
      .append('circle')
      .attr('class', 'gridCircle')
      .attr('id', (d: any, i: number) => {
        this.log('grid circle i', i);
        if (i === 0) return 'mainGridCircle';
        return '';
      })
      .attr('r', (d: number, i: number) => this.radius / this.config.levels * d)
      .style('fill', this.colorScheme.background)
      .style('stroke', this.colorScheme.color)
      .style('stroke-opacity', .3)
      .style('fill-opacity', this.config.opacityCircles)
      // .style('filter' , 'url(#glow)');

    // Text indicating at what % each level is
    // axisGrid.selectAll('.axisLabel')
    //   .data(d3.range(1, (this.config.levels + 1)).reverse())
    //   .enter().append('text')
    //   .attr('class', 'axisLabel')
    //   .attr('x', 4)
    //   .attr('y', (d: number) => -d * this.radius / this.config.levels)
    //   .attr('dy', '0.4em')
    //   .style('font-size', '10px')
    //   .attr('fill', this.colorScheme.color)
    //   .text((d: number, i: number) => this.format(this.maxValue * d / this.config.levels));

    /////////////////////////////////////////////////////////
    //////////////////// Draw the axes //////////////////////
    /////////////////////////////////////////////////////////

    // Create the straight lines radiating outward from the center
    var axis = axisGrid.selectAll('.axis')
      .data(this.allAxis)
      .enter()
      .append('g')
      .attr('class', 'axis');
    // Append the lines
    axis.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d, i) => this.rScale(this.maxValue/*  * 1.1 */) * Math.cos(this.angleSlice * i - Math.PI / 2))
      .attr('y2', (d, i) => this.rScale(this.maxValue/*  * 1.1 */) * Math.sin(this.angleSlice * i - Math.PI / 2))
      .attr('class', 'line')
      .style('stroke', this.colorScheme.color)
      .style('stroke-width', '1px')
      .style('stroke-opacity', .5);
    
    // Append invisible circle as path for text
    axis.append('path')
      .attr('id', (d, i) => `pathCircle-${i}`)
      .attr('d', (d, i) => d3.arc()({
        innerRadius: this.radius + 12,
        outerRadius: this.radius + 12,
        startAngle: ((Math.PI) + (this.angleSlice * i) - (Math.PI / 5)), // TODO: not well done
        endAngle: -(Math.PI) + (this.angleSlice * i - (Math.PI / 5)) // TODO: not well done
      }))
      .style('fill-opacity', 0);

    // Append the labels at each axis
    if (this.config.showLabels) {
      axis.append('text')
      .append('textPath')
      .attr('class', 'legend')
      .style('font-size', '11px')
      .attr('fill', this.colorScheme.color)
      .attr('xlink:href', (d, i) => `#pathCircle-${i}`) // place the ID of the path here
      .style('text-anchor','middle') // place the text halfway on the arc
      .attr('startOffset', '80%')
      // .attr('dy', '0.35em')
      // .attr('x', (d, i) => this.rScale(this.maxValue * this.config.labelFactor) * Math.cos(this.angleSlice * i - Math.PI / 2))
      // .attr('y', (d, i) => this.rScale(this.maxValue * this.config.labelFactor) * Math.sin(this.angleSlice * i - Math.PI / 2))
      .text((d, i, nodes) => d)
      // .call(this.wrap, this.config.wrapWidth);
    }
    

    /////////////////////////////////////////////////////////
    ///////////// Draw the radar chart blobs ////////////////
    /////////////////////////////////////////////////////////

    //The radial line function
    const radarLine = d3.lineRadial()
      // .interpolate('linear-closed')
      .radius((d: [number, number]) => this.rScale(d[0]))
      .angle((d, i) => i * this.angleSlice)
      .curve(d3.curveLinearClosed);

    if (this.config.roundStrokes) {
      radarLine.curve(d3.curveCardinalClosed);
    }

    // Create a wrapper for the blobs	
    const blobWrapper = g.selectAll('.radarWrapper')
      .data(this._data)
      .enter().append('g')
      .attr('class', 'radarWrapper');

    // Append the backgrounds	
    blobWrapper
      .append('path')
      .attr('class', 'radarArea')
      .attr('d', (d: RadarData, i: number) => {
        // this.log('blobWrapper d, i', {d: d.items[i].value, i: i});
        let lineData: [number, number][] = [];
        for (let i = 0; i < d.items.length; i++) {
          if (i === d.items.length - 1) {
            lineData.push([d.items[i].value, d.items[0].value]);
          } else {
            lineData.push([d.items[i].value, d.items[i+1].value]);
          }
        }
        const line = radarLine(lineData);
        // this.log('LINE', line);
        return line;
      })
      .style('fill', (d, i) => {
        // this.log('append backgrouds fill datum', d);
        return d.color ? d.color : 'pink';
      }/* this.colorScheme.colors && this.colorScheme.colors[i] ? this.colorScheme.colors[i] : 'pink' */)
      .style('fill-opacity', this.config.opacityArea)
      .on('touchstart', (e: TouchEvent, dataItem: RadarData) => {
        // this.log('touchstart dataItem', dataItem)
        // this.log('touchstart event', e);
        // Dim all blobs
        d3.selectAll('.radarArea')
        .transition().duration(200)
        .style('fill-opacity', 0.1);
        // Bring back the hovered over blob
        d3.select(e.target as HTMLElement)
          .transition().duration(200)
          .style('fill-opacity', 0.7);        
      })
      .on('touchend', () => {
        //Bring back all blobs
        d3.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', this.config.opacityArea);
      });

    // Create the outlines	
    blobWrapper.append('path')
      .attr('class', 'radarStroke')
      .attr('d', (d, i) => {
        // const line = radarLine([...d.items.map(i => i.value)])
        // this.log('blobWrapper d, i', {d: d.items[i].value, i: i});
        let lineData: [number, number][] = [];
        for (let i = 0; i < d.items.length; i++) {
          if (i === d.items.length - 1) {
            lineData.push([d.items[i].value, d.items[0].value]);
          } else {
            lineData.push([d.items[i].value, d.items[i+1].value]);
          }
        }
        const line = radarLine(lineData);
        // this.log('LINE', line);
        return line;
        // return radarLine([[d.items[i].value, d.items[i+1].value]])
      })
      .style('stroke-width', this.config.strokeWidth + 'px')
      .style('stroke', (d, i) => { 
        const color = d.color ? d.color : 'pink';
        // console.log('d', d);
        return color;
      })
      .style('fill', 'none')
      // .style('filter', 'url(#glow)');

    // Append the circles
    blobWrapper.selectAll('.radarCircle')
      .data((d, dataIndex) => {
        for (const item of d.items) item['color'] = d.color;
        return d.items
      })
      .enter().append('circle')
      .attr('class', 'radarCircle')
      .attr('r', this.config.dotRadius)
      .attr('cx', (d, i) => this.rScale(d.value) * Math.cos(this.angleSlice * i - Math.PI / 2))
      .attr('cy', (d, i) => this.rScale(d.value) * Math.sin(this.angleSlice * i - Math.PI / 2))
      .style('fill', (d, i, j) => d.color ? d.color : 'pink')
      .style('fill-opacity', 0.9);

    /////////////////////////////////////////////////////////
    //////// Append invisible circles for tooltip ///////////
    /////////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    var blobCircleWrapper = g.selectAll('.radarCircleWrapper')
      .data(this._data)
      .enter().append('g')
      .attr('class', 'radarCircleWrapper');

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data((d, i) => d.items)
      .enter().append('circle')
      .attr('class', 'radarInvisibleCircle')
      .attr('r', this.config.dotRadius * 1.5)
      .attr('cx', (d, i) => this.rScale(d.value) * Math.cos(this.angleSlice * i - Math.PI / 2))
      .attr('cy', (d, i) => this.rScale(d.value) * Math.sin(this.angleSlice * i - Math.PI / 2))
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('touchstart', (e: TouchEvent, dataItem: RadarDataItem) => {
        // this.log('tooltip touchstart data', dataItem);
        const newX = parseFloat(d3.select(e.target as HTMLElement).attr('cx')) - 10;
        const newY = parseFloat(d3.select(e.target as HTMLElement).attr('cy')) - 10;

        tooltip
          .attr('x', newX)
          .attr('y', newY)
          .text(`${dataItem.name}: ${this.format(dataItem.value)}`)
          .transition().duration(200)
          .style('opacity', 1)
          .style('fill', dataItem.color ? dataItem.color : 'pink');
      })
      .on('touchend', function () {
        tooltip.transition().duration(200)
          .style('opacity', 0);
      });

    //Set up the small tooltip for when you hover over a circle
    var tooltip = g.append('text')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  //Taken from http://bl.ocks.org/mbostock/7555321
  //Wraps SVG text	
  private wrap(text: any, width: number) {
    // console.log('wrap text', text);
    text.each((t: string, index: number, nodes: SVGTextElement[]) => {
      console.log('selector', nodes[index]);
  	var text = d3.select(nodes[index]),
  		words = text.text().split(/\s+/).reverse(),
  		word,
  		line: any[] = [],
  		lineNumber = 0,
  		lineHeight = 1.4, // ems
  		y = text.attr('y'),
  		x = text.attr('x'),
  		dy = parseFloat(text.attr('dy')),
  		tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em');
  		
  	while (word = words.pop()) {
  	  line.push(word);
  	  tspan.text(line.join(' '));
      if (tspan !== null && tspan.node() !== null) {
        const computedLength = tspan.node()?.getComputedTextLength();
        if (computedLength && computedLength > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
        }
      }
  	  
  	}
    });
  }//wrap	

  log(key: any, value?: any): void {
    // console.log(`🕷️ ${key}`, value);
  }

}