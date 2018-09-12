import { Component } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as constants from './constants';
import { RecordSide, SoundObject } from './types';
import { mapSeries, limitFileName } from './services/util';
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
  private imageUri: string;
  private originalImage: string;
  private audioFilePath: string;
  private audioFileName: string = "...";
  private imageFilePath: string;
  private imageFileName: string = "...";
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

  chooseAudioFile() {
    const newFile = this.electron.chooseAudioFile();
    if (newFile) {
      this.audioFilePath = newFile;
      this.audioFileName = limitFileName(newFile.split("/").pop());
    }
  }

  chooseImageFile() {
    const newFile = this.electron.chooseImageFile();
    if (newFile) {
      this.imageFilePath = newFile;
      this.imageFileName = limitFileName(newFile.split("/").pop());
    }
  }

  async archive() {
    if (this.audioFilePath) {
      this.archiveFile(this.audioFilePath, this.imageFilePath);//.catch(alert);
    }
  }

  private async archiveFile(audioFile: string, imageFile: string) {

    const sideuid = uuidv4();

    if (!fs.existsSync(constants.SOUND_OBJECTS_FOLDER+sideuid)){
        fs.mkdirSync(constants.SOUND_OBJECTS_FOLDER+sideuid);
    }

    this.setStatus("resampling audio");
    const resampledAudio = await this.audio.resampleWavFile(audioFile, 44100, 16);

    this.setStatus("converting to flac");
    const flacFile = await this.audio.convertWavToFlac(audioFile, false); // false = do not delete wav audio

    this.setStatus("extracting features");
    await this.features.extractFeatures(resampledAudio, this);//.catch(alert);

    this.setStatus("aggregating and summarizing features");
    var frags = await this.features.getFragmentsAndSummarizedFeatures(this, resampledAudio);
    const objects = _.shuffle(frags);

    this.setStatus("splitting audio");
    const filenames = await this.audio.splitWavFile(resampledAudio, sideuid, objects, this);
    this.updateAudioUris(objects, sideuid, filenames);

    // copy renamed image file to the audio directory
    fs.copyFileSync(imageFile, constants.SOUND_OBJECTS_FOLDER+sideuid+"/"+sideuid+".jpg");

    this.setStatus("posting record to api");
    const record = this.createRecord(sideuid, objects);

    //save record json till triple store is reliable
    fs.writeFileSync(audioFile.replace('.wav','.json'), JSON.stringify(record, null, 2));
    await this.apiService.postRecord(record).catch(alert);

    this.setStatus("uploading to audio store");
    await this.apiService.scpWavToAudioStore(constants.SOUND_OBJECTS_FOLDER+sideuid, this);//.catch(alert);

    // this.setStatus("clustering sound objects");
    // const ratios = [0.01, 0.05];
    // mapSeries(ratios, async r => {
    //   const clustering = await new Clusterer(this.apiService).cluster(r);
    //   //const clustering = JSON.parse(fs.readFileSync('clusterings/clustering'+ratio+'.json', 'utf8'));
    //   fs.writeFileSync('clusterings/clustering'+r+'.json', JSON.stringify(clustering, null, 2));
    //   //return this.apiService.postClustering(clustering).catch(alert);
    // });

    this.setStatus("done!");
  }

  private createRecord(sideuid: string, fragments: SoundObject[]): RecordSide {
    return {
      title: this.title,
      composer: this.composer,
      artist: this.artist,
      catNo: this.recordId,
      label: this.label,
      side: this.side,
      time: new Date(Date.now()).toString(),
      imageUri: constants.AUDIO_SERVER_PATH+sideuid+"/"+sideuid+".jpg",
      originalImage: this.imageFileName,
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
