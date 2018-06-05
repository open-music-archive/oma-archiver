import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ElectronService } from './services/electron-service';
import { FeatureService } from './services/feature-service';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(private navCtrl: NavController, private electron: ElectronService,
    private features: FeatureService
  ) {}

  pickFile() {
    const pickedFiles = this.electron.pickFile();
    if (pickedFiles) {
      pickedFiles.forEach(f => this.features.extractFeatures(f));
    }
  }

}
