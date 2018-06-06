import { Component } from '@angular/core';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';

export interface ProgressObserver {
  updateProgress(ratio: number, task: string): void
}

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements ProgressObserver {

  private chosenFile: string;
  private status = "";
  private task = "";
  private progress = 0;

  constructor(private electron: ElectronService, private features: FeatureService) {}

  chooseFile() {
    const newFile = this.electron.chooseFile();
    if (newFile) {
      this.chosenFile = newFile;
    }
  }

  async archive() {
    if (this.chosenFile) {
      this.status = "extracting features";
      await this.features.extractFeatures(this.chosenFile, this);
      this.status = "aggregating and summarizing features";
      const fragments = this.features.getFragmentsAndSummarizedFeatures(this.chosenFile);
      this.status = "done!"
      console.log(fragments);
    }
  }

  updateProgress(ratio: number, task: string): void {
    this.progress = ratio;
    this.task = task;
  }

}
