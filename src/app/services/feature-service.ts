import { Injectable } from '@angular/core';
import * as bb from 'bluebird';
import * as fs from 'fs';
import { exec } from 'child_process';
import { ProgressObserver } from '../home';
//typings don't correspond...
//global.Promise = bb;

const FEATURE_FOLDER = './features/';
const FEATURES = {beats:'vamp:qm-vamp-plugins:qm-barbeattracker:beats', onset:'vamp:qm-vamp-plugins:qm-onsetdetector:onsets', amp:'vamp:vamp-example-plugins:amplitudefollower:amplitude', chroma:'vamp:qm-vamp-plugins:qm-chromagram:chromagram', centroid:'vamp:vamp-example-plugins:spectralcentroid:logcentroid', mfcc:'vamp:qm-vamp-plugins:qm-mfcc:coefficients', melody:'vamp:mtg-melodia:melodia:melody', pitch:'vamp:vamp-aubio:aubiopitch:frequency'};
const FEATURE_SELECTION = [FEATURES.beats, FEATURES.amp, FEATURES.mfcc, FEATURES.chroma];//[FEATURES.onset, FEATURES.amp, FEATURES.pitch, FEATURES.mfcc, FEATURES.chroma];


@Injectable()
export class FeatureService {

  async extractFeatures(path: string, observer: ProgressObserver) {
    return bb.mapSeries(FEATURE_SELECTION, (f,i,l) =>
      this.extractFeature(path, f)
        .then(() => observer.updateProgress(i/l, "extracting "+f))
    ).then(() => observer.updateProgress(1, "extracted features"));
  }

  private async extractFeature(path: string, feature: string): Promise<any> {
    var destination = FEATURE_FOLDER + path.replace('.wav', '_').slice(path.lastIndexOf('/')+1)
      + feature.replace(/:/g, '_') + '.json';
    if (!fs.existsSync(destination)) {
      await this.execute('sonic-annotator -f -d ' + feature + ' "' + path + '" -w jams --jams-force');
      await this.execute('mv "'+path.replace('.wav', '')+'.json" "'+destination+'"');
    }
  }

  private execute(command: string): Promise<any> {
    return new Promise((resolve, reject) =>
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(error, stderr);
          reject();
        } else {
          resolve();
        }
      })
    )
  }

}