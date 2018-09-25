import { Component } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as log from 'electron-log';
import * as constants from './constants';
import { RecordSide, SoundObject, Cluster } from './types';
import { mapSeries, limitFileName } from './services/util';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';
import { AudioService } from './services/audio-service';
import { ApiService } from './services/api-service';
import { Clusterer } from './services/clusterer';

export interface ProgressObserver {
  updateProgress(task: string, progress?: number): void
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
  private audioFilePath: string;
  private audioFileName: string;
  private imageFilePath: string;
  private imageFileName: string;
  private status: string = "";
  private task: string = "";
  private statusText: string = "";
  private progress: number = 0; //progress in [0,1]

  constructor(
    private electron: ElectronService,
    private features: FeatureService,
    private audio: AudioService,
    private apiService: ApiService
  ) {
    log.transports.file.file = 'archiver.log';
  }

  chooseAudioFile() {
    var newFile = this.electron.chooseAudioFile();
    if (newFile) {
      this.audioFilePath = newFile;
      this.audioFileName = limitFileName(newFile.split("/").pop());
    }
  }

  chooseImageFile() {
    var newFile = this.electron.chooseImageFile();
    if (newFile) {
      this.imageFilePath = newFile;
      this.imageFileName = limitFileName(newFile.split("/").pop());
    }
  }

  async archive() {
    var msg = this.validate();
    if (msg)
    {
      this.electron.displayError(msg);
    }
    else
    {
      this.archiveFile(this.audioFilePath, this.imageFilePath);
    }
  }

  validate(): string {
    var error = "";
    if (!this.title || this.title == "?") error = "Please enter a title.";
    if (!this.audioFilePath) error = "Please select the audio recording.";
    if (!this.composer || !this.artist || !this.recordId || !this.label || !this.side)
      error = "Please fill in all fields, enter ? for missing information.";
    return error;
  }

  private async archiveFile(audioFile: string, imageFile: string) {

    const sideuid = uuidv4();

    if (!fs.existsSync(constants.SOUND_OBJECTS_FOLDER+sideuid)){
        fs.mkdirSync(constants.SOUND_OBJECTS_FOLDER+sideuid);
    }

    this.setStatus("resampling audio");
    const resampledAudio = await this.audio.resampleWavFile(audioFile, 44100, 16, sideuid);

    this.setStatus("converting to flac");
    const flacFile = await this.audio.convertWavToFlac(audioFile, sideuid, false); // false = do not delete wav audio

    this.setStatus("extracting features");
    await this.features.extractFeatures(resampledAudio, this);

    this.setStatus("aggregating and summarizing features");
    var frags = await this.features.getFragmentsAndSummarizedFeatures(this, resampledAudio);
    const objects = _.shuffle(frags);

    this.setStatus("splitting audio");
    const filenames = await this.audio.splitWavFile(resampledAudio, sideuid, objects, this);
    this.updateAudioUris(objects, sideuid, filenames);

    // copy renamed image file to the audio directory if exists
    if (imageFile) {
      fs.copyFileSync(imageFile, constants.SOUND_OBJECTS_FOLDER+sideuid+"/"+sideuid+".jpg");
      this.imageUri = constants.AUDIO_SERVER_PATH+sideuid+"/"+sideuid+".jpg";
    }

    this.setStatus("posting record to api");
    const record = this.createRecord(sideuid, objects);

    //save record json till triple store is reliable
    //fs.writeFileSync(audioFile.replace('.wav','.json'), JSON.stringify(record, null, 2));
    const jsonfile = './json/' + sideuid + '.json';
    fs.writeFileSync(jsonfile, JSON.stringify(record, null, 2));
    await this.apiService.postRecord(record).catch(alert);

    this.setStatus("uploading to audio store");
    await this.apiService.scpWavToAudioStore(constants.SOUND_OBJECTS_FOLDER+sideuid, this).catch(err => this.logError(err));

    this.setStatus("done!");

    // this.reset();

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
      imageUri: this.imageUri,
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

  private clear() {
    if (this.electron.displayQuestion("Are you sure you want to clear everything?") == 0)
    {
      this.reset()
    }
  }

  private reset() {
    Object.getOwnPropertyNames(this).forEach(name => {
      if (typeof(this[name]) === 'string') {
          this[name] = "";
      }
    })
  }

  private async cluster() {
    this.setStatus("clustering sound objects");
    // const ratios = [0.01, 0.05];
    var clusterer = new Clusterer(this.apiService);
    await clusterer.init();
    const opt = (Math.round(Math.sqrt(clusterer.vectors.length)) + 1) / clusterer.vectors.length;
    const ratios = [ opt/4, opt, opt*4 ];
    mapSeries(ratios, async r => {
      this.setStatus("Clustering with " + r);
      const result = clusterer.cluster(r);
      fs.writeFileSync('clusterings/clustering'+r.toFixed(4)+'.json', JSON.stringify(result, null, 2));
      this.apiService.postClustering(result); //.catch(err => this.logError(err));
    });
    this.setStatus("done clustering!");
  }

  private async classify() {
    const sideuid = uuidv4();

    this.setStatus("resampling audio");
    const resampledAudio = await this.audio.resampleWavFile(this.audioFilePath, 44100, 16, sideuid);

    this.setStatus("extracting features");
    await this.features.extractFeatures(resampledAudio, this);

    this.setStatus("aggregating and summarizing features");
    var frags = await this.features.getFragmentsAndSummarizedFeatures(this, resampledAudio);
    const objects = _.shuffle(frags);

    this.setStatus("classifying sound objects");
    var params = { clusteringID: '5b9a9e36a869b0313d0d4c2a', soundObject: objects[0] };
    var cluster = await this.apiService.classifySoundObject(params);
    console.log(cluster);

    // objects.forEach(sound => {
    //   var params = { clusteringID: '5b9a9e36a869b0313d0d4c2a', soundObject: sound };
    //   var cluster = await this.apiService.classifySoundObject(params);
    //   console.log(cluster);
    // })

    this.setStatus("done");
  }

  private logError(error) {
    log.error(error);
  }

}
