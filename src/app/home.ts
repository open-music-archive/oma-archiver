import { Component } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import * as fs from 'fs';
import * as constants from './constants';
import { RecordSide, SoundObject } from './types';
import { mapSeries } from './services/util';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';
import { AudioService } from './services/audio-service';
import { ApiService } from './services/api-service';
import { Clusterer } from './services/clusterer';

export interface ProgressObserver {
  updateProgress(task: string, progress?: number): void //progress in [0,1]
}

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

    this.setStatus("resampling audio");
    const resampledAudio = await this.audio.resampleWavFile(audioFile, 44100);

    this.setStatus("converting to flac");
    const flacFile = await this.audio.convertWavToFlac(audioFile, false); // false = do not delete wav audio

    this.setStatus("extracting features");
    await this.features.extractFeatures(resampledAudio, this);//.catch(alert);

    this.setStatus("aggregating and summarizing features");
    const objects = await this.features.getFragmentsAndSummarizedFeatures(this, resampledAudio);

    this.setStatus("splitting audio");
    const filenames = await this.audio.splitWavFile(resampledAudio, sideuid, objects, this);
    this.updateAudioUris(objects, sideuid, filenames);

    this.setStatus("posting record to api");
    const record = this.createRecord(objects);
    //save record json till triple store is reliable
    fs.writeFileSync(flacFile.replace('.flac','.json'), JSON.stringify(record, null, 2));
    //await this.apiService.postRecord(record).catch(alert);

    this.setStatus("uploading to audio store");
    //await this.apiService.scpWavToAudioStore(constants.SOUND_OBJECTS_FOLDER+sideuid, this);//.catch(alert);

    this.setStatus("clustering sound objects");
    const ratios = [0.01, 0.05];
    mapSeries(ratios, async r => {
      const clustering = await new Clusterer(this.apiService).cluster(r);
      //const clustering = JSON.parse(fs.readFileSync('clusterings/clustering'+ratio+'.json', 'utf8'));
      fs.writeFileSync('clusterings/clustering'+r+'.json', JSON.stringify(clustering, null, 2));
      //return this.apiService.postClustering(clustering).catch(alert);
    });

    this.setStatus("done!");
  }

  private createRecord(fragments: SoundObject[]): RecordSide {
    return {
      title: this.title,
      composer: this.composer,
      artist: this.artist,
      catNo: this.recordId,
      label: this.label,
      side: this.side,
      time: new Date(Date.now()).toString(),
      imageUri: null,
      eq: null,
      noEqAudioFile: null,
      soundObjects: fragments
    }
  }

  private updateAudioUris(objects: SoundObject[], sideuid: string, fileuids: string[]) {
    objects.forEach((o,i) =>
      o.audioUri = fileuids[i].replace(constants.SOUND_OBJECTS_FOLDER, constants.AUDIO_SERVER_PATH));
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
