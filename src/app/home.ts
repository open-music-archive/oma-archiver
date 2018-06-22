import { Component } from '@angular/core';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';
import { AudioService } from './services/audio-service';
import { ApiService } from './services/api-service';
import { Record, Fragment, ProgressObserver } from './types';
import * as uuidv4 from 'uuid/v4';
import * as fs from 'fs';
import * as constants from './constants';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements ProgressObserver {

  private title: string;
  private composer: string;
  private artist: string;
  private recordId: string;
  private label: string;
  private side: string;
  private chosenFile: string;
  private status = "";
  private task = "";
  private progress = 0; //progress in [0,1]
  private statusText = "";

  constructor(
    private electron: ElectronService,
    private features: FeatureService,
    private audio: AudioService,
    private apiService: ApiService
  ) {}

  chooseFile() {
    const newFile = this.electron.chooseFile();
    if (newFile) {
      this.chosenFile = newFile;
    }
  }

  async archive() {
    if (this.chosenFile) {
      this.archiveFile(this.chosenFile);//.catch(alert);
    }
  }

  private async archiveFile(audioFile: string) {

    const sideuid = uuidv4();

    if (!fs.existsSync(constants.SOUND_OBJECTS_FOLDER+sideuid)){
        fs.mkdirSync(constants.SOUND_OBJECTS_FOLDER+sideuid);
    }

    this.setStatus("extracting features");
    await this.features.extractFeatures(audioFile, this);//.catch(alert);
    this.setStatus("aggregating and summarizing features");
    const fragments = await this.features.getFragmentsAndSummarizedFeatures(this, audioFile);
    const record = this.createRecord(fragments);
    this.setStatus("splitting audio");
    //const filenames = await this.audio.splitWavFile(audioFile, sideuid, fragments, this);
    const filenames = await this.audio.splitWavFile(audioFile, sideuid, fragments, this);
    console.log(filenames)
    this.setStatus("posting record to api");
    await this.apiService.postRecord(record).catch(alert);
    this.setStatus("uploading to audio store");
    //await this.apiService.scpWavToAudioStore(filenames, this).catch(alert); 
    await this.apiService.scpWavToAudioStore(constants.SOUND_OBJECTS_FOLDER+sideuid, this);//.catch(alert);  
    this.setStatus("done!");
  }

  private createRecord(fragments: Fragment[]): Record {
    return {
      title: this.title,
      composer: this.composer,
      artist: this.artist,
      id: this.recordId,
      label: this.label,
      side: this.side,
      soundObjects: fragments
    }
  }

  private setStatus(status: string) {
    this.status = status;
    this.updateProgress(null, null); //resets progress and updates text
  }

  updateProgress(task: string, progress?: number): void {
    this.progress = progress;
    this.task = task;
    this.updateStatusText();
  }

  private updateStatusText() {
    let progressText = "";
    if (this.progress != null) {
      progressText += " "+Math.round(this.progress*100)+"%";
      progressText += this.task ? " ("+this.task+")" : "";
    }
    this.statusText = this.status+" "+progressText;
  }

}
