import { Component } from '@angular/core';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';
import { Record } from './types';

export interface ProgressObserver {
  updateProgress(ratio: number, task: string): void
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
  private progress = 0;
  private statusText = "";

  constructor(private electron: ElectronService, private features: FeatureService) {}

  chooseFile() {
    const newFile = this.electron.chooseFile();
    if (newFile) {
      this.chosenFile = newFile;
    }
  }

  async archive() {
    if (this.chosenFile) {
      this.setStatus("extracting features");
      await this.features.extractFeatures(this.chosenFile, this);
      this.setStatus("aggregating and summarizing features");
      const fragments = this.features.getFragmentsAndSummarizedFeatures(this.chosenFile);
      const record: Record = {
        title: this.title,
        composer: this.composer,
        artist: this.artist,
        id: this.recordId,
        label: this.label,
        side: this.side,
        soundObjects: fragments
      }
      console.log(JSON.stringify(record, null, 2))
      this.setStatus("done!");
    }
  }

  private setStatus(status: string) {
    this.status = status;
    this.updateProgress(null, null); //resets progress and updates text
  }

  updateProgress(ratio: number, task: string): void {
    this.progress = ratio;
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
