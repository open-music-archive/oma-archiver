import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as electron from 'electron';
import * as fs from 'fs';

@Injectable()
export class ElectronService {

  constructor(public http: HttpClient) {}

  pickFile(): string[] {
    return electron.remote.dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory', 'multiSelections']
    });
  }

}
