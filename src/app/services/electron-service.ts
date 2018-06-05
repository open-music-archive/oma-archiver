import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as electron from 'electron';

@Injectable()
export class ElectronService {

  constructor(public http: HttpClient) {}

  chooseFile(): string {
    const chosenFiles = electron.remote.dialog.showOpenDialog({
      properties: ['openFile']
    });
    return chosenFiles ? chosenFiles[0] : null;
  }

}
