import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ElectronProvider } from '../../providers/electron/electron';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController, public electron: ElectronProvider) {}

  zoomIn(){
    this.electron.zoomIn();
  }

  zoomOut(){
    this.electron.zoomOut();
  }

}
