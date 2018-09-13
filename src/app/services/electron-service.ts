import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as electron from 'electron';

@Injectable()
export class ElectronService {

  constructor(public http: HttpClient) {}

  chooseAudioFile(): string {
    const chosenFiles = electron.remote.dialog.showOpenDialog({
      properties: ['openFile'], filters: [{name: 'WAV Files', extensions: ['wav']}]
    });
    return chosenFiles ? chosenFiles[0] : null;
  }

  chooseImageFile(): string {
    const chosenFiles = electron.remote.dialog.showOpenDialog({
      properties: ['openFile'], filters: [{name: 'JPG Files', extensions: ['jpg']}]
    });
    return chosenFiles ? chosenFiles[0] : null;
  }

  displayError(error: string) {
    electron.remote.dialog.showErrorBox("Archiver", error);
  }

  displayQuestion(question: string) {
    return electron.remote.dialog.showMessageBox({
      type: 'question',
      title: 'Archiver',
      message: question,
      buttons: ["Yes", "No"]
    })
  }

}
