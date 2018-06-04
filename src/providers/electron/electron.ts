import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as electron from 'electron';
import * as fs from 'fs';

@Injectable()
export class ElectronProvider {
  currentZoom: number = 0;

  constructor(public http: HttpClient) {}

  zoomIn(){
    electron.webFrame.setZoomLevel(++this.currentZoom);
    fs.stat('.', (err, stat) => console.log(err, stat))
  }

  zoomOut(){
    electron.webFrame.setZoomLevel(--this.currentZoom);
  }

}
